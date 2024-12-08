import * as cdConstants	from "../../../../cd-constants";
import express			from "express";
import path				from "path";

export default (_cdBaseDir :string) => {

	const _router = express.Router();
	_router.get("/", (_req, _res) => _res.redirect("/"));

	const _handlebarsViewsDir = path.resolve(path.join(_cdBaseDir, cdConstants.handlebarsViewsDir));
	_router.get("/cd-browser-pool-tile", (_req, _res) => _res.type("text/x-handlebars-template").sendFile(path.join(_handlebarsViewsDir, "partials/cd-browser-pool-tile.handlebars")));

	return _router;

};