/*
	File:		* - playwright logic for carpe-datum
	Author:		Ben Mullan (c) 2024
*/

import playwright from "playwright";

export const browserSlowMoMode_msDelay = 1500;

export const default_browserContextParameters :playwright.BrowserContextOptions = {
	acceptDownloads		: false,
	colorScheme			: "light",
	extraHTTPHeaders	: { "X-Requested-With" : "carpe-datum" },
	httpCredentials		: { username : "", password : "" },
	ignoreHTTPSErrors	: true,
	locale				: "en-GB",
	viewport			: { width : 1440, height : 900 }
};