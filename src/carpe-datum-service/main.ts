/*
	File:			main.ts - entrypoint for carpe-datum-service; hosts headless-browsers' pool, + API and front-end
	Interpret:		[eg] npx tsx main.ts --port=8192 --browser-pool-initial-size=2 --browser-pool-max-size=6
	Author:			Ben Mullan (c) 2024
*/

import ChromiumInstanceCollection	from "./src/chromium/chromium-instance-collection";
import * as cdWebServer				from "./src/web-server/cd-web-server";
import * as parseCLAs				from "./src/parse-clas";
import * as log						from "./src/cd-logging";
import esMain						from "es-main";
import path							from "path";

/*

	carpe-datum service :: entrypoint
	^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

	- expecting CLAs like eg...
		--cd-base-dir="../../cd-base/" --browser-pool-initial-size=2 --browser-pool-max-size=6 --port=8192
		--launch-browsers-as-headed
		--browser-pool-initial-size=1
	
	- parse the command-line arguments
	- instanciate the browser pool
	- start listening on the API endpoints

	exit-codes
	----------
		(starting from 30 because 1 to 12 are predefined by node)
		0	→ exited cleanly & without any runtime errors
		31	→ a carpe-datum error occured (eg invalid CLAs or file-permissions' error)
	
*/

const main = async () => {

	try {

		log.info("parsing command-line arguments");
		const _clas								:parseCLAs.ParsedCLAs	= await parseCLAs.parseCarpeDatumServiceCLAs(process.argv);
		const _port								:number					= _clas["port"];
		const _enableVerboseLogging				:boolean				= _clas["verbose"];
		const _cdBaseDir						:string					= path.resolve(_clas["cd-base-dir"]);
		const _browserPool_maxSize				:number					= _clas["browser-pool-max-size"];
		const _browserPool_initialSize			:number					= _clas["browser-pool-initial-size"];

		log.set_outputVerboseLogMessages(_enableVerboseLogging);

		log.info("launching chromium instances");
		ChromiumInstanceCollection.setSingletonConfiguration({ _browserPool_maxSize, _cdBaseDir });
		await ChromiumInstanceCollection.getSingletonInstance().launchNewChromiumInstances(_browserPool_initialSize);

		cdWebServer.startWebServer(_cdBaseDir, _port);

	} catch (_cdRuntimeError) {

		const _error = _cdRuntimeError as Error;
		log.error(`exiting; the carpe-datum service encountered this runtime error:\n${_error.stack ?? _error.message}`);
		process.exit(31);

	}

};

if (esMain(import.meta)) { await main(); }