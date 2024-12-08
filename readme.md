# carpe-datum
...is a prototype headless-browser orchestration server (and impropper Latin for "seize the data").
<br/><br/>

> Watch the **["JavaScript in RPA" YouTube Video](https://youtu.be/PWyhuDJQEZw)!**
<a href="https://youtu.be/PWyhuDJQEZw" target="_blank">
	<img src="https://raw.githubusercontent.com/BenMullan/carpe-datum/main/src/(resources)/images/jsrpa-video-thumbnail.jpg" width="100%" />
<a/>
<br/><br/>

## Err... what's going on
I spent 5 months with a process-automation team. They ran an amazing peice of [flowcharting software](https://www.google.com/search?q=blue+prism+automate+desktop+screenshot&tbm=isch) on a farm of VMs, to simulate keystrokes and mouse-clicks - and run processes (eg data-entry into a web-based business system) automatically, without paying humans to perform them. This system was an at-once beguiling and stupyfying conflation of numerous bizzare and anachronistic technologies; Win32-spying, .NET Remoting, remote DOM-inspection, VB6-style expression functions, and even Visual J#!
<br/><br/>
But it was precarious. Browsers would become detached during execution. It would completely & inexplicably freeze-up during use. It couldn't effectively handle multiple browser-windows. XPath-mapped elements would become unfindable after UI-updates. Subtle differences in environment would cause certain unattended executions to fail, and it would be near-impossible to catch what went wrong. Data would be perilously plucked from inconsistenyly-formatted excel spreadsheets, and run through fragile type-coercion.

## *JavaScript* you say...?
**Imagine:** instead of 50 VMs; one server, and 50 headless browsers.<br/><br/>
An easy-to-use UI with a library of pre-defined baps (browser-automated processes - eg entering business data and scraping some output), and live previewing & interaction with the browser-pool. A http-API for triggering & scheduling bap executions on browsers from the pool. Robustly-implemented processes with watertight javascript, using [playwright](https://github.com/microsoft/playwright) to manipulate the DOM directly, instead of prodding at the UI from above. Execution traces precisely capturing screenshots & the DOM-state at each stage. Consistent, schema-validated process input- and output-data. (Oh, and you'd save ~£500,000 on Blue Prism lisencing costs too).

<img alt="ui-screenshot" src="https://raw.githubusercontent.com/BenMullan/carpe-datum/main/src/(resources)/images/cd-bap-library.png" width="100%" />
<img alt="ui-screenshot" src="https://raw.githubusercontent.com/BenMullan/carpe-datum/main/src/(resources)/images/cd-browser-pool.png" width="100%" />

## Learnings
<img src="https://raw.githubusercontent.com/BenMullan/carpe-datum/main/src/(resources)/images/javascript-has-a-place-in-modern-rpa-discuss.jpg" width="100%" />
<i>(... if only that had come up in the A-level)</i>
<ul>
	<li>For a process to be as robust as possible, it needs to interface with the system at the lowest available layer; javascript enables direct manipulation of the DOM underlying the UI.</li>
	<li>To use Blue Prism the most effectively, you need in-depth programming knowledge (ie Visual Basic, webpage structuring, and http APIs mechanisms). But if you have this, why remain tied to Blue Prism? You could escape the sluggishness, precarity, and extortionate cost - in exchange for free, unfettered, democratised code.</li>
	<li>Suffice it to say, there exists a skills-gap between the domains of blue-prism-operation and playwright scripting; a skills-gap likely to take <i>some time</i> to bridge.</li>
</ul>

## This project

<img alt="code-screenshot" src="https://raw.githubusercontent.com/BenMullan/carpe-datum/main/src/(resources)/images/cd-dev-clear-code.png" width="100%" />

Amongst the **most important code** is...
- cd-server entrypoint: [main.ts](https://github.com/BenMullan/carpe-datum/blob/main/src/carpe-datum-service/main.ts)
- bap-execution logic: [bap-execution.ts](https://github.com/BenMullan/carpe-datum/blob/main/src/carpe-datum-service/src/bap-execution/bap-execution.ts)
- http API endpoints [api/index.ts](https://github.com/BenMullan/carpe-datum/blob/main/src/carpe-datum-service/src/web-server/routes/api/index.ts)

## To use this software...
- `npx playwright install`
- in cd-base/chromium/, download [chromium binaries](https://playwright.azureedge.net/builds/chromium/1148/chromium-win64.zip), and put chrome.exe etc inside ./bin/
- `npm i` in cd-base/bap-library/ and src/
- `cd src/carpe-datum-service/ && npx tsx main.ts` (should see "carpe-datum web server running on port 8192")
- submit a http-request to trigger a bap-execution (example in `src\(resources)\extra-code\trigger-bap-execution-demo.js`)

command-line arguments for carpe-datum-service: `--cd-base-dir` (absolute or relative path to cd-base/ - wherein bap-library/ etc), `--port`, `--browser-pool-initial-size`, `--browser-pool-max-size`, `--verbose` (for debugging)

## How it worketh...
- A cd-server runs the carpe-datum-service, which listens for bap-execution http-api requests (on port 8192 by default)
- This server maintains a pool of headless chromium instances, which are `comandeer()ed` and `relinquish()ed` as required
- The server has a bap-library (a folder of 
- On receipt of a `*start-new` request, 

- A new execution is created in `cd-base/bap-library/<bap-name>/executions/`



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


Mallard icon from iconarchive.com
_Ben Mullan 2024_