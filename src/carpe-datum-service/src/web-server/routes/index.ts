import getUiRouter			from "./ui/index";
import getApiRouter			from "./api/index";
import * as cdConstants		from "../../cd-constants";
import express				from "express";
import path					from "path";

export default (_cdBaseDir :string) => {

	const _router = express.Router();

	_router.use("/ui",	getUiRouter(_cdBaseDir));
	_router.use("/api",	getApiRouter(_cdBaseDir));
	
	_router.use(
		express.static(
			path.resolve(path.join(_cdBaseDir, cdConstants.wwwrootDir)),
			{ index : "index.xhtml", extensions : ["xhtml"], maxAge : 0 }
		)
	);
	
	return _router;

};