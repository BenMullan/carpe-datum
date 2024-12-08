const createNewBap = () => {

	if (!["localhost", "127.0.0.1"].includes(window.location.hostname)) {
		throw new Error(`to launch playwright-codegen, access this webpage on the carpe-datum server itself.\n\n("localhost" instead of "${window.location.hostname}")`);
	}

	window.Swal.fire(
		{
			title				: "what's this bap for?",
			input				: "text",
			inputPlaceholder	: "enter a bap name...",
			showCancelButton	: true,
			confirmButtonText	: "next",
			cancelButtonText	: "cancel",
			inputValidator		: value => { if (!value) { return "try actually typing something darling"; } }
		}
	).then(
		async (_swalResult) => {
			if (_swalResult.isConfirmed) {

				const _bapName = _swalResult.value.toLowerCase().replace(/[ _]/g, "-").replace(/[^a-z0-9\-\+\@\$]/g, "");
				console.info("creating bap:", _bapName);
				
				await launchPlaywrightCodegen_onServer();
				showInfoMessage(`use playwright-codegen to record the automation for ${_bapName}`, "good stuff");

			}
		}
	);

};

const launchPlaywrightCodegen_onServer = async () => {

	const _endpoint = "/api/baps/*record-new";

	try {
		
		const _response = await fetch(_endpoint, { method : "POST" });
		if (!_response.ok) { throw new Error(`fetch()ing "${_endpoint}" resulted in a non-OK (HTTP ${_response.status}) response of ${await _response.text()}`); }
		
		return await _response.json();

	} catch (_error) {
		showErrorMessage(`fetch()ing "${_endpoint}" produced error ${_error}`);
	}

};