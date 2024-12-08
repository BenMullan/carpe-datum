import * as cdWebServer	from "../../cd-web-server";
import * as cdApi		from "./cd-api";
import express			from "express";

export default (_cdBaseDir :string) => {

	const _safe = cdWebServer.catchHandlerErrors;
	const _router = express.Router();

	_router.get("/",														_safe(async (_req, _res) => { _res.json(cdApi.getApiServiceInfo()); }));
	_router.get("/baps",													_safe(async (_req, _res) => { _res.json({ baps : await cdApi.getBapsArray(_cdBaseDir)}); }));
	_router.post("/baps/*record-new",										_safe(async (_req, _res) => { _res.json(cdApi.launchPlaywrightCodegen(_req)); }));
	_router.get("/baps/:bapName",											_safe(async (_req, _res) => { _res.json(await cdApi.getBapByName(_cdBaseDir, _req.params.bapName)); }));
	_router.get("/baps/:bapName/executions",								_safe(async (_req, _res) => { _res.json(await cdApi.getBapExecutionsArray(_cdBaseDir, _req.params.bapName)); }));
	_router.post("/baps/:bapName/executions/*start-new",					_safe(async (_req, _res) => { _res.json(await cdApi.createAndStartNewBapExecution(_cdBaseDir, _req.params.bapName, _req.body)); }));
	_router.get("/baps/:bapName/executions/:executionId",					_safe(async (_req, _res) => { _res.json(await cdApi.getBapExecutionById(_cdBaseDir, _req.params.bapName, _req.params.executionId)); }));
	_router.get("/baps/:bapName/executions/:executionId/*wait-for-exit",	_safe(async (_req, _res) => { _res.json(await cdApi.waitForBapExecutionToExit(_cdBaseDir, _req.params.bapName, _req.params.executionId)); }));

	_router.get("/browser-pool",											_safe(async (_req, _res) => { _res.json({ browser_pool_state : await cdApi.getBrowserPoolState() }); }));
	_router.get("/browser-pool/:cdpPort",									_safe(async (_req, _res) => { _res.json({ browser_state : await cdApi.getIndividualBrowserState(parseInt(_req.params.cdpPort)) }); }));
	_router.post("/browser-pool/:cdpPort/set-stage-message",				_safe(async (_req, _res) => { _res.json({ browser_state : await cdApi.setIndividualBrowser_executionStageMessage(parseInt(_req.params.cdpPort), _req.body) }); }));
	_router.get("/browser-pool/:cdpPort/topmost-page-screenshot",			_safe(async (_req, _res) => { _res.json({ screenshot_base64png : await cdApi.getScreenshot_ofTopmostBrowserPage(parseInt(_req.params.cdpPort)) }); }));
	
	return _router;

};