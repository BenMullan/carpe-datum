/*
	File:		* - global application-level constants for carpe-datum
	Author:		Ben Mullan (c) 2024
*/

// used in parse-clas
export const carpeDatumVersion = "v0.9.4 (internal)";
export const default_carpeDatumPort = 8192;
export const default_browserPool_initialSize = 2;
export const default_browserPool_maxSize = 8;
export const default_carpeDatumBaseDirPath = "../../cd-base/";

// chromium constants
export const chromiumExeName = "chrome.exe";
export const chromiumWindowSize = "1440,900";
export const delayBetweenLaunchingChromiumInstances_ms = 500;

// as in: "cd-base/wwwroot/"
export const wwwrootDir = "wwwroot";

// as in: "cd-base/../src/carpe-datum-service/src/web-server/handlebars-views/"
export const handlebarsViewsDir = "../src/carpe-datum-service/src/web-server/handlebars-views/";

// as in: "cd-base/chromium/bin/chrome.exe"
export const chromiumBinariesDir = "chromium/bin/";

// as in: "cd-base/chromium/user-data-dirs/"
export const chromiumUserDataDirsDir = "chromium/user-data-dirs/";

// as in: "cd-base/bap-library/"
export const bapLibraryDir = "bap-library/";

// as in eg: "cd-base/bap-library/google-search-demo/executions/"
export const bapExecutions_foldername = "executions";

// as in: "cd-base/../src/bap-execution-worker/main.ts"
export const bapExecutionWorker_scriptFilePath = "../src/bap-execution-worker/main.ts";

// as in eg: "cd-base/bap-library/google-search-demo/playwright-script.mjs"
export const bapPlaywrightScript_filename = "playwright-script.mjs";

// as in eg: "cd-base/bap-library/google-search-demo/process-data.schema.json"
export const bapProcessDataSchema_filename = "process-data.schema.json";

// as in: [process-data.schema.json]'s "input_data_schema" : { ... }
export const bapProcessDataSchema_inputSchema_key = "input_data_schema";

// as in: execution-init-json's "input_payload" : { "input_data" : ... }
export const executionInitJson_inputPayload_key = "input_payload";

// as in: execution-init-json's execution-parameters' target-browser type
export const executionInitJson_remoteCdpBrowser_value = "remote_cdp_browser";
export const executionInitJson_detachedHeadedBrowser_value = "detached_headed_browser";

// as in: [input-payload.json]'s "input_data" : { ... }
export const bapExecution_inputData_key = "input_data";

// as in eg: "cd-base/bap-library/google-search-demo/executions/a7f36fb23c9e/.execution-error"
export const bapExecution_executionError_filename = ".execution-error";

// as in eg: "cd-base/bap-library/google-search-demo/executions/a7f36fb23c9e/.execution-in-progress"
export const bapExecution_executionInProgressFlag_filename = ".execution-in-progress";

// as in eg: "cd-base/bap-library/google-search-demo/executions/a7f36fb23c9e/input-payload.json"
export const bapExecution_inputPayload_filename = "input-payload.json";

// as in eg: "cd-base/bap-library/google-search-demo/executions/a7f36fb23c9e/execution-parameters.json"
export const bapExecution_executionParameters_filename = "execution-parameters.json";

// as in eg: "cd-base/bap-library/google-search-demo/executions/a7f36fb23c9e/execution-result.json"
export const bapExecution_executionResult_filename = "execution-result.json";

// as in eg: "cd-base/bap-library/google-search-demo/executions/a7f36fb23c9e/playwright-trace.zip"
export const bapExecution_playwrightTraceZip_filename = "playwright-trace.zip";

// used in waitUpToTwentySeconds_forExecutionInProgressFlagToExist_otherwiseThrowError()
export const maxTimeToWait_forExecutionInProgressFlagToExist_ms = 20000;

// used in ChromiumInstanceCollection
export const maxTimeToWait_forAcquiringAsyncMutexLock_ms = 20000;

// used in waitForBapExecutionToExit()
export const maxLongPollingRequestLifetime_ms = 30000;
export const intervalBetweenLongPollingChecks_ms = 800;

// used in [execution-result.json]'s `execution_exit_reason`
export enum BapExecutionExitReason { ran_successfully = "ran_successfully", playwright_error = "playwright_error" };

// used for the object returned by [playwright-script.mjs]
export interface BapPlaywrightScriptReturnValue { output_data :any };

// used for the json written to [execution-result.json]
export interface BapExecutionResult {
	execution_duration_ms			:number,
	execution_finished_timestamp	:number,
	execution_exit_reason			:BapExecutionExitReason,
	execution_error_message			:string|null,
	output_data						:any
};

// as saved to [execution-parameters.json]
export const executionParametersJson_schema = {
	"type" : "object",
	"properties" : {
		"target_browser" : {
			"type" : "object",
			"properties" : {
				"type" : { "type" : "string", "enum" : [executionInitJson_remoteCdpBrowser_value, executionInitJson_detachedHeadedBrowser_value] },
				"cdp_endpoint" : { "type" : ["string", "null"], "nullable" : true },
				"leave_detached_headed_browser_open" : { "type" : ["boolean", "null"], "nullable" : true }
			},
			"required" : ["type"]
		},
		"run_bap_in_slowmo" : { "type" : ["boolean", "null"], "nullable" : true },
		"cd_api_server" : { "type" : ["string", "null"], "nullable" : true }
	},
	"required" : ["target_browser"]
};

// validates the json POSTed in the request body to /.../*start-new
export const executionInitJson_schema = {
	"type" : "object",
	"properties" : {
		"input_payload" : {
			"type" : "object",
			"properties" : { "input_data" : { "type" : "object" } },
			"required" : ["input_data"]
		},
		"execution_parameters" : executionParametersJson_schema
	},
	"required" : ["input_payload", "execution_parameters"]
};

// validates the json POSTed in the request body to /.../set-status-message
export const executionStageUpdateJson_schema = {
	"type" : "object",
	"properties" : {
		"stage_message" : { "type" : "string" },
		"execution_parameters" : executionParametersJson_schema
	},
	"required" : ["stage_message"]
};