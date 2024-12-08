/*
	File:	google-search-demo/playwright-script.mjs - demo BAP script (hosted by bap-execution-worker)
	Author:	Ben Mullan 2024
*/

import playwright, { expect } from "playwright/test";

const outputData = {};
let now, fyi;

export default async ({ _cdExecuteeResources, _browserContext, _inputData }) => {

	now = _cdExecuteeResources.describeCurrentBapStep,
	fyi = _cdExecuteeResources.provideDebuggingInformation;

	/*
		Open google.com, type in the _inputData's `search_string`, and press search.
		Scrape the URL of the first search-result, returning it in the bap's outputData.
	*/

	now `open the google search page`
	const _page = await _browserContext.newPage();
	await _page.goto(`https://www.google.com/`);
	await expect(_page).toHaveTitle(/.*Google.*/i);

	now `dismiss the "Before you continue to Google" popup, if present`
	const _dismissButton = await _page.getByRole("button", { name: "Reject all" });
	if ((await _dismissButton.count()) != 0) {
		fyi `dismissing T-and-Cs popup`
		await _dismissButton.click();
	}

	now `input + submit the search_string`
	const _searchBox = _page.getByLabel("Search", { exact: true })
	await _searchBox.fill(_inputData["search_string"]);
	await _searchBox.press("Enter")

	now `scrape the first search-result's url`
	outputData["first_result_url"] = await _page.locator("div > span > a:has(h3)").first().getAttribute("href");

	return { output_data : outputData };

};