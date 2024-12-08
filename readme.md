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
But it was precarious. Browsers would become detached during execution. It would completely & inexplicably freeze-up during use. You couldn't effectively handle multiple browser-windows. XPath-mapped elements would become unfindable after UI-updates. Subtle differences in environment would cause particular unattended executions to fail, and it would be near-impossible to catch the problem.


**The concept**: a server hosts a pool of ~50 headless chromium browsers (running without a visible user-interface). A library of pre-defined baps (browser-automated processes - eg clicking through a series of steps on a webpage and scraping some output) exists on the server, which provides a http-API for triggering & scheduling the execution of baps on browsers from the pool. An easy-to-use UI enables live previews and interaction with all headless browsers. When a bap is executed, a full playwright trace is captured, recording the precise state of the DOM at each point during bap-execution.

**This was inspired by** using 

## Key principles

<br/><img src="https://raw.githubusercontent.com/BenMullan/carpe-datum/main/src/(resources)/images/cd-bap-library.png" height="50%" width="50%" /><br/>
<br/><img src="https://raw.githubusercontent.com/BenMullan/carpe-datum/main/src/(resources)/images/cd-browser-pool.png" height="50%" width="50%" /><br/>
<br/><img src="https://raw.githubusercontent.com/BenMullan/carpe-datum/main/src/(resources)/images/cd-dev-clear-code.png" height="50%" width="50%" /><br/>
<br/><img src="https://raw.githubusercontent.com/BenMullan/carpe-datum/main/src/(resources)/javascript-has-a-place-in-modern-rpa-discuss.jpg" height="50%" width="50%" /><br/>


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