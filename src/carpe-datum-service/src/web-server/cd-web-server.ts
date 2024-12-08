/*
	File:		* - carpe-datum API & front-end server
	Author:		Ben Mullan (c) 2024
*/

import * as cdConstants		from "../cd-constants";
import * as log				from "../cd-logging";
import getAppRouter			from "./routes/index";

import expressHandlebars	from "express-handlebars";
import express				from "express";
import path					from "path";

let cdWebServerConfig :{ port :number, cdBaseDir :string };
export const get_cdWebServerConfig = () => cdWebServerConfig;

export const startWebServer = (_cdBaseDir :string, _port :number) :void => {
	
	cdWebServerConfig = { cdBaseDir : _cdBaseDir, port : _port };
	const _app = express();
	
	/* handlebars: server-side html templates */ {

		const _handlebarsViewsDir = path.resolve(path.join(_cdBaseDir, cdConstants.handlebarsViewsDir));
		log.debug(`using handlebars-views' directory: "${_handlebarsViewsDir}"`);
		
		const _handlebars = expressHandlebars.create(
			{
				helpers : {
					getArrayLength : (_array :any[]) :number|null => _array?.length
				}
			}
		);

		_app.engine("handlebars", _handlebars.engine);
		_app.set("view engine", "handlebars");
		_app.set("views", _handlebarsViewsDir);

	}

	_app.set("case sensitive routing", false);
	_app.set("json spaces", 4);
	_app.use(express.json());
	
	/* middleware (http-handler) functions */ {

		// request logger
		_app.use(
			(_req :express.Request, _res :express.Response, _next :express.NextFunction) => {
				log.subinfo(_req.method, `${_req.url} → ${_res.statusCode}`);
				_next();
			}
		);

		// cache control
		_app.use(
			(_req, _res, _next) => {
				_res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
				_res.setHeader("Pragma", "no-cache");
				_res.setHeader("Expires", "0");
				_res.setHeader("Surrogate-Control", "no-store");
				_next();
			}
		);

		// cd-endpoints' router
		_app.use(getAppRouter(_cdBaseDir));

		// 404 handler
		_app.use(
			(_req :express.Request, _res :express.Response, _next :express.NextFunction) => {
				log.warn(`web-server non-existent endpoint requested (404): ${_req.originalUrl}`);
				_res.status(404).json({ error : `404 not found; this endpoint existeth not: "${_req.originalUrl}"` });
			}
		);

		// global error handler
		_app.use(
			(_err :any, _req :express.Request, _res :express.Response, _next :express.NextFunction) => {
				log.warn(`web-server request error caught: ${_err.stack ?? _err.message}`);
				_res.status(_err.status || 500).json({ error : (_err.stack ?? _err.message) });
			}
		);

	}

	_app.listen(_port, () => log.info(`carpe-datum web server running on port ${_port}`));

};

export const catchHandlerErrors = (_asyncFunction :((_req :express.Request, _res :express.Response, _next :express.NextFunction) => Promise<any>)) =>
	(_req :express.Request, _res :express.Response, _next :express.NextFunction) =>
		Promise.resolve(_asyncFunction(_req, _res, _next)).catch(_next)
;