/*
	File:		* - misc. carpe-datum utility functions & objects
	Author:		Ben Mullan (c) 2024
*/

import * as log		from "./cd-logging";
import * as crypto	from "crypto";
import net			from "net";

export const waitForConsoleKeyPress = async (_msg :string = "press any key to continue...") :Promise<void> => {

	log.warn(_msg);
	process.stdin.setRawMode(true);

	return new Promise<void>(
		_resolve => process.stdin.once(
			"data",
			() => {
				process.stdin.setRawMode(false);
				_resolve();
			}
		)
	);

};

export const networkPortIsAvaliable = async (_port :number) :Promise<boolean> => new Promise(

	(_resolve, _reject) => {

		const _server = net.createServer();

		_server.once(
			"error",
			(_err :any) => {
				if (_err.code === "EADDRINUSE") { _resolve(false); }
				else { _reject(_err); }
			}
		);

		_server.once(
			"listening",
			() => {
				_server.close();
				_resolve(true);
			}
		);

		_server.listen(_port);

	}

);

export const findRandomAvaliableNetworkPort = async () :Promise<number> => {

	const _targetPortRange_start		= 5040;
	const _targetPortRange_end			= 15040;

	const _maxPortFindingAttempts		= 4000;
	const _currentPortFindingAttempt	= 1;
	

	while (_currentPortFindingAttempt <= _maxPortFindingAttempts) {
		const _targetPort = Math.floor(Math.random() * (_targetPortRange_end - _targetPortRange_start + 1)) + _targetPortRange_start;
		if (await networkPortIsAvaliable(_targetPort)) { return _targetPort; }
	}

	throw new Error(`No avaliable network port was found between ${_targetPortRange_start} and ${_targetPortRange_end}, in ${_maxPortFindingAttempts} attempts`);

};

// eg "a7f36fb23c9e"
export const getRandomMiniHash = () :string => crypto.randomBytes(6).toString("hex");

// eg sleep(500);
export const sleep = (_milliSeconds :number) => new Promise(_resolve => setTimeout(_resolve, _milliSeconds));