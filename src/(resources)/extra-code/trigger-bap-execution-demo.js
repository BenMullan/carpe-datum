/*
	File:	trigger-bap-execution-demo.js - submits an example bap-execution request to the carpe-datum server
	Exec:	node trigger-bap-execution-demo.js
	Author:	Ben Mullan 2024
*/


const sendHttpPostRequest = async (_url, _data = {}) => {

	console.debug("\nrequest-json-body", JSON.stringify(_data));
	
	const _response = await fetch(
		_url,
		{
			method	: "POST",
			headers	: { "Content-Type" : "application/json" },
			body	: JSON.stringify(_data)
		}
	);

	const _responseText = await _response.text()
	console.info("\nresponse-status", _response.status);
	
	try {
		const _responseJson = JSON.parse(_responseText);
		console.info("\nresponse-json", _responseJson.error ?? _responseJson);
	} catch {
		console.info("\nresponse-text", _responseText);
	}

};


// tell the cd-server to use an invisible
// (potentially remote; on a different server) browser
const _execPrams_headlessRemote = {
	"target_browser" : {
		"type" : "remote_cdp_browser",
		"cdp_endpoint" : null,
		"leave_detached_headed_browser_open" : null
	},
	"run_bap_in_slowmo" : false,
	// optional: "cd_api_server" : _cdApiServer
};


// tell the cd-server to use a visible browser,
// and leave it open afterwards (for debugging)
const _execPrams_headedDetached = {
	"target_browser" : {
		"type" : "detached_headed_browser",
		"leave_detached_headed_browser_open" : true
	},
	"run_bap_in_slowmo" : false,
};


const _cdApiServer = "http://localhost:8192";
const _bapName = "google-search-demo";
const _inputData = { "search_string" : "Who said: Life is much too important to be taken seriously" };


sendHttpPostRequest(
	`${_cdApiServer}/api/baps/${_bapName}/executions/*start-new`,
	{
		"input_payload" : { "input_data" : _inputData },
		"execution_parameters" : _execPrams_headedDetached
	}
).catch(
	_error => console.error("error:", _error)
);