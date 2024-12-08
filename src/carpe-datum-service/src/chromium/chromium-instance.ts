/*
	File:		* - carpe-datum chromium-browser launching functions
	Author:		Ben Mullan (c) 2024
*/

import * as cdConstants		from "../cd-constants";
import * as cdUtils			from "../cd-utilities";
import * as log				from "../cd-logging";
import childProcess			from "child_process";
import path					from "path";
import fs					from "fs";

export class BapBeingExecuted {
	public constructor (public readonly bapName :string) {};
	public currentExecutionStage :string|null = null;
};

export default class ChromiumInstance {

	protected constructor (
		public readonly processPid				:number,
		public readonly remoteDebuggingPort		:number,
		public readonly userDataDir_fullPath	:string
	) {};

	public currentExecutee :BapBeingExecuted|null = null;
	protected readonly cdpHttpEndpoint_ = () => `http://localhost:${this.remoteDebuggingPort}`;
	
	public static readonly launch = async (_cdBaseDir :string, _browserLaunchOptions :{ _headless :boolean } = { _headless : true }) :Promise<ChromiumInstance> => {

		const _chromeExePath = path.resolve(
			path.join(_cdBaseDir, cdConstants.chromiumBinariesDir, cdConstants.chromiumExeName)
		);

		const _remoteDebuggingPort = await cdUtils.findRandomAvaliableNetworkPort();

		const _userDataDir = path.resolve(
			path.join(_cdBaseDir, cdConstants.chromiumUserDataDirsDir, `${cdUtils.getRandomMiniHash()}-${_remoteDebuggingPort}`)
		);

		log.subinfo(`launching chromium instance <${_remoteDebuggingPort}>`);
		log.debug(`chromium user-data-dir "${path.basename(_userDataDir)}"`);
		log.debug("browser launch-options:", _browserLaunchOptions);

		if (!fs.existsSync(_chromeExePath)) { throw new Error(`a chromium exe doesn't exist at this path: "${_chromeExePath}"; place a copy of chrome.exe etc in cd-base/chromium/bin/`); }

		const _chromiumCLAs = ChromiumInstance.getChromiumCLAs_(_userDataDir, _remoteDebuggingPort, _browserLaunchOptions._headless);
		log.verbose("_chromiumCLAs", _chromiumCLAs);

		const _chromiumProcess = childProcess.spawn(_chromeExePath, _chromiumCLAs);
		_chromiumProcess.stdout.on("data", (_data :any) => log.verbose(` chromium <${_remoteDebuggingPort}> stdout:`, _data.toString().trim()));
		_chromiumProcess.stderr.on("data", (_data :any) => log.verbose(` chromium <${_remoteDebuggingPort}> stderr:`, _data.toString().trim()));

		if (_chromiumProcess.pid === undefined) { throw new Error(`...failed to launch chromium process <${_remoteDebuggingPort}>; pid undefined after launch`); }
		return new ChromiumInstance(_chromiumProcess.pid, _remoteDebuggingPort, _userDataDir);

	};

	// returns the browser's cdp-endpoint, & marks this instance as in-use
	public readonly commandeer = (_bapName :string) :string => {
		log.subinfo(`commandeer()ing chromium-instance <${this.remoteDebuggingPort}>...`);
		if (this.currentExecutee !== null) { throw new Error(`ChromiumInstance.commandeer() was called whilst its currentExecutee was not null; the instance cannot be commandeered if it's already in-use. user-data-dir = "${this.userDataDir_fullPath}".`); }
		this.currentExecutee = new BapBeingExecuted(_bapName);
		return this.cdpHttpEndpoint_();
	};

	// marks this instance as no-longer in-use
	public readonly relinquish = () :void => {
		log.subinfo(`...relinquish()ing chromium-instance <${this.remoteDebuggingPort}>`);
		if (this.currentExecutee === null) { throw new Error(`ChromiumInstance.relinquish() was called whilst its currentExecutee was null; the instance cannot be relinquished if it isn't currently in-use. user-data-dir = "${this.userDataDir_fullPath}".`); }
		this.currentExecutee = null;
	};

	protected static readonly getChromiumCLAs_ = (_userDataDir_unquotedPath :string, _remoteDebuggingPort :number, _launchHeadlessly :boolean = true) :string[] => [
		`--user-data-dir=${_userDataDir_unquotedPath}`,
		`--remote-debugging-port=${_remoteDebuggingPort}`,
		`--window-size=${cdConstants.chromiumWindowSize}`,
		`--window-position=${Math.floor(Math.random() * 200)},${Math.floor(Math.random() * 150)}`,
		...(_launchHeadlessly ? [`--headless=new`, `--disable-gpu`] : []),
		`--no-startup-window`,
		`--ignore-certificate-errors`,
		`--remote-allow-origins=*`,
		`--enable-logging=stderr`,
		`--v=1`,
		`--lang=en-GB`,
		`--unsafely-disable-devtools-self-xss-warnings`,
		`--disable-downloads`,
		`--disable-field-trial-config`,
		`--disable-background-networking`,
		`--disable-background-timer-throttling`,
		`--disable-backgrounding-occluded-windows`,
		`--disable-back-forward-cache`,
		`--disable-breakpad`,
		`--disable-client-side-phishing-detection`,
		`--disable-component-extensions-with-background-pages`,
		`--disable-component-update`,
		`--disable-default-apps`,
		`--disable-dev-shm-usage`,
		`--disable-extensions`,
		`--disable-features=ImprovedCookieControls,LazyFrameLoading,GlobalMediaControls,DestroyProfileOnBrowserClose,MediaRouter,DialMediaRouteProvider,AcceptCHFrame,AutoExpandDetailsElement,CertificateTransparencyComponentUpdater,AvoidUnnecessaryBeforeUnloadCheckSync,Translate,HttpsUpgrades,PaintHolding,PlzDedicatedWorker`,
		`--blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4`,
		`--disable-hang-monitor`,
		`--disable-ipc-flooding-protection`,
		`--disable-popup-blocking`,
		`--disable-prompt-on-repost`,
		`--disable-renderer-backgrounding`,
		`--disable-search-engine-choice-screen`,
		`--no-default-browser-check`,
		`--allow-pre-commit-input`,
		`--force-color-profile=srgb`,
		`--metrics-recording-only`,
		`--enable-automation`,
		`--password-store=basic`,
		`--use-mock-keychain`,
		`--no-sandbox`,
		`--no-first-run`,
		`--no-service-autorun`,
		`--export-tagged-pdf`,
		`--hide-scrollbars`,
		`--mute-audio`,
		// `about:blank`
	];

};