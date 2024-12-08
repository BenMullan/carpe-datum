/*
	File:			* - runs an browser-automated-process using the specified bap-name and execution-id (whence an input-data-payload)
	Author:			Ben Mullan (c) 2024
*/

import bapExecuteeResources	from "./bap-executee-resources";
import * as pwResources		from "./playwright-constants";
import * as bapUtils		from "./bap-utilities";
import * as cdConstants		from "../cd-constants";
import * as log				from "../cd-logging";

import playwright			from "playwright";
import path					from "path";
import fsp					from "fs/promises";
import url					from "url";

export const runBapExecution = async (

	_cdBaseDir		:string,
	_bapName		:string,
	_executionId	:string

) : Promise<{ executionResult :cdConstants.BapExecutionResult, keepProcessAlive_toLeaveBrowserOpen :boolean }> => {

	/*
		- inside the browser-automated-process dir, there should be...
			→ playwright-script.mjs
			→ process-data.schema.json
			→ executions/{_executionId}/
				→ input-payload.json
				→ execution-parameters.json
				→ execution-result.json (not yet)
				→ .execution-in-progress

		- **TODO: ensure the bap-dir contains contains these (↑) files as expected
		- ensure [input-payload.json] satisfies the `input_data_schema` in [process-data.schema.json]

		- **TODO: parse an AST of the [playwright-script.mjs]
			- ensure it exports a default async function, accepting parameters `_browserContext` and `_inputData`
		
		- read-in the bap/execution files (playwright-script.mjs, input-payload.json, ...)
		- connectOverCDP() to the target browser, or launch a detached headed one
		- create a new playwright browser-context
		
		- execute [playwright-script.mjs]'s exported function, providing the browser-content & input-data as arguments
		- save the execution-time, exit-reason, & outputData to [execution-result.json]
		- close() the playwright browser-context
	*/
	
	const _bapFolder = path.join(_cdBaseDir, cdConstants.bapLibraryDir, _bapName);
	const _executionFolder = path.join(_bapFolder, cdConstants.bapExecutions_foldername, _executionId);

	log.subinfo("importing bap's [playwright-script.mjs]");
	const { default : _playwrightScript_function } = await import(url.pathToFileURL(path.join(_cdBaseDir, cdConstants.bapLibraryDir, _bapName, cdConstants.bapPlaywrightScript_filename)).href);
	
	log.subinfo("reading bap-execution's [input-payload.json]");
	const _bap_inputPayload_json :any = JSON.parse(
		await fsp.readFile(
			path.join(_executionFolder, cdConstants.bapExecution_inputPayload_filename),
			"utf-8"
		)
	);

	log.debug("→ bap input-payload =", _bap_inputPayload_json);

	log.subinfo("ensuring [input-payload.json] satisfies bap's [process-data.schema.json]");
	await bapUtils.ensureInputData_satisfiesBapSchema(
		_cdBaseDir, _bapName,
		_bap_inputPayload_json[cdConstants.bapExecution_inputData_key]
	);

	log.subinfo("reading bap-execution's [execution-parameters.json]");
	const _bap_executionParameters_json :any = JSON.parse(
		await fsp.readFile(
			path.join(_executionFolder, cdConstants.bapExecution_executionParameters_filename),
			"utf-8"
		)
	);

	log.debug("→ bap execution-paramters =", _bap_executionParameters_json);
	
	log.subinfo("ensuring [execution-parameters.json] is well-formed");
	bapUtils.ensureExecutionParametersJson_isWellFormed(_bap_executionParameters_json);

	if (
		(_bap_executionParameters_json["target_browser"]["type"] === cdConstants.executionInitJson_remoteCdpBrowser_value)
		&& (_bap_executionParameters_json["target_browser"]["cdp_endpoint"] == null)
	) {
		throw new Error(`the execution-parameters' target_browser's cdp_endpoint is null; execution-parameters: ${JSON.stringify(_bap_executionParameters_json)}`);
	}
	
	/*
		Now that all BAP input files & data have been validated,
		determine what the execution-parameters tell us to to...
			- use a remote browser, or launch() our own?
			- prompt before closing an own browser?
			- run the bap in slow-mo?
	*/
	
	let _browser :playwright.Browser;
	const _browserConfig = { slowMo : (_bap_executionParameters_json["run_bap_in_slowmo"] ? pwResources.browserSlowMoMode_msDelay : 0) };
	
	if (_bap_executionParameters_json["target_browser"]["type"] === cdConstants.executionInitJson_detachedHeadedBrowser_value) {

		const _browserExePath = path.join(_cdBaseDir, cdConstants.chromiumBinariesDir, cdConstants.chromiumExeName);
		log.subinfo(`launching headed chromium browser from "${_browserExePath}"...`);
		_browser = await playwright.chromium.launch({ ..._browserConfig, executablePath : _browserExePath, headless : false });

	} else {

		log.subinfo(`connecting to browser cdp-endpoint "${_bap_executionParameters_json["target_browser"]["cdp_endpoint"]}"...`);
		_browser = await playwright.chromium.connectOverCDP(_bap_executionParameters_json["target_browser"]["cdp_endpoint"], _browserConfig);
		
	}
	
	const _browserContext :playwright.BrowserContext = await _browser.newContext(pwResources.default_browserContextParameters);
	
	log.subinfo("starting playwright trace...");
	await _browserContext.tracing.start(
		{
			screenshots	: true,
			snapshots	: true,
			sources		: true,
			title		: `${_bapName}-${_executionId}`
		}
	);

	/*
		We've read-in the two input files.
		Next, execute the playwright-script.
	*/
	
	const _bapExecutionResult :cdConstants.BapExecutionResult = await executePlaywrightScript(
		_cdBaseDir, _bapName, _executionId, _browserContext,
		_playwrightScript_function,	_bap_inputPayload_json
	);

	log.subinfo("...stopping & saving playwright trace");
	await _browserContext.tracing.stop(
		{ path : path.join(_executionFolder, cdConstants.bapExecution_playwrightTraceZip_filename) }
	);

	/*
		If we've launched our own headed-browser in this process,
		then close() it, optionally prompting beforehand.

		If we've been told to leave the remote browser open, we can't exit
		from this process; somehow this causes the browser-context to close.
		Therefore, hang around here forever (until the cd-service closes).

		Possible permutations:
			- remote-cdp-browser
				- close browser-context; close browser;
				
			- own-headed-browser
				- ...with	 _promptBeforeClosingOwnHeadedBrowser: prompt; close browser-context; close browser;
				- ...without _promptBeforeClosingOwnHeadedBrowser: close browser-context; close browser;
	*/

	if (_bap_executionParameters_json["target_browser"]["type"] === cdConstants.executionInitJson_detachedHeadedBrowser_value) {
		
		if (_bap_executionParameters_json["target_browser"]["leave_detached_headed_browser_open"]) { return { executionResult : _bapExecutionResult, keepProcessAlive_toLeaveBrowserOpen : true }; }
		
		log.subinfo("...closing playwright browser-context");
		await _browserContext.close();
		
		log.subinfo("...closing own headed browser");
		await _browser.close();
	
	}
	
	return { executionResult : _bapExecutionResult, keepProcessAlive_toLeaveBrowserOpen : false };

};

// executes [playwright-script.mjs], saving the result to [execution-result.json]
const executePlaywrightScript = async (

	_cdBaseDir					:string,
	_bapName					:string,
	_executionId				:string,
	_browserContext				:playwright.BrowserContext,
	_playwrightScript_function	:any,
	_bap_inputPayload_json		:any

) :Promise<cdConstants.BapExecutionResult> => {

	/*
		Execute the playwright-script's exported default async function,
		with the already-instanciated playwright browser. Write the resultant
		`output_data` back into the [execution-result.json], alongside the
		execution-duration, -finished-timestamp, -exit-reason, & -error-message.
	*/

	const _executionStarted_timestamp	:number = (new Date()).getTime();
	let _executionFinished_timestamp	:number;
	let _executionExitReason			:cdConstants.BapExecutionExitReason;
	let _executionErrorMessage			:string|null = null;

	let _playwrightScript_returnValue	:cdConstants.BapPlaywrightScriptReturnValue|undefined;
	
	try {

		log.subinfo("executing bap's playwright-script...");
		_playwrightScript_returnValue = await _playwrightScript_function(
			{
				_cdExecuteeResources	: new bapExecuteeResources(_cdBaseDir, _bapName, _executionId),
				_browserContext			: _browserContext,
				_inputData				: _bap_inputPayload_json[cdConstants.bapExecution_inputData_key]
			}
		);

		_executionExitReason = cdConstants.BapExecutionExitReason.ran_successfully;

	} catch (_playwrightScript_executionError) {

		_executionExitReason = cdConstants.BapExecutionExitReason.playwright_error;

		const _error = _playwrightScript_executionError as Error;
		_executionErrorMessage = _error.stack ?? _error.message;
		log.error(`the bap's playwright-script exited prematurely & threw this error:\n${_error.stack ?? _error.message}`);

	}

	/*
		We've now executed (successfully or not) the BAP's playwright-script.
		Store & save how long this took, + why it exited, + the `output_data`
		in the execution's [execution-result.json] file.
	*/

	_executionFinished_timestamp = (new Date()).getTime();
	log.subinfo(`...bap playwright-script executed in ${(_executionFinished_timestamp - _executionStarted_timestamp) / 1000}s`);

	const _bapExecutionResult :cdConstants.BapExecutionResult = {
		execution_duration_ms			: (_executionFinished_timestamp - _executionStarted_timestamp),
		execution_finished_timestamp	: _executionFinished_timestamp,
		execution_exit_reason			: _executionExitReason,
		execution_error_message			: _executionErrorMessage,
		output_data						: _playwrightScript_returnValue?.output_data
	};

	log.debug("→ bap execution-result =", _bapExecutionResult);
	log.subinfo("writing bap execution-result to [execution-result.json]...");

	const _bapFolder = path.join(_cdBaseDir, cdConstants.bapLibraryDir, _bapName);
	const _executionFolder = path.join(_bapFolder, cdConstants.bapExecutions_foldername, _executionId);

	await fsp.writeFile(
		path.join(_executionFolder, cdConstants.bapExecution_executionResult_filename),
		JSON.stringify(_bapExecutionResult, null, "\t"),
		"utf-8"
	);

	return _bapExecutionResult;

};