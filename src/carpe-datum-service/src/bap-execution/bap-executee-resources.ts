/*
	File:		* - carpe-datum class passed into the playwright-script on invocation
	Author:		Ben Mullan (c) 2024
*/

import * as log			from "../cd-logging";
import * as bapUtils	from "./bap-utilities";
import * as cdConstants	from "../cd-constants";
import path				from "path";
import fs				from "fs";

export default class BapExecuteeResources {

	// Attempt to prevent inadvertant infinite loops; if the
	// same bap description is provided more than (5) times
	// in a row, throw an Error().
	protected readonly maxBapStepRepetitionCount_ = 5;

	// track how many steps have been executed so far
	protected bapStepsExecuted_count_ = 0;
	
	// track which steps (now `...` calls) are performed
	protected readonly completedBapSteps_descriptionsToInvocationCounts_ = new Map<string, number>();

	// records the now`` and fyi`` calls' output
	protected bapExecutionOutput_ :string[] = [];

	// from [execution-parameters.json]
	protected readonly bapExecutionParameters_ :any;

	public constructor (_cdBaseDir :string, _bapName :string, _executionId :string) {

		const _bapFolder = path.join(_cdBaseDir, cdConstants.bapLibraryDir, _bapName);
		const _executionFolder = path.join(_bapFolder, cdConstants.bapExecutions_foldername, _executionId);

		 log.subinfo("BapExecuteeResources :: reading bap-execution's [execution-parameters.json]");
		 this.bapExecutionParameters_ = JSON.parse(
			fs.readFileSync(
				path.join(_executionFolder, cdConstants.bapExecution_executionParameters_filename),
				"utf-8"
			)
		);

		bapUtils.ensureExecutionParametersJson_isWellFormed(this.bapExecutionParameters_);
		if (this.bapExecutionParameters_["target_browser"]["type"] === cdConstants.executionInitJson_remoteCdpBrowser_value) {
			if (this.bapExecutionParameters_["cd_api_server"] == null) { throw new Error(`"BapExecuteeResources :: the "cd_api_server" value is null in [execution-parameters.json]`); }
			if (this.bapExecutionParameters_["target_browser"]["cdp_endpoint"] == null) { throw new Error(`"BapExecuteeResources :: the "target_browser.cdp_endpoint" value is null in [execution-parameters.json]`); }
		}

	};

	// called pseudonymously as "now" for each bap step; eg: now `click the login button`
	public readonly describeCurrentBapStep = (_strings :string[], ... _interpolations :string[]) :void => {
		
		const _bapStepDescription :string = _interpolations.reduce(
			(_accumulate :string, _currentInterpolation :string, _index :number) => (
				_accumulate + _currentInterpolation + _strings[_index + 1]
			),
			_strings[0]
		);

		if (!this.completedBapSteps_descriptionsToInvocationCounts_.has(_bapStepDescription) ) {

			// it's the first time we've seen this bap step
			this.completedBapSteps_descriptionsToInvocationCounts_.set(_bapStepDescription, 1);

		} else {

			// we've seen this bap step before; increment...
			this.completedBapSteps_descriptionsToInvocationCounts_.set(
				_bapStepDescription,
				this.completedBapSteps_descriptionsToInvocationCounts_.get(_bapStepDescription)! + 1
			);

			// ...and ensure we're not exceeding `maxBapStepRepetitionCount`
			if (this.completedBapSteps_descriptionsToInvocationCounts_.get(_bapStepDescription)! > this.maxBapStepRepetitionCount_) {
				throw new Error(`Carpe-Datum has detected that the following bap-step has occured more than ${this.maxBapStepRepetitionCount_} times; this error is thrown to prevent an accidental infinite-loop. Step description: "${_bapStepDescription}"`);
			}

		}

		this.bapStepsExecuted_count_ += 1;
		
		const _executionStepMessage = `\t[step ${this.bapStepsExecuted_count_} of *]\t${_bapStepDescription}`;
		this.bapExecutionOutput_.push(_executionStepMessage);
		log.subinfo(_executionStepMessage);

		/*
			If [execution-parameters.json] indicates we're using a remote-cdp-browser,
			then POST the stage-message to the carpe-datum-api by which the
			remote-browser is hosted.
		*/

		if (this.bapExecutionParameters_["target_browser"]["type"] === cdConstants.executionInitJson_remoteCdpBrowser_value) {

			const _endpoint = new URL(
				`/api/browser-pool/${ (new URL(this.bapExecutionParameters_["target_browser"]["cdp_endpoint"])).port }/set-stage-message`,
				this.bapExecutionParameters_["cd_api_server"]
			);

			fetch(
				_endpoint,
				{
					method	: "POST",
					headers	: { "Content-Type" : "application/json" },
					body	: JSON.stringify({ "stage_message" : _executionStepMessage })
				}
			)
				.then(async (_res) => { if (!_res.ok) { throw new Error(`the api responded with a non-OK code (${_res.status}); ${await _res.text()}`); } })
				.catch(_fetchError => log.warn(`\ncouldn't POST stage-message to carpe-datum api, because ${(_fetchError as Error).stack}\n`))
			;

		}

	};

	// called pseudonymously as "fyi" to provide extra information; eg: fyi `confirmation pop-up didn't show`
	public readonly provideDebuggingInformation = (_strings :string[], ... _interpolations :string[]) :void => {
		
		const _debuggingInformationString :string = _interpolations.reduce(
			(_accumulate :string, _currentInterpolation :string, _index :number) => (
				_accumulate + _currentInterpolation + _strings[_index + 1]
			),
			_strings[0]
		);

		const _executionMessage = `\tfyi:\t\t${_debuggingInformationString}`;
		this.bapExecutionOutput_.push(_executionMessage);
		log.debug(_executionMessage);

	};

};

/*
	(↑) When called as a template-literal-tag function, eg...
		const tag = (strings, ...values) => values.reduce((acc, curr, i) => acc + curr + strings[i + 1], strings[0]);
		tag`hi guys ${22} is my fav number${"!"}`;
	
	...we receive the interpolation-delimited segments of the template string, and the interpolation-values,
	in two seperate arrays. Therefore, `reduce()` joins them back together.
*/