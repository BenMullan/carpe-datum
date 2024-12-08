/*
	File:		* - parses command-line arguments for bap-execution-worker/main.ts
	Author:		Ben Mullan (c) 2024
*/

import * as cdConstants		from "../../carpe-datum-service/src/cd-constants";
import * as yargsHelpers	from "yargs/helpers";
import yargs				from "yargs/yargs";
import path					from "path";
import fs					from "fs";

/*
	Expecting CLAs like eg...
		--cd-base-dir="..." --bap-name="google-search-demo" --execution-id="a7f36fb23c9e"
*/

export default (_argv :string[]) :any => yargs(yargsHelpers.hideBin(_argv))

	.option("cd-base-dir", { demandOption : false, type : "string", default : cdConstants.default_carpeDatumBaseDirPath, describe : "The path to the carpe-datum base directory, containing `chromium`, `wwwroot`, and `bap-library` sub-folders." })
	.check((_argv :any) :boolean => { if (fs.existsSync(path.resolve(_argv["cd-base-dir"]))) { return true; } else { throw new Error(`This cd-base-dir doesn't exist: "${_argv["cd-base-dir"]}"`); } })
	
	.option("bap-name", { demandOption : true, type : "string", describe : "The folder-name of a browser-automated-process, in `bap-library/`." })
	.check((_argv :any) :boolean => { const _bapDir = path.resolve(path.join(_argv["cd-base-dir"], cdConstants.bapLibraryDir, _argv["bap-name"])); if (fs.existsSync(_bapDir)) { return true; } else { throw new Error(`This bap's folder doesn't exist: "${_bapDir}"`); } })
	
	.option("execution-id", { demandOption : true, type : "string", describe : "The name of a sub-folder within the bap-dir's `executions/` folder, containing an `input-payload.json` and `execution-result.json`." })
	.check((_argv :any) :boolean => { const _executionDir = path.resolve(path.join(_argv["cd-base-dir"], cdConstants.bapLibraryDir, _argv["bap-name"], cdConstants.bapExecutions_foldername, _argv["execution-id"])); if (fs.existsSync(_executionDir)) { return true; } else { throw new Error(`This execution-id folder doesn't exist: "${_executionDir}"`); } })
	
	.option("verbose", { demandOption : false, type : "boolean", default : false, describe : "Causes `log.verbose()` messages to be logged to stdout; rather inundates the console, so not much else is discernable." })
	
	.usage("~~~ carpe datum :: bap execution worker ~~~\n-----------\nExecutes the specified bap (browser-automated-process), on the specified target browser.")
	.epilogue("carpe-datum; seize the data. Ben Mullan 2024.")
	.version(cdConstants.carpeDatumVersion)
	
	.strict()
	.help()
	.parseSync()

;