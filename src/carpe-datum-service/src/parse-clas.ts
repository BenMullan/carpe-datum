/*
	File:		* - parses command-line arguments for carpe-datum-service/main.ts
	Author:		Ben Mullan (c) 2024
*/

import * as cdConstants		from "./cd-constants";
import * as cdUtils			from "./cd-utilities";
import * as yargsHelpers	from "yargs/helpers";
import yargs				from "yargs/yargs";
import path					from "path";
import fs					from "fs";

/*
	Possible invocations eg...
		--port=8192 --browser-pool-initial-size=2 --browser-pool-max-size=6
		--port 8192 --browser-pool-initial-size 2 --browser-pool-max-size 6
		--port=8192 --browser-pool-initial-size=2 --browser-pool-max-size=6 --cd-base-dir="./cd-base/"
*/

export type ParsedCLAs = {
	port									:number;
    verbose									:boolean;
    "cd-base-dir"							:string;
    cdBaseDir								:string;
    "browser-pool-initial-size"				:number;
    browserPoolInitialSize					:number;
    "browser-pool-max-size"					:number;
    browserPoolMaxSize						:number;
    _										:(string|number)[];
    $0										:string;
    [x :string]								:unknown;
};

export const parseCarpeDatumServiceCLAs = async (_argv :string[]) :Promise<ParsedCLAs> => {
	
	const _parsedCLAs :ParsedCLAs = yargs(yargsHelpers.hideBin(_argv))

		.option("cd-base-dir", { demandOption : false, type : "string", default : cdConstants.default_carpeDatumBaseDirPath, describe : "The path to the carpe-datum base directory, containing `chromium`, `wwwroot`, and `bap-library` sub-folders." })
		.check((_argv :any) :boolean => { if (fs.existsSync(path.resolve(_argv["cd-base-dir"]))) { return true; } else { throw new Error(`This cd-base-dir doesn't exist: "${_argv["cd-base-dir"]}"`); } })
		
		.option("port", { demandOption : false, type : "number", default : cdConstants.default_carpeDatumPort, describe : "The tcp/ip port on which the carpe-datum service (including the API and front-end) will be avaliable." })
		.option("browser-pool-initial-size", { demandOption : false, type : "number", default: cdConstants.default_browserPool_initialSize, describe : "The number of headless chromium instances to instanciate on carpe-datum startup." })
		.option("browser-pool-max-size", { demandOption : false, type : "number", default: cdConstants.default_browserPool_maxSize, describe : "The maximum permitted number of concurrently-existent headless chromium instances for carpe-datum browser-automated-processes (BAPs) to execute on." })
		
		.option("verbose", { demandOption : false, type : "boolean", default : false, describe : "Causes `log.verbose()` messages to be logged to stdout; rather inundates the console, so not much else is discernable." })

		.usage("~~~ carpe datum :: service ~~~\n-----------\nRun a pool of headless browsers for executing browser-automated-processes.")
		.epilogue("carpe-datum; seize the data. Ben Mullan 2024.")
		.version(cdConstants.carpeDatumVersion)
		
		.strict()
		.help()
		.parseSync()

	;

	if (! (await cdUtils.networkPortIsAvaliable(_parsedCLAs["port"]))) { throw new Error(`This network port isn't avaliable: "${_parsedCLAs["port"]}"`); }

	return _parsedCLAs;

};