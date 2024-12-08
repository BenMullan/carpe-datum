/*
	File:			* - utilities for browser-automated-processes
	Author:			Ben Mullan (c) 2024
*/

import ChromiumInstanceCollection	from "../chromium/chromium-instance-collection";
import ChromiumInstance				from "../chromium/chromium-instance";

import * as cdWebServer				from "../web-server/cd-web-server";
import * as cdConstants				from "../cd-constants";
import * as cdUtils					from "../cd-utilities";
import * as log						from "../cd-logging";

import ajv_jsonSchema				from "ajv";
import childProcess					from "child_process";
import fsp							from "fs/promises";
import fs							from "fs";
import path							from "path";

export const saveExecutionParameters_andLaunchBapExecutionWorker = async (

	_cdBaseDir				:string,
	_bapName				:string,
	_executionId			:string,
	_executionParameters	:any

) :Promise<void> => {

	ensureExecutionParametersJson_isWellFormed(_executionParameters);

	log.subinfo(`launching bap-execution-worker for execution "${_executionId}" of bap "${_bapName}", using a ${JSON.stringify(_executionParameters["target_browser"])}...`);
	const _bapExecutionWorker_scriptFile = path.join(_cdBaseDir, cdConstants.bapExecutionWorker_scriptFilePath);

	/*
		We've now created an execution-folder & saved the [input-payload.json].
		Next, look at the provided execution-parameters;
			- if target_browser's type is "remote_cdp_browser", and the cdp_endpoint is null,
			  acquire an available carpe-datum browser instance (if there is one).
			- otherwise, leave the execution-parameters as they are.
		
		The execution-parameters look like eg...
			{
				"target_browser" : {
					"type"											: "remote_cdp_browser",
					"cdp_endpoint"									: null,
					"leave_detached_headed_browser_open"			: null
				},
				"run_bap_in_slowmo" : false,
				"cd_api_server" : null
			}
	*/

	let _targetBrowser :ChromiumInstance|null = null;

	try {

		if (_executionParameters["target_browser"]["type"] === cdConstants.executionInitJson_remoteCdpBrowser_value) {
			if (_executionParameters["target_browser"]["cdp_endpoint"] == null) {

				// Even though acquireAvaliableChromiumInstance() will perform the same check,
				// ensure we haven't already hit the max browser-pool size...
				if (ChromiumInstanceCollection.getSingletonInstance().browserPoolMaxSize_hasBeenReached()) {
					throw new Error(`the maximum browser-pool size (${ChromiumInstanceCollection.get_browserPoolMaxSize()}) has already been reached; no more browser instances can be launched`);
				}

				log.debug("acquiring available chromium-instance from browser-pool...");
				_targetBrowser = await ChromiumInstanceCollection.getSingletonInstance().acquireAvaliableChromiumInstance();
				_executionParameters["target_browser"]["cdp_endpoint"] = _targetBrowser.commandeer(_bapName);
				log.debug(`...acquired target browser "${_executionParameters["target_browser"]["cdp_endpoint"]}"`);

			}
		}

		if (_executionParameters["cd_api_server"] == null) {
			// the execution-init-json (request body) didn't specify a cd-api-server; use this server
			_executionParameters["cd_api_server"] = `http://localhost:${cdWebServer.get_cdWebServerConfig().port}`;
		}

		log.subinfo(`saving [execution-parameters.json] for execution "${_executionId}" of bap "${_bapName}"`);
		try {

			await fsp.writeFile(
				path.join(
					_cdBaseDir,
					cdConstants.bapLibraryDir,
					_bapName,
					cdConstants.bapExecutions_foldername,
					_executionId,
					cdConstants.bapExecution_executionParameters_filename
				),
				JSON.stringify(_executionParameters, null, "\t"),
				"utf-8"
			);

		} catch (_fsError) {
			throw new Error(`couldn't save [execution-parameters.json] for execution "${_executionId}" of bap "${_bapName}" because ${(_fsError as Error).stack}`);
		}

		try {

			const _bapExecutionWorker_process = childProcess.spawn(
				"cmd.exe",
				[
					"/c",
					"npx",
					"tsx",
					_bapExecutionWorker_scriptFile,
					`--cd-base-dir=${path.resolve(_cdBaseDir)}`,
					`--bap-name=${_bapName}`,
					`--execution-id=${_executionId}`
				]
			);

			let _bapExecutionWorker_output = "";
			_bapExecutionWorker_process.stdout.on("data", _data => { log.debug(`bap-execution-worker <${_executionId}> stdout:`, _data.toString().trim()); _bapExecutionWorker_output += _data.toString(); });
			_bapExecutionWorker_process.stderr.on("data", _data => { log.debug(`bap-execution-worker <${_executionId}> stderr:`, _data.toString().trim()); _bapExecutionWorker_output += _data.toString(); });

			_bapExecutionWorker_process.on(
				"close",
				async (_exitCode) => {

					if (_targetBrowser != null) { _targetBrowser.relinquish(); }

					// If the exit-code is 0|31|32, then the bap-execution-worker
					// either ran successfully, or it encountered an error but
					// managed to write it to [.execution-error].

					log.subinfo(`...bap-execution-worker <${_executionId}> (pid-${_bapExecutionWorker_process.pid}) exited with code ${_exitCode}`);
					if (! ((_exitCode !== null) && [0, 31, 32].includes(_exitCode)) ) {

						await writeBapExecutionErrorFlagFile(
							_cdBaseDir, _bapName, _executionId,
							new Error(`bap-execution-worker <${_executionId}> exited with error-code ${_exitCode}, outputting:\n${_bapExecutionWorker_output}`)
						);

					}

				}
			);

		} catch (_error) {
			throw new Error(`couldn't save launch bap-execution-worker ("${_bapExecutionWorker_scriptFile}") for execution "${_executionId}" of bap "${_bapName}" because ${(_error as Error).stack}`);
		}

	} catch (_error) {

		// no matter what's gone wrong, attempt to relinquish()
		// the _targetBrowser, if we comandeer()ed one
		log.error(`saveExecutionParameters_andLaunchBapExecutionWorker() error: ${(_error as Error).stack}`);
		if (_targetBrowser != null) { _targetBrowser.relinquish(); }
		
	}

};

export const bapExecutionHasAlreadyBeenRun = async (_cdBaseDir :string, _bapName :string, _executionId :string) :Promise<boolean> => {

	// determine if there's already a [.execution-in-progress] or [.execution-error] or [execution-result.json] or [playwright-trace.zip]

	const _executionDir_dirEnts = await fsp.readdir(path.join(_cdBaseDir, cdConstants.bapLibraryDir, _bapName, cdConstants.bapExecutions_foldername, _executionId), { withFileTypes : true });

	return _executionDir_dirEnts
		.filter(_dirEnt => _dirEnt.isFile())
		.some(
			_dirEnt => [
				cdConstants.bapExecution_executionInProgressFlag_filename,
				cdConstants.bapExecution_executionError_filename,
				cdConstants.bapExecution_executionResult_filename,
				cdConstants.bapExecution_playwrightTraceZip_filename
			].includes(
				_dirEnt.name
			)
		)
	;

};

export const createExecutionInProgressFlagFile = async (_cdBaseDir :string, _bapName :string, _executionId :string) :Promise<void> => {
	try {
		const _fileHandle = await fsp.open(path.join(_cdBaseDir, cdConstants.bapLibraryDir, _bapName, cdConstants.bapExecutions_foldername, _executionId, cdConstants.bapExecution_executionInProgressFlag_filename), "w");
		await _fileHandle.close();
	} catch (_err) {
		throw new Error(`couldn't create execution-in-progress flag-file for ${_bapName} ${_executionId} because: ${(_err as Error).stack}`);
	}
};

export const deleteExecutionInProgressFlagFile = async (_cdBaseDir :string, _bapName :string, _executionId :string) :Promise<void> => {
	try {
		await fsp.unlink(path.join(_cdBaseDir, cdConstants.bapLibraryDir, _bapName, cdConstants.bapExecutions_foldername, _executionId, cdConstants.bapExecution_executionInProgressFlag_filename));
	} catch (_err) {
		throw new Error(`couldn't delete execution-in-progress flag-file for ${_bapName} ${_executionId} because: ${(_err as Error).stack}`);
	}
};

export const waitUpToTwentySeconds_forExecutionInProgressFlagToExist_otherwiseThrowError = async (_cdBaseDir :string, _bapName :string, _executionId :string) :Promise<void> => {
			
	const	_maxTimeToWaitForExistence_ms			= cdConstants.maxTimeToWait_forExecutionInProgressFlagToExist_ms;
	const	_intervalBetweenExistenceChecks_ms		= 200;
	let		_totalTimeSpentWaitingForExistence_ms	= 0;

	while (_totalTimeSpentWaitingForExistence_ms < _maxTimeToWaitForExistence_ms) {

		if (
			fs.existsSync(
				path.join(
					_cdBaseDir, cdConstants.bapLibraryDir,
					_bapName, cdConstants.bapExecutions_foldername,
					_executionId, cdConstants.bapExecution_executionInProgressFlag_filename
				)
			)
		) {

			log.subinfo(`[.execution-in-progress] flag-file for execution "${_executionId}" of bap "${_bapName}" was found to exist, after ${_totalTimeSpentWaitingForExistence_ms}ms`);
			return;

		}

		await cdUtils.sleep(_intervalBetweenExistenceChecks_ms);
		_totalTimeSpentWaitingForExistence_ms += _intervalBetweenExistenceChecks_ms;

	}

	// Just before throwing the error, attempt to read the [.execution-error] flag if it exists...
	let _executionErrorFile_text :string|null = null;

	try {

		const _executionErrorFile_path = path.join(
			_cdBaseDir, cdConstants.bapLibraryDir,
			_bapName, cdConstants.bapExecutions_foldername,
			_executionId, cdConstants.bapExecution_executionError_filename
		);

		await fsp.access(_executionErrorFile_path);
		_executionErrorFile_text = await fsp.readFile(_executionErrorFile_path, "utf-8");

	} catch {}

	throw new Error(`the bap-execution-worker may have failed to start; an [.execution-in-progress] flag-file for execution "${_executionId}" of bap "${_bapName}" didn't exist, after waiting ${_totalTimeSpentWaitingForExistence_ms}ms.${_executionErrorFile_text == null ? "" : `The [.execution-error] reads: ${_executionErrorFile_text}`}`);

};

export const writeBapExecutionErrorFlagFile = async (_cdBaseDir :string, _bapName :string, _executionId :string, _error :Error) :Promise<void> => {
	try {
		
		await fsp.writeFile(
			path.join(_cdBaseDir, cdConstants.bapLibraryDir, _bapName, cdConstants.bapExecutions_foldername, _executionId, cdConstants.bapExecution_executionError_filename),
			`${(new Date()).toLocaleString()}:\n${_error.stack ?? _error.message}\n\n`,
			{ flag : "a" }
		);

	} catch (_err) {
		throw new Error(`couldn't create execution-error flag-file for ${_bapName} ${_executionId} because: ${(_err as Error).stack}`);
	}
};

export const ensureInputData_satisfiesBapSchema = async (_cdBaseDir :string, _bapName :string, _inputDataJson :any) :Promise<void> => {

	log.subinfo(`reading ${_bapName}'s [process-data.schema.json]`);
	const _bap_processDataSchema_json :any = JSON.parse(await fsp.readFile( path.join(_cdBaseDir, cdConstants.bapLibraryDir, _bapName, cdConstants.bapProcessDataSchema_filename), "utf-8" ));
	const _bapSchema_validator = (new ajv_jsonSchema()).compile(_bap_processDataSchema_json[cdConstants.bapProcessDataSchema_inputSchema_key]);

	if (!_bapSchema_validator(_inputDataJson)) {
		throw new Error(`the execution's [input-payload.json] didn't satisfy the bap's [process-data.schema.json];\n${_bapSchema_validator.errors}`);
	}

};

export const ensureExecutionParametersJson_isWellFormed = (_executionParametersJson :any) :void => {

	const _schemaValidator = (new ajv_jsonSchema()).compile(cdConstants.executionParametersJson_schema);

	if (!_schemaValidator(_executionParametersJson)) {
		throw new Error(`the execution's [execution-parameters.json] isn't valid;\n${JSON.stringify(_schemaValidator.errors)}\n\ninput-json: ${JSON.stringify(_executionParametersJson)}`);
	}

};

export const ensureExecutionInitJson_isWellFormed = (_executionInitJson :any) :void => {

	const _schemaValidator = (new ajv_jsonSchema()).compile(cdConstants.executionInitJson_schema);

	if (!_schemaValidator(_executionInitJson)) {
		throw new Error(`the execution-init-json isn't valid;\n${JSON.stringify(_schemaValidator.errors)}\n\ninput-json: ${JSON.stringify(_executionInitJson)}`);
	}

};

export const ensureExecutionStageUpdateJson_isWellFormed = (_executionStageUpdateJson :any) :void => {

	const _schemaValidator = (new ajv_jsonSchema()).compile(cdConstants.executionStageUpdateJson_schema);

	if (!_schemaValidator(_executionStageUpdateJson)) {
		throw new Error(`the execution-stage-update-json isn't valid;\n${JSON.stringify(_schemaValidator.errors)}\n\ninput-json: ${JSON.stringify(_executionStageUpdateJson)}`);
	}

};