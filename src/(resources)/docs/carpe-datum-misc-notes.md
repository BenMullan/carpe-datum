Mallard icon from iconarchive.com

### carpe-datum
	Can't use Deno or Bun because they don't have proper process-pipe implementations for Windows (something Playwright relies on for browser IPC).
	<br/>
	command-line arguments for carpe-datum-service: `--cd-base-dir` (absolute or relative path to cd-base/ - wherein bap-library/ etc), `--port`, `--browser-pool-initial-size`, `--browser-pool-max-size`, `--verbose` (for debugging)
	Use this to stream browser video to thumbnail: `CDP: Page.startScreencast`
	`npx sass --watch .\cd-base\wwwroot\assets\scss\:.\cd-base\wwwroot\assets\css\`

### Naming Conventions
	json_data_key
	namespaceName
	DataTypeName
	globalConstOrVariableName
	_localVariableName
	src/sourceCodeFile.ts
	bap-library/file-name.json

### Playwright configuration
	- set environment variable PLAYWRIGHT_BROWSERS_PATH to eg X:/path/with/forward/slashes
	- run: npx playwright install chromium

### Playwright commands
	- npm init playwright@latest
	- npx playwright show-trace "trace.zip"
	- npx playwright test --ui
	- npx playwright codegen --output "made-with-pw-test-target.spec.ts" --target javascript --browser chromium --color-scheme light --ignore-https-errors --lang en-GB --viewport-size=1440,900 http://user:pass@server/page


### API
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