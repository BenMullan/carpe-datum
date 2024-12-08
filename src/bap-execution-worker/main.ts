/*
	File:			main.ts - entrypoint for bap-execution-worker; executes the specified bap (browser-automated-process) for the specified execition (whence an input-data-payload), on the specified target browser
	Interpret:		[eg] npx tsx main.ts --bap-name="google-search-demo" --execution-id="c8bb6fb23c0f" --target-browser-cdp-endpoint="http://localhost:12469"
	Author:			Ben Mullan (c) 2024
*/

import * as bapExecution	from "../carpe-datum-service/src/bap-execution/bap-execution";
import * as bapUtils		from "../carpe-datum-service/src/bap-execution/bap-utilities";
import * as cdConstants		from "../carpe-datum-service/src/cd-constants";
import * as cdUtils			from "../carpe-datum-service/src/cd-utilities";
import * as log				from "../carpe-datum-service/src/cd-logging";
import parseCLAs			from "./src/parse-clas";
import esMain				from "es-main";
import path					from "path";

/*
	Expecting CLAs like...
		--cd-base-dir="..." --bap-name="google-search-demo" --execution-id="6f2171cee36e"
		--bap-name="google-search-demo" --execution-id="6f2171cee36e"

	When launched, this bap-execution-worker should...
		- ensure there isn't already a [.execution-in-progress] or [execution-result.json]
		- create [.execution-in-progress] in the execution-folder
		- read-in the bap/execution files
		- connectOverCDP() to the target browser
		- close all current browser pages
		- execute [playwright-script.mjs]
		- write the result to [execution-result.json]
		- delete [.execution-in-progress]
		- return exit-code 0
	
	exit-codes
	----------
		(starting from 30 because 1 to 12 are predefined by node)
		0	→ exited cleanly & without any runtime errors
		31	→ a carpe-datum error occured (eg invalid CLAs or file-permissions' error)
		32	→ an error occured in the hosted bap's [playwright-script.mjs]
		33	→ the error couldn't be written to [.execution-error]
*/

const main = async () :Promise<number> => {

	let _runtimeError :Error|null = null;
	let _keepProcessAlive :boolean = false;
	let _writeBapExecutionErrorFlagFile = async (_error :Error) => {};
	let _deleteExecutionInProgressFlagFile = async () => {};

	try {

		log.info("parsing command-line arguments");
		const _clas						:any		= await parseCLAs(process.argv);
		const _cdBaseDir				:string		= path.resolve(_clas["cd-base-dir"]);
		const _bapName					:string		= _clas["bap-name"];
		const _executionId				:string		= _clas["execution-id"];
		const _enableVerboseLogging		:boolean	= _clas["verbose"];
		
		log.set_outputVerboseLogMessages(_enableVerboseLogging);

		_writeBapExecutionErrorFlagFile = async (_error :Error) => await bapUtils.writeBapExecutionErrorFlagFile(_cdBaseDir, _bapName, _executionId, _error);
		log.info("ensuring bap-execution hasn't already been run");
		if (await bapUtils.bapExecutionHasAlreadyBeenRun(_cdBaseDir, _bapName, _executionId)) { throw new Error(`Execution "${_executionId}" has already been run for BAP "${_bapName}"\n`); }
		
		log.info("creating [.execution-in-progress] flag file");
		await bapUtils.createExecutionInProgressFlagFile(_cdBaseDir, _bapName, _executionId);
		_deleteExecutionInProgressFlagFile = async () => await bapUtils.deleteExecutionInProgressFlagFile(_cdBaseDir, _bapName, _executionId);

		log.info("running bap-execution...");
		const { executionResult : _bapExecutionResult, keepProcessAlive_toLeaveBrowserOpen : __keepProcessAlive } = await bapExecution.runBapExecution(_cdBaseDir, _bapName, _executionId);
		_keepProcessAlive = __keepProcessAlive;

		if (_bapExecutionResult["execution_exit_reason"] !== cdConstants.BapExecutionExitReason.ran_successfully) {
			log.error("writing playwright-script-error to [.execution-error]");
			await _writeBapExecutionErrorFlagFile(new Error(_bapExecutionResult["execution_error_message"] ?? "undefined playwright-script error"));
		}

		log.info(`→ exiting; successfully closed playwright browser-context & saved [execution-result.json]`);
		return ((_bapExecutionResult["execution_exit_reason"] !== cdConstants.BapExecutionExitReason.ran_successfully) ? 32 : 0);

	} catch (_error) {

		_runtimeError = _error as Error;
		log.error(`exiting; the bap-execution-worker encountered this runtime or javascript-syntax error:\n${_runtimeError.stack ?? _runtimeError.message}`);
		return (31);

	} finally {

		try {
			
			log.info("deleting [.execution-in-progress] flag file");
			await _deleteExecutionInProgressFlagFile();
			
			if (_runtimeError) {
				log.error("writing runtime-error to [.execution-error]");
				await _writeBapExecutionErrorFlagFile(_runtimeError);
			}

			if (_keepProcessAlive) {
				log.info("bap-execution-worker entering indefinate dormant state, to keep browser open");
				while (true) { await cdUtils.sleep(1000); }
			}

		} catch (_metaError) {

			console.error(`couldn't write runtime-error to [.execution-error]; ${(_metaError as Error).stack}`);
			return (33);

		}

	}

};

if (esMain(import.meta)) { process.exit(await main()); }