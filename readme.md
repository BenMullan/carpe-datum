# carpe-datum
...is a **prototype** headless-browser orchestration server (and improper Latin for "seize the data").
<br/><br/>

## Err... what's going on
I spent 5 months with a process-automation team. They ran an amazing piece of [flowcharting software](https://www.google.com/search?q=blue+prism+automate+desktop+screenshot&tbm=isch) on a farm of VMs, to simulate mouse-clicks and keystrokes - and run processes automatically (eg data-entry into web-based business systems), without paying humans to perform them. This system was an at-once beguiling and stupefying conflation of numerous bizarre and anachronistic technologies; Win32-spying, remote DOM-inspection, VB6-style expression functions, .NET Remoting, and even the obscure "Visual J#"!
<br/><br/>
But it was precarious. And slow. Browsers would become detached during execution. It would completely & inexplicably freeze-up during use. It couldn't effectively handle multiple browser-windows. XPath-mapped elements would become unfindable after UI-updates. Subtle differences in environment would cause certain unattended executions to fail, and it would be near-impossible to catch what went wrong. Data would be perilously plucked from inconsistently-formatted excel spreadsheets, and run through fragile type-coercion. I wanted to do better.
<br/><br/>
→ This prototype proved that a **5-minute** Blue Prism process could be executed in **under 20 seconds** with JavaScript.
<br/><br/>

## *JavaScript*, you say...?
**Imagine:** instead of 50 VMs; one server, and 50 headless browsers.<br/><br/>
An easy-to-use UI with a library of pre-defined baps (browser-automated processes - eg entering business-data and scraping some output), and live-previewing & interaction with the browser-pool. A http-API for triggering & scheduling bap executions on browsers from the pool. Robustly-implemented processes with watertight javascript, using [playwright](https://github.com/microsoft/playwright) to manipulate the DOM directly, instead of prodding at the UI from above. Execution traces capturing precise screenshots & DOM-state at each stage. Consistent, schema-validated process input- and output-data. (Oh, and you'd save ~£500,000 on Blue Prism licensing costs too).

<img alt="ui-screenshot" src="https://raw.githubusercontent.com/BenMullan/carpe-datum/main/src/(resources)/images/cd-bap-library.png" width="100%" />
...and a <a href="https://github.com/BenMullan/carpe-datum/blob/4e06b37d26f5896245e5e50221f2f2cbc47fa455/src/carpe-datum-service/src/chromium/chromium-instance-collection.ts#L122">dynamically-sized</a> browser-pool...<br/><br/>
<img alt="ui-screenshot" src="https://raw.githubusercontent.com/BenMullan/carpe-datum/main/src/(resources)/images/cd-browser-pool.png" width="100%" />

## What we learned
<i>If only this one had come up in the A-level...</i>
<img src="https://raw.githubusercontent.com/BenMullan/carpe-datum/main/src/(resources)/images/javascript-has-a-place-in-modern-rpa-discuss.jpg" width="100%" />
<br/>
<ul>
	<li>For a process to run as robustly as possible, it needs to interface with the system at the <b>lowest available layer</b>; javascript enables direct manipulation of the DOM underlying the UI.</li>
	<li>To use Blue Prism the most effectively, you need <b>in-depth programming knowledge</b> (ie Visual Basic, webpage structuring, and http APIs mechanisms). But if you have this, why remain tied to Blue Prism? You could escape the sluggishness, precarity, and extortionate cost - in exchange for free, unfettered, democratised code.</li>
	<li>Suffice it to say, there exists a <b>skills-gap</b> between the disciplines of blue-prism-operation and playwright-scripting; a skills-gap likely to take <i>some time</i> to bridge in most working environments.</li>
</ul>
<br/>

## This project
<img alt="code-screenshot" src="https://raw.githubusercontent.com/BenMullan/carpe-datum/main/src/(resources)/images/cd-dev-clear-code.png" width="100%" />

Amongst the **most important code** is...
- cd-server entrypoint: [main.ts](https://github.com/BenMullan/carpe-datum/blob/main/src/carpe-datum-service/main.ts)
- bap-execution logic: [bap-execution.ts](https://github.com/BenMullan/carpe-datum/blob/main/src/carpe-datum-service/src/bap-execution/bap-execution.ts)
- http API endpoints: [api/index.ts](https://github.com/BenMullan/carpe-datum/blob/main/src/carpe-datum-service/src/web-server/routes/api/index.ts)
- this tool for playwright development: [**npmjs**.com/playwright-live-interpreter](https://www.npmjs.com/package/playwright-live-interpreter)

### To use this software...
- download [node-js](https://nodejs.org/dist/v23.3.0/node-v23.3.0-x64.msi) and [a zip of this repository](https://github.com/BenMullan/carpe-datum/archive/refs/heads/main.zip)
- run `npm i` in `src/` and `cd-base/bap-library/`
- download [chromium binaries](https://playwright.azureedge.net/builds/chromium/1148/chromium-win64.zip), and put `chrome.exe` et cetera in `cd-base/chromium/bin/`
- then run, using...
	- `cd src/carpe-datum-service/` && `npx tsx main.ts`
	- run [trigger-bap-execution-demo.js](https://github.com/BenMullan/carpe-datum/blob/main/src/(resources)/extra-code/trigger-bap-execution-demo.js) to run the google-search-demo bap

### How it worketh
- A cd-server runs the `carpe-datum-service`, which listens for bap-execution requests on a http API.
- The server maintains a pool of headless chromium instances, which are `comandeer()ed` and `relinquish()ed` as required.
- The server has a bap-library (a folder of playwright-scripts and process-data schema definitions, for different browser-based processes).
- A client somewhere makes a `*start-new` execution POST request; this contains execution-parameters (eg whether to use a headed/headless browser) and process-input-data (eg the string to inject into the google-search box). The client can then make a `*wait-for-exit` long-polling request, to determine when the bap-execution has finished.
- On receipt of a `*start-new` execution request (eg `POST /api/baps/google-search-demo/executions/*start-new`), the server validates the input-data against [the schema](https://github.com/BenMullan/carpe-datum/blob/main/cd-base/bap-library/google-search-demo/process-data.schema.json) defined for the specified bap, and creates a new [execution folder](https://github.com/BenMullan/carpe-datum/tree/main/cd-base/bap-library/google-search-demo/executions), with an `.execution-in-progress` flag file. A [bap-execution-worker](https://github.com/BenMullan/carpe-datum/blob/main/src/bap-execution-worker/) process is instanciated (eg `bap-execution-worker --cd-base-dir="..." --bap-name="google-search-demo" --execution-id="67f36fb23c9e" --target-browser-cdp-endpoint="http://localhost:9294"`), and the server vigilantly captures this child-process's stdout/err and exit-code.
- After execution, the execution endpoint (eg `GET /api/baps/google-search-demo/executions/67f36fb23c9e`) returns an object describing the execution-duration, -exit-reason, -error-state, and any process-output-data (eg a value scraped from the webpage).

<br/>
<b>In other words</b>, this prototype provides an interface for a process's input- and output-data, which is completely abstracted from the nitty-gritty of the process's execution. You don't have to <i>see</i> the process - and it doesn't even have to run on <i>your</i> computer; as long as it's robustly implemented in JavaScript, it can heedfully process as much data as you fancy, without you touching it once.
<br/><br/>

Do not watch Ben's javascript-in-rpa video. He is very embarrassed about [it](https://youtu.be/PWyhuDJQEZw). Watch [these](https://www.youtube.com/watch?v=K9cDIENunzk) marginally better [ones](https://www.youtube.com/watch?v=N4XGwNTvdtk) instead.

_Ben Mullan 2024_