// instead of errors silently appearing in the console, annoy the user with 'em
window.onerror = (_message, _errorSource, _lineNum, _colNum, _error) => {
	
	// show a sweetalert2 msgbox
	showErrorMessage(_message.replace(/^Uncaught Error: /, ""));

	// don't prevent the error also showing in dev-tools
	return false;

};

const showErrorMessage = (_messageText) => window.Swal.fire(
	{
		title	: "oh dear...",
		text	: _messageText,
		icon	: "warning"
	}
);

const showInfoMessage = (_messageText, _messageTitle = "") => window.Swal.fire(
	{
		title	: _messageTitle,
		text	: _messageText,
		icon	: "info"
	}
);

// returns the json object returned by the cd-api
const fetchCdApiResponseJson = async (_endpoint) => {

	try {
		
		const _response = await fetch(_endpoint);
		if (!_response.ok) { throw new Error(`fetch()ing "${_endpoint}" resulted in a non-OK (HTTP ${_response.status}) response of ${await _response.text()}`); }
		
		return await _response.json();

	} catch (_error) {
		showErrorMessage(`fetch()ing "${_endpoint}" produced error ${_error}`);
	}

};

// returns the handlebars template-instanciation function
const fetchHandlebarsTemplate = async (_hbTemplateName) => {

	const _endpoint = `/ui/hb-templates/${_hbTemplateName}`;

	try {
		
		const _response = await fetch(_endpoint);
		if (!_response.ok) { throw new Error(`fetch()ing "${_endpoint}" resulted in a non-OK (HTTP ${_response.status}) response of ${await _response.text()}`); }
		
		const _responseText = await _response.text();
		return window.Handlebars.compile(_responseText);

	} catch (_error) {
		showErrorMessage(`fetch()ing "${_endpoint}" produced error ${_error}`);
	}

};