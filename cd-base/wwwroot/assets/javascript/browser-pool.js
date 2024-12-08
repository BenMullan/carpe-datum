const loadBrowserPoolTiles = async () => {

	const _browserPool = await fetchCdApiResponseJson("/api/browser-pool");
	
	for (_browser of _browserPool["browser_pool_state"]) {
		await renderBrowserPoolTile(_browser);
	}

	// get the latest screenshot for all browsers which aren't currently idle
	await loadLatestScreenshots_forNonIdleBrowsers();

};

const renderBrowserPoolTile = async (_browser) => {

	// if it's the first time calling this function, initialise this static variable...
	if (typeof renderBrowserPoolTile._renderBrowserTile_fromHbTemplate_ === "undefined") {
		renderBrowserPoolTile._renderBrowserTile_fromHbTemplate_ = await fetchHandlebarsTemplate("cd-browser-pool-tile");
	}

	const _newBrowserTile = $(renderBrowserPoolTile._renderBrowserTile_fromHbTemplate_(_browser));
	_newBrowserTile.hide();
	
	$("#browser-pool-tiles-container").prepend(_newBrowserTile);
	_newBrowserTile.fadeIn(Math.floor(Math.random() * (2500 - 800 + 1)) + 800);

};

const loadLatestScreenshots_forNonIdleBrowsers = async () => {

	const _loadScreenshotForBrowserCdTile = async (_cdTileElement) => {
		
		// reutrns json like: { screenshot_base64png : "iVBORw0KGgo..." }
		console.debug(`requesting <${$(_cdTileElement).attr("data-cdp-port")}> screenshot`);
		const _screenshotResponse = await fetchCdApiResponseJson(`/api/browser-pool/${$(_cdTileElement).attr("data-cdp-port")}/topmost-page-screenshot`);
		
		$(_cdTileElement).find("img").attr("src", `data:image/png;base64,${_screenshotResponse["screenshot_base64png"]}`);
		$(_cdTileElement).find("img").removeClass("loading-img").addClass("cd-tile-upper-image");
		setTimeout(() => _loadScreenshotForBrowserCdTile(_cdTileElement), 1500);
		
	};
	
	for (_cdTile of $(`#browser-pool-tiles-container .cd-tile[data-is-idle="false"]`)) {
		await _loadScreenshotForBrowserCdTile(_cdTile);
	}

};