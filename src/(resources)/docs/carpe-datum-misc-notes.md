### carpe-datum
	Can't use Deno or Bun because they don't have proper process-pipe implementations for Windows (something Playwright relies on for browser IPC)
	<br/>
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