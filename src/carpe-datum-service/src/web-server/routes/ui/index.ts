import * as cdWebServer		from "../../cd-web-server";
import * as cdApi			from "../api/cd-api";
import getHbTemplatesRouter	from "./hb-templates/index";
import os					from "os";
import express				from "express";

export default (_cdBaseDir :string) => {

	const _xhtmlMimeType = "application/xhtml+xml";
	const _safe = cdWebServer.catchHandlerErrors;
	const _router = express.Router();

	_router.get("/", (_req, _res) => _res.redirect("/"));
	_router.use("/hb-templates", getHbTemplatesRouter(_cdBaseDir));

	_router.get(
		"/bap-library",
		_safe(
			async (_req, _res) => {
				_res.type(_xhtmlMimeType);
				_res.render(
					"bap-library",
					{
						layout		: "cd-basic-page",
						pageTitle	: "bap-library",
						mainHeading	: "bap-library",
						bapList		: await cdApi.getBapsArray(_cdBaseDir),
						newBapTile	: { name : "new...", executions : [] }
					}
				);
			}
		)
	);

	_router.get(
		"/bap-library/:bapName/executions",
		_safe(
			async (_req, _res) => {
				_res.type(_xhtmlMimeType);
				_res.render(
					"bap-library-bap-executions",
					{
						layout		: "cd-basic-page",
						pageTitle	: `${_req.params.bapName} / executions`,
						mainHeading	: "bap executions",
						bapObject	: await cdApi.getBapByName(_cdBaseDir, _req.params.bapName)
					}
				);
			}
		)
	);

	_router.get(
		"/browser-pool",
		(_req, _res) => {
			_res.type(_xhtmlMimeType);
			_res.render(
				"browser-pool",
				{
					layout		: "cd-basic-page",
					pageTitle	: `browser-pool (${os.hostname()})`,
					mainHeading	: "browser-pool"
				}
			);
		}
	);

	return _router;

};