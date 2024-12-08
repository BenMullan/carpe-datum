/* ****************************************************
	Useful Playwright snippets...
******************************************************/
	
	// Trace file viewer: https://trace.playwright.dev/

	// https://playwright.dev/docs/input
	// https://playwright.dev/docs/locators
	// https://playwright.dev/docs/other-locators
	// https://playwright.dev/docs/test-assertions



/* ****************************************************
	Demo: handle the clicking of a button either
	altering the URL of the CURRENT browser tab,
	or opening a new browser WINDOW. `_pageToUse`
	is set to the correct one of these.
******************************************************/
	
	let _pageToUse;

	const [_newPage] = await Promise.all(
		[
			_browserContext.waitForEvent("page"),
			_page.locator("#someTable tr", { has : _page.getByText(_somat) }).locator(".className").click()
		]
	).catch(() => [null]);

	if (_newPage) {
		await _newPage.waitForLoadState();
		await expect(_newPage).toHaveTitle(/.*somat.*/i);
		_pageToUse = _newPage;
	} else {
		await expect(_page).toHaveTitle(/.*somat-else.*/i);
		_pageToUse = _page
	}

	_pageToUse.locator("...").click();



/* ****************************************************
	Wait for element to become existent
******************************************************/

	try {
		await page.waitForSelector('selector', { state: 'visible', timeout: 5000 });
		// Element became visible within the timeout
	} catch (error) {
		if (error instanceof playwright.errors.TimeoutError) {
			console.error("element did not become visible within the timeout");
			// Handle the timeout error, e.g., by taking a screenshot or logging additional information
		} else {
			throw error; // Re-throw other unexpected errors
		}
	}



/* ****************************************************
	Misc...
******************************************************/
	
	const row = page.getByRole("row").filter({ hasText: "somat-here" });