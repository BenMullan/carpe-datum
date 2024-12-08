/*
	File:		* - carpe-datum application-programming-interface datatypes
	Author:		Ben Mullan (c) 2024
*/

export type LongPollingResponse<TResponseData> = {
	request_timed_out	:boolean,
	response_data?		:TResponseData
};

export type Bap = {
	name								:string,
	bap_folder_created_timestamp		:number,
	executions							:BapExecution[]
};

export type BapExecution = {
	execution_id						:string,
	status								:"running"|"dormant",
	execution_folder_created_timestamp	:number,
	execution_error						:string|null,
	execution_result					:Record<string, any>|null
};

export type BrowserPoolBrowser = {
	process_pid							:number,
	user_data_dir						:string,
	remote_debugging_port				:number,
	current_executee					:{ bap_name :string, current_execution_stage :string|null }|null
};