/*
	File:		* - misc. carpe-datum logging functions
	Author:		Ben Mullan (c) 2024
*/

import chalk from "chalk";

let outputVerboseLogMessages :boolean = false;
export const set_outputVerboseLogMessages = (_value :boolean) => outputVerboseLogMessages = _value;

export const info = (_message :string, ...objects :any[]) :void => {
	console.info(chalk.blue(_message), ...objects);
};

export const subinfo = (_message :string, ...objects :any[]) :void => {
	console.info("\t", chalk.blueBright(_message), ...objects);
};

export const debug = (_message :string, ...objects :any[]) :void => {
	console.debug("\t", chalk.green(_message), ...objects);
};

export const verbose = (_message :string, ...objects :any[]) :void => {
	outputVerboseLogMessages && console.debug(chalk.greenBright(_message), ...objects);
};

export const warn = (_message :string, ...objects :any[]) :void => {
	console.warn("→", chalk.yellow(_message), ...objects);
};

export const error = (_message :string, ...objects :any[]) :void => {
	console.error("→", chalk.red(_message), ...objects);
};