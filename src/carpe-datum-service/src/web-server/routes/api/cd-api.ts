/*
	File:		* - carpe-datum application-programming-interface endpoints' functions
	Author:		Ben Mullan (c) 2024
*/

import ChromiumInstanceCollection	from "../../../chromium/chromium-instance-collection";
import * as bapUtils				from "../../../bap-execution/bap-utilities";
import * as cdConstants				from "../../../cd-constants";
import * as cdUtils					from "../../../cd-utilities";
import * as log						from "../../../cd-logging";
import * as cdApiTypes				from "./cd-api-types";

import childProcess					from "child_process";
import playwright					from "playwright";
import express						from "express";
import fsp							from "fs/promises";
import path							from "path";
import fs							from "fs";

export const getApiServiceInfo = () => (
	{
		service		: "carpe-datum headless-browser-automation server API",
		version		: cdConstants.carpeDatumVersion,
		uptime		: `${process.uptime()}s`
	}
);

export const getBapByName = async (_cdBaseDir :string, _bapName :string) :Promise<cdApiTypes.Bap> => (
	{
		name							: _bapName,
		bap_folder_created_timestamp	: (await fsp.stat(path.join(_cdBaseDir, cdConstants.bapLibraryDir, _bapName))).birthtimeMs,
		executions						: (await getBapExecutionsArray(_cdBaseDir, _bapName))
	}
);

export const getBapsArray = async (_cdBaseDir :string) :Promise<cdApiTypes.Bap[]> => {
	
	const _bapLibraryDirs = await fsp.readdir(
		path.join(_cdBaseDir, cdConstants.bapLibraryDir),
		{ withFileTypes : true }
	);

	return Promise.all(
		_bapLibraryDirs
		.filter(_dirEnt => !["node_modules"].includes(_dirEnt.name))
		.filter(_dirEnt => _dirEnt.isDirectory())
		.map(async (_dirEnt) => await getBapByName(_cdBaseDir, _dirEnt.name))
	);

};

export const getBapExecutionById = async (_cdBaseDir :string, _bapName :string, _executionId :string) :Promise<cdApiTypes.BapExecution> => {
	
	const _executionFolder = path.join(_cdBaseDir, cdConstants.bapLibraryDir, _bapName, cdConstants.bapExecutions_foldername, _executionId);
	
	return {
		execution_id : _executionId,
		execution_folder_created_timestamp : (await fsp.stat(_executionFolder)).birthtimeMs,
		status : (
			fs.existsSync(path.join(_executionFolder, cdConstants.bapExecution_executionInProgressFlag_filename))
			? "running"
			: "dormant"
		),
		execution_error : (
			fs.existsSync(path.join(_executionFolder, cdConstants.bapExecution_executionError_filename))
			? await fsp.readFile(path.join(_executionFolder, cdConstants.bapExecution_executionError_filename), "utf-8")
			: null
		),
		execution_result : (
			fs.existsSync(path.join(_executionFolder, cdConstants.bapExecution_executionResult_filename))
			? JSON.parse(await fsp.readFile(path.join(_executionFolder, cdConstants.bapExecution_executionResult_filename), "utf-8"))
			: null
		)
	};

};

export const getBapExecutionsArray = async (_cdBaseDir :string, _bapName :string) :Promise<cdApiTypes.BapExecution[]> => {
	
	const _bapExecutionsDirs = await fsp.readdir(
		path.join(_cdBaseDir, cdConstants.bapLibraryDir, _bapName, cdConstants.bapExecutions_foldername),
		{ withFileTypes : true }
	);
	
	return Promise.all(
		_bapExecutionsDirs
		.filter(_dirEnt => _dirEnt.isDirectory())
		.map(async (_dirEnt) => await getBapExecutionById(_cdBaseDir, _bapName, _dirEnt.name))
	);

};

export const createAndStartNewBapExecution = async (_cdBaseDir :string, _bapName :string, _executionInitJson :any) :Promise<cdApiTypes.BapExecution> => {
	
	/*
		- request made to /api/baps/:bapName/executions/*start-new
			with execution-init-json in body

			- the api endpoint should then...
				- create a new execution-id & eponymous execution-folder
				- validate the input-payload json against the [process-data.schema.json]
				- save the [input-payload.json] in the execution-folder
				- get an carpe-datum available browser cdp-endpoint

				- instanciate the bap-execution-worker script, like...
					bap-execution-worker --cd-base-dir="..." --bap-name="google-search-demo" --execution-id="67f36fb23c9e" --target-browser-cdp-endpoint="http://localhost:9294"
					...capturing the stdout/stderr in Buffer chunks

				- respond with a BapExecution object (execution-id, status, ...)

				- when the bap-execution-worker script finishes...
					- relinquish() the chromium-instance
					- if the exit-code is 0|1|2, that's fine.
					- if the exit-code is anything else, create [.execution-error] in the execution-folder, logging the stdout/stderr
		
		example execution-init-json...
			{
				"input_payload" : {
					"input_data" : {
						"username"		: "somat",
						"password"		: "else",
						"claim_ref"		: "ABC123"
					}
				},
				"execution_parameters"	: {
					"target_browser"	: {
						"type"			: "remote_cdp_browser",
						"cdp_endpoint"	: null
					}
				}
			}
	*/

	log.subinfo(`creating & launching new execution for bap "${_bapName}"...`);
	console.debug("createAndStartNewBapExecution() :: received this _executionInitJson", _executionInitJson);
	
	log.subinfo("ensuring request's execution-init-json is well-formed");
	bapUtils.ensureExecutionInitJson_isWellFormed(_executionInitJson);

	log.subinfo("ensuring request's input-payload json satisfies bap's [process-data.schema.json]");
	await bapUtils.ensureInputData_satisfiesBapSchema(
		_cdBaseDir, _bapName,
		_executionInitJson[cdConstants.executionInitJson_inputPayload_key][cdConstants.bapExecution_inputData_key]
	);

	const _executionId = cdUtils.getRandomMiniHash();
	const _executionFolder = path.join(_cdBaseDir, cdConstants.bapLibraryDir, _bapName, cdConstants.bapExecutions_foldername, _executionId);
	log.subinfo(`creating execution-folder "${_executionFolder}"`);
	try { await fsp.mkdir(_executionFolder); } catch (_fsError) { throw new Error(`couldn't create execution-folder "${_executionFolder}" because ${(_fsError as Error).stack}`); }

	log.subinfo(`saving [input-payload.json] for execution "${_executionId}" of bap "${_bapName}"`);
	try {

		await fsp.writeFile(
			path.join(
				_cdBaseDir,
				cdConstants.bapLibraryDir,
				_bapName,
				cdConstants.bapExecutions_foldername,
				_executionId,
				cdConstants.bapExecution_inputPayload_filename
			),
			JSON.stringify(_executionInitJson[cdConstants.executionInitJson_inputPayload_key], null, "\t"),
			"utf-8"
		);

	} catch (_fsError) {
		throw new Error(`couldn't save [input-payload.json] for execution "${_executionId}" of bap "${_bapName}" because ${(_fsError as Error).stack}`);
	}

	/*
		At this point, the execution-folder still isn't fully-formed; it's
		missing [execution-parameters.json], which wil be created by
		saveExecutionParameters_andLaunchBapExecutionWorker().
	*/

	log.debug("launching bap-execution-worker...");
	await bapUtils.saveExecutionParameters_andLaunchBapExecutionWorker(_cdBaseDir, _bapName, _executionId, _executionInitJson["execution_parameters"]);
	await bapUtils.waitUpToTwentySeconds_forExecutionInProgressFlagToExist_otherwiseThrowError(_cdBaseDir, _bapName, _executionId);

	log.subinfo(`...responding with execution "${_executionId}" launched for bap "${_bapName}"`);
	return getBapExecutionById(_cdBaseDir, _bapName, _executionId);

};

export const waitForBapExecutionToExit = async (_cdBaseDir :string, _bapName :string, _executionId :string) :Promise<cdApiTypes.LongPollingResponse<cdApiTypes.BapExecution>> => {

	/*
		look in the execution-folder
			- if there's a [.execution-error], respond immediately
			- if there's a [.execution-in-progress], wait for this to disappear...
			- if there's a [execution-result.json] (and by this point no [.execution-in-progress]), respond immediately
		
		whilst waiting around, wait for a maximum of (2 mins), before responding with a timeout
	*/

	const _executionFolder					= path.join(_cdBaseDir, cdConstants.bapLibraryDir, _bapName, cdConstants.bapExecutions_foldername, _executionId);
	const _executionError_fileExists		= () => fs.existsSync(path.join(_executionFolder, cdConstants.bapExecution_executionError_filename));
	const _executionResult_fileExists		= () => fs.existsSync(path.join(_executionFolder, cdConstants.bapExecution_executionResult_filename));
	const _executionInProgress_fileExists	= () => fs.existsSync(path.join(_executionFolder, cdConstants.bapExecution_executionInProgressFlag_filename));

	const _requestMustEndBy_timestamp = (new Date()).getTime() + cdConstants.maxLongPollingRequestLifetime_ms;

	while ((new Date()).getTime() < _requestMustEndBy_timestamp) {

		if (_executionError_fileExists() || (_executionResult_fileExists() && !_executionInProgress_fileExists())) {
		
			return {
				request_timed_out	: false,
				response_data		: await getBapExecutionById(_cdBaseDir, _bapName, _executionId)
			};

		}

		await cdUtils.sleep(cdConstants.intervalBetweenLongPollingChecks_ms);

	}

	return { request_timed_out : true };

};

export const getBrowserPoolState = async () :Promise<cdApiTypes.BrowserPoolBrowser[]> => {
	
	const _crInstancesList = await ChromiumInstanceCollection.getSingletonInstance().getChromiumInstancesList();
	
	return _crInstancesList.map(
		_crInstance => (
			{
				process_pid				: _crInstance.processPid,
				user_data_dir			: path.basename(_crInstance.userDataDir_fullPath),
				remote_debugging_port	: _crInstance.remoteDebuggingPort,
				current_executee		: (
					_crInstance.currentExecutee
					? { bap_name : _crInstance.currentExecutee.bapName, current_execution_stage : _crInstance.currentExecutee.currentExecutionStage }
					: null
				)
			}
		)
	);

};

export const getIndividualBrowserState = async (_cdpPort :number) :Promise<cdApiTypes.BrowserPoolBrowser> => {
	
	const _browserPoolBrowser = (await getBrowserPoolState()).filter(_browserPoolBrowser => _browserPoolBrowser["remote_debugging_port"] === _cdpPort).at(0);
	if (_browserPoolBrowser == undefined) { throw new Error(`no browser exists in the browser-pool with cdp-port ${_cdpPort}`); }

	return _browserPoolBrowser;

};

export const setIndividualBrowser_executionStageMessage = async (_cdpPort :number, _executionStageUpdateJson :any) :Promise<cdApiTypes.BrowserPoolBrowser> => {
	
	/*
		`_executionStageUpdateJson` looks like...
			{
				"stage_message" : "[stage 14 of *] click button x"
			}
	*/

	log.verbose("setIndividualBrowser_executionStageMessage() :: _executionStageUpdateJson:", _executionStageUpdateJson);
	bapUtils.ensureExecutionStageUpdateJson_isWellFormed(_executionStageUpdateJson);
	const _stageMessage = _executionStageUpdateJson["stage_message"];

	await ChromiumInstanceCollection.getSingletonInstance().updateBrowserExecuteeStatus(_cdpPort, _stageMessage);
	return await getIndividualBrowserState(_cdpPort);

};

// returns a base-64 png string
export const getScreenshot_ofTopmostBrowserPage = async (_cdpPort :number) :Promise<string> => {

	// assert that there exists a browser with that cdp-port
	await getIndividualBrowserState(_cdpPort);

	const _browser = await playwright.chromium.connectOverCDP(`http://localhost:${_cdpPort}`);

	const _browserContext = _browser.contexts().at(0);
	if (!_browserContext) { throw new Error(`no open browser-context is present for browser <${_cdpPort}>`); }

	const _topmostPage = _browserContext.pages().at(-1);
	if (!_topmostPage) { throw new Error(`no open browser-pages are present in the first browser-context of browser <${_cdpPort}>`); }

	return (await _topmostPage.screenshot()).toString("base64");

};

export const launchPlaywrightCodegen = (_httpRequest :express.Request) => {
	
	log.info("launching playwright codegen");

	if (!["localhost", "127.0.0.1"].includes(_httpRequest.hostname)) {
		throw new Error(`playwright-codegen, for recording a new bap, can only be launched on localhost (but the request came from ${_httpRequest.hostname})`);
	}

	const _codegenProc = childProcess.spawn(
		"cmd.exe",
		[
			"/c",				"npx",
			"playwright",		"codegen",
			"--target",			"playwright-test",
			"--browser",		"chromium",
			// "--color-scheme",	"light",
			// "--lang",			"en-GB",
			// "--viewport-size",	cdConstants.chromiumWindowSize,
			// "--ignore-https-errors",
			"about:blank"
		],
		{ detached : true, cwd : "/" }
	);

	_codegenProc.unref();

	return { launched : true, pid : _codegenProc.pid };

};