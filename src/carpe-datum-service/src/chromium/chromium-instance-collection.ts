/*
	File:		* - singleton class for managing an array of [ChromiumInstance]s
	Author:		Ben Mullan (c) 2024
*/

import ChromiumInstance		from "./chromium-instance";
import * as cdConstants		from "../cd-constants";
import * as cdUtils			from "../cd-utilities";
import * as log				from "../cd-logging";
import * as asyncMutex		from "async-mutex";

export default class ChromiumInstanceCollection {
	
	protected constructor () {};
	protected static singletonInstance_ :ChromiumInstanceCollection;
	protected static singletonConfiguration_hasBeenSupplied_ :boolean = false;
	protected static browserPool_maxSize_ :number;
	protected static cdBaseDir_ :string;
	
	public static readonly get_browserPoolMaxSize = () :number => ChromiumInstanceCollection.browserPool_maxSize_;
	
	protected readonly chromiumInstances_ :ChromiumInstance[] = [];
	protected readonly mutexLock_ = asyncMutex.withTimeout(new asyncMutex.Mutex(), cdConstants.maxTimeToWait_forAcquiringAsyncMutexLock_ms, new Error(`couldn't acquire() mutex-lock for chromium-instance-collection within ${cdConstants.maxTimeToWait_forAcquiringAsyncMutexLock_ms}ms`));
	public readonly browserPoolMaxSize_hasBeenReached = () :boolean => (this.chromiumInstances_.length >= ChromiumInstanceCollection.browserPool_maxSize_);
	
	public static readonly setSingletonConfiguration = (
		{ _browserPool_maxSize, _cdBaseDir }
		:
		{ _browserPool_maxSize :number, _cdBaseDir :string }
	) :void => {

		ChromiumInstanceCollection.singletonConfiguration_hasBeenSupplied_ = true;

		ChromiumInstanceCollection.browserPool_maxSize_ = _browserPool_maxSize;
		ChromiumInstanceCollection.cdBaseDir_ = _cdBaseDir;

	};

	public static readonly getSingletonInstance = () :ChromiumInstanceCollection => {

		if (!ChromiumInstanceCollection.singletonConfiguration_hasBeenSupplied_) { throw new Error("ChromiumInstanceCollection.getInstance() cannot be called until setSingletonConfiguration() has been called first."); }
		if (!ChromiumInstanceCollection.singletonInstance_) { ChromiumInstanceCollection.singletonInstance_ = new ChromiumInstanceCollection(); }
		return ChromiumInstanceCollection.singletonInstance_;
		
	};

	public readonly updateBrowserExecuteeStatus = async (_cdpPort :number, _stageMessage :string) :Promise<void> => {

		// get the browser in `chromiumInstances_` whose `remoteDebuggingPort` === _cdpPort
		// set its `.currentExecutee.currentExecutionStage` to _stageMessage

		const _releaseMutexLock = await this.mutexLock_.acquire();

		try {

			const _targetBrowser = this.chromiumInstances_.filter(_crInstance => _crInstance.remoteDebuggingPort === _cdpPort).at(0);
			if (_targetBrowser?.currentExecutee == null) { throw new Error(`the browser with cdp-port ${_cdpPort} either doesn't exist, or it isn't currently executing a bap.`); }

			_targetBrowser.currentExecutee.currentExecutionStage = _stageMessage;

		} finally { _releaseMutexLock(); }

	};

	private readonly launchNewChromiumInstance_mustAcquireMutexLockBeforeCalling_ = async () :Promise<void> => {

		// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
		// the caller hereof MUST acquire() the mutex-lock themselves
		// (cannot be done herein as nested-mutex-acquisition causes deadlock)
		// ((the programmer appreciates this isn't... ideal.))
		// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

		this.chromiumInstances_.push(
			await ChromiumInstance.launch(ChromiumInstanceCollection.cdBaseDir_, { _headless : true })
		);
		
	};

	public readonly launchNewChromiumInstances = async (_numberOfInstancesToLaunch :number) :Promise<void> => {
		
		const _releaseMutexLock = await this.mutexLock_.acquire();

		try {

			for (let _numInstancesLeftToLaunch = _numberOfInstancesToLaunch; _numInstancesLeftToLaunch > 0; --_numInstancesLeftToLaunch) {
				
				await this.launchNewChromiumInstance_mustAcquireMutexLockBeforeCalling_();

				if (_numInstancesLeftToLaunch > 1) {
					log.debug(`waiting ${cdConstants.delayBetweenLaunchingChromiumInstances_ms}ms before launching next chromium instance`);
					await cdUtils.sleep(cdConstants.delayBetweenLaunchingChromiumInstances_ms);
				}

			}

		} finally { _releaseMutexLock(); }

	};

	public readonly getChromiumInstancesList = async () :Promise<readonly ChromiumInstance[]> => {
		
		const _releaseMutexLock = await this.mutexLock_.acquire();
		try { return this.chromiumInstances_; }
		finally { _releaseMutexLock(); }
		
	};

	public readonly acquireAvaliableChromiumInstance = async () :Promise<ChromiumInstance> => {

		const _releaseMutexLock = await this.mutexLock_.acquire();

		try {
			
			// Identify the first ChromiumInstance which isn't currently in-use,
			// then commandeer() it, and return its cdp-endpoint.

			const _getIdleChromiumInstances = () => this.chromiumInstances_.filter(_crInstance => _crInstance.currentExecutee === null);
			log.verbose("currently-available chromium instnaces:", _getIdleChromiumInstances());

			if (_getIdleChromiumInstances().length === 0) {

				// There are no available currently-running chromium instances for us to use.
				// Either spin-up a new one (if we're not at the limit),
				// or throw an Error.

				if (!this.browserPoolMaxSize_hasBeenReached()) {

					log.info("launching new chromium-instance");
					await this.launchNewChromiumInstance_mustAcquireMutexLockBeforeCalling_();

				} else {

					// **TODO: add the task to a queue (instead of not performing it because we're out-of-resources)
					throw new Error(`the maximum browser-pool size (${ChromiumInstanceCollection.browserPool_maxSize_}) has already been reached; no more browser instances can be launched`);

				}

			}

			// There should now be an available ChromiumInstance,
			// either because there was one to begin with,
			// or because we've just launched a new one.

			const _firstIdleChromiumInstance = _getIdleChromiumInstances()[0];
			if (!_firstIdleChromiumInstance) { throw new Error("There are no available idle chromium instances in the browser-pool"); }

			return _firstIdleChromiumInstance;

		} finally {
			_releaseMutexLock();
		}

	};

};