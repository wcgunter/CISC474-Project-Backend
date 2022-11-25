import { Double } from "mongodb"

export interface Employee {
	first_name: String,
	last_name: String,
	address: String,
	employee_id?: String,
	jobs: [{
			start_date: Date,
			title: String,
			pay_rate: Double,
			level: String
	}],
	manager_id: String,
	status: String,
	logs?: [{
		clock_in_date_time: Date,
		clock_out_date_time: Date,
		clock_id: Number
	}] 
}

export interface TimeSheet {
    clock_in_date_time: string;
    clock_out_date_time: string;
}

export interface FullTimesheet {
	position: number;
	clockIn: string;
	clockOut: string;
	hoursWorked: number;
	pay: number;
}

export interface Job {
    start_date: string;
    title: string;
    pay_rate: string;
    level: string;
}
