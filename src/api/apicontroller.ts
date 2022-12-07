import express from "express";
import { MongoDb } from "../MongoDb";
import { TimeSheet, FullTimesheet } from "../types";

export class ApiController {
	/**
	 * Get the list of clock logs for the authenticated employee
	 * @body employee_id (populated via secutils)
	 * @returns list of clock logs
	 */
	public async getEmployeeLogs(
		req: express.Request,
		res: express.Response
	): Promise<void> {
		let db = await MongoDb.client.connect(); //connect to mongo
		let dbo = db.db(MongoDb.database); //get our database

		dbo.collection("employees").findOne(
			{ employee_id: req.body.employee_id },
			(err: any, result: any) => {
				if (err) throw err;

				console.log(result.logs);
				db.close();
				res.status(200).send({ status: "ok", data: result.logs });
			}
		);
	}

	public async getEmployeeName(
		req: express.Request,
		res: express.Response
	): Promise<void> {
		let db = await MongoDb.client.connect(); //connect to mongo
		let dbo = db.db(MongoDb.database); //get our database

		dbo.collection("employees").findOne(
			{ employee_id: req.body.employee_id },
			(err: any, result: any) => {
				if (err) throw err;
				db.close();
				res.status(200).send({ status: "ok", data: result.first_name });
			}
		);
	}

	/**
	 * Get the list of employees under the authenticated manager
	 * @body employee_id (populated via secutils)
	 * @returns list of employee ids
	 */
	public async getEmployees(
		req: express.Request,
		res: express.Response
	): Promise<void> {
		let db = await MongoDb.client.connect(); //connect to mongo
		let dbo = db.db(MongoDb.database); //get our database

		// manager id is retrieved from the body, which is populated with security
		dbo.collection("employees")
			.find({ manager_id: req.body.employee_id })
			.toArray((err: any, result: any) => {
				if (err) throw err;
				console.log(result);
				db.close();
				res.status(200).send({ status: "ok", data: result });
			});
	}

	/**
	 * Get the hours worked and pay for the authenticated employee
	 *  in a given time frame
	 * @body employee_id (populated via secutils)
	 * @param startDate - start of time period in ms
	 * @param endDate - end of time period in ms
	 * @returns hours worked and pay
	 */
	public async getEmployeesPay(
		req: express.Request,
		res: express.Response
	): Promise<void> {
		let employee_id = req.body.employee_id;
		let in_start_date = new Date(Number(req.params.startDate));
		let in_end_date = new Date(Number(req.params.endDate));
		let db = await MongoDb.client.connect(); //connect to mongo
		let dbo = db.db(MongoDb.database); //get our database

		dbo.collection("employees").findOne(
			{ employee_id: employee_id },
			(err: any, result: any) => {
				if (err) throw err;
				var pay_dollars = 0;
				var time_hours = 0;
				var pay_rate = 0;
				if (result.logs != null) {
					result.logs.forEach((element: TimeSheet) => {
						var start_date = new Date(
							element.clock_in_date_time
						);
						var end_date = new Date(
							element.clock_out_date_time
						);
						if (
							in_start_date <= end_date &&
							start_date <= in_end_date
						) {
							var largerStart = 0;
							var smallerEnd = 0;
							if (start_date > in_start_date) {
								largerStart = start_date.getTime();
							} else {
								largerStart = in_start_date.getTime();
							}
							if (end_date < in_end_date) {
								smallerEnd = end_date.getTime();
							} else {
								smallerEnd = in_end_date.getTime();
							}
							let time_worked =
								(smallerEnd - largerStart) /
								1000 /
								60 /
								60;
							time_hours += time_worked;
							result.jobs.forEach((job: any) => {
								var job_start_date = new Date(
									String(job.start_date)
								);
								if (start_date >= job_start_date) {
									pay_rate = job.pay_rate;
								}
							});
							pay_dollars += time_hours * pay_rate;
						}
					});
				}
				db.close();
				res.status(200).send({
					status: "ok",
					data: { hours_worked: time_hours, pay: pay_dollars },
				});
			}
		);
	}

	/**
	 * Get the hours worked and pay for the authenticated employee
	 *  in a given time frame
	 * @body employee_id (populated via secutils)
	 * @param startDate - start of time period in ms
	 * @param endDate - end of time period in ms
	 * @returns Json object with collection of Log objects
	 */
	public async getEmployeeTimesheet(
		req: express.Request,
		res: express.Response
	): Promise<void> {
		let employee_id = req.body.employee_id;
		let in_start_date = new Date(Number(req.params.startDate));
		let in_end_date = new Date(Number(req.params.endDate));
		let db = await MongoDb.client.connect(); //connect to mongo
		let dbo = db.db(MongoDb.database); //get our database

		let outputTimesheets: FullTimesheet[] = [];

		const firstTimesheet: FullTimesheet = {
			position: -1,
			clockIn: Date(),
			clockOut: Date(),
			hoursWorked: 0,
			pay: 0,
		};

		outputTimesheets.push(firstTimesheet);

		dbo.collection("employees").findOne(
			{ employee_id: employee_id },
			(err: any, result: any) => {
				if (err) throw err;
				var position = 1;
				if (result.logs != null) {
					result.logs.forEach((element: TimeSheet) => {
						var pay_dollars = 0;
						var time_hours = 0;
						var pay_rate = 0;
						var start_date = new Date(
							element.clock_in_date_time
						);
						var end_date = new Date(
							element.clock_out_date_time
						);
						if (
							in_start_date <= end_date &&
							start_date <= in_end_date
						) {
							var largerStart = 0;
							var smallerEnd = 0;
							if (start_date > in_start_date) {
								largerStart = start_date.getTime();
							} else {
								largerStart = in_start_date.getTime();
							}
							if (end_date < in_end_date) {
								smallerEnd = end_date.getTime();
							} else {
								smallerEnd = in_end_date.getTime();
							}
							let time_worked =
								(smallerEnd - largerStart) /
								1000 /
								60 /
								60;
							time_hours += time_worked;
							result.jobs.forEach((job: any) => {
								var job_start_date = new Date(
									String(job.start_date)
								);
								if (start_date >= job_start_date) {
									pay_rate = job.pay_rate;
								}
							});
							let clock_in_date_obj = new Date(
								largerStart
							);
							let clock_out_date_obj = new Date(
								smallerEnd
							);
							let clock_in_date =
								clock_in_date_obj.toLocaleString("en-US", {timeStyle: "medium", dateStyle: "short", timeZone: "UTC"});
							let clock_out_date =
								clock_out_date_obj.toLocaleString("en-US", {timeStyle: "medium", dateStyle: "short", timeZone: "UTC"});
							pay_dollars += time_hours * pay_rate;
							pay_dollars = Math.round(pay_dollars * 100) / 100;
							time_hours = Math.round(time_hours * 100) / 100;
							const newTimesheet: FullTimesheet = {
								position: position,
								clockIn: clock_in_date,
								clockOut: clock_out_date,
								hoursWorked: time_hours,
								pay: pay_dollars,
							};
							outputTimesheets.push(newTimesheet);
							position++;
						}
					});
					db.close();
					res.status(200).send({
						status: "ok",
						data: outputTimesheets,
					});
				}
			}
		);
		/* let employee_id = req.body.employee_id;
        let in_start_date = new Date(Number(req.params.startDate));
        let in_end_date = new Date(Number(req.params.endDate));
        let db = await MongoDb.client.connect(); //connect to mongo
        let dbo = db.db(MongoDb.database); //get our database
        let output: TimeSheet[] = [];

        dbo.collection("employees").findOne({"employee_id":employee_id}, (err:any, result:any) => {
            if (err) throw err;
            var pay_dollars = 0;
            var time_hours = 0;
            var pay_rate = 0;
            result.logs.forEach((element: TimeSheet) => {
                var start_date = new Date(element.clock_in_date_time);
                var end_date = new Date(element.clock_out_date_time);
                if ((in_start_date <= end_date && start_date <= in_end_date)) {
                    output.push(element);
                }
            });
            db.close();
            res.status(200).send({status: 'ok', data: {output}});
        }); */
	}

	/**
	 * Posts a new clock event for the authenticated employee
	 *  Creates new log object for 'in' events and
	 *  adds field clock_out_date_time for 'out' events
	 * @body employee_id
	 * @body clock_time - time as a date string (ex: 2022-07-11T23:50:21.817Z)
	 * @body clock_event - in/out
	 * @body clock_id
	 * @returns status - if clock event is added
	 */
	public async postClockEvent(
		req: express.Request,
		res: express.Response
	): Promise<void> {
		let employee_id = req.body.employee_id;
		let clock_time = new Date(req.body.clock_time);
		let clock_event = req.body.clock_event; // 'in' or 'out'
		let clock_id = req.body.clock_id;

		try {
			let db = await MongoDb.client.connect();
			let dbo = db.db(MongoDb.database);

			if (clock_event === "in") {
				// make sure the clock-in event doesn't exist
				let clockEvent = await dbo
					.collection("employees")
					.find(
						{
							employee_id: employee_id,
							logs: { $elemMatch: { clock_id: clock_id } },
						},
						{ projection: { "logs.$": 1 } }
					)
					.toArray();

				if (clockEvent[0]?.logs[0]) {
					db.close();
					res.status(400).send({
						status: "error",
						data: "Error - clock event exists. Cannot clock in",
					});
					return;
				}

				// push new clock event with clock-in time
				let response = await dbo.collection("employees").updateOne(
					{ employee_id: employee_id },
					{
						$push: {
							logs: {
								clock_in_date_time: clock_time,
								clock_id: clock_id,
							},
						},
					}
				);

				db.close();

				console.log(response);
				if (response.modifiedCount > 0)
					res.status(200).send({
						status: "ok",
						data: "Inserted clock event",
					});
				else
					res.status(400).send({
						status: "error",
						data: "Failed to insert clock event",
					});
			} else if (clock_event === "out") {
				// make sure the clock-out event does not exist
				let clockEvent = await dbo
					.collection("employees")
					.find(
						{
							employee_id: employee_id,
							logs: { $elemMatch: { clock_id: clock_id } },
						},
						{ projection: { "logs.$": 1 } }
					)
					.toArray();

				if (clockEvent[0]?.logs[0].clock_out_date_time) {
					db.close();
					res.status(400).send({
						status: "error",
						data: "Error - clock event exists. Cannot clock out",
					});
					return;
				}

				// set the clock_out_date_time on the log
				let response = await dbo.collection("employees").updateOne(
					{
						employee_id: employee_id,
						logs: { $elemMatch: { clock_id: clock_id } },
					},
					{
						$set: {
							"logs.$.clock_out_date_time": clock_time,
						},
					}
				);

				db.close();

				console.log(response);
				if (response.modifiedCount > 0)
					res.status(200).send({
						status: "ok",
						data: "Inserted clock event",
					});
				else
					res.status(400).send({
						status: "error",
						data: "Failed to insert clock event",
					});
			}
		} catch (err) {
			console.error(err);
			res.send(500).send({
				status: "error",
				data: "Internal Server Error",
			});
		}
	}

	/**
	 * Deletes a clock event for the authenticated employee
	 * @body employee_id
	 * @body clock_id
	 * @returns status - if clock event is deleted
	 */
	public async deleteClockEvent(
		req: express.Request,
		res: express.Response
	): Promise<void> {
		let employee_id = req.body.employee_id;
		let clock_id = req.body.clock_id;

		try {
			let db = await MongoDb.client.connect();
			let dbo = db.db(MongoDb.database);
			let response = await dbo
				.collection("employees")
				.updateOne(
					{ employee_id: employee_id },
					{ $pull: { logs: { clock_id: clock_id } } }
				);

			db.close();

			console.log(response);
			if (response.modifiedCount > 0)
				res.status(200).send({
					status: "ok",
					data: "deleted clock event",
				});
			else
				res.status(400).send({
					status: "error",
					data: "Failed to delete clock event",
				});
		} catch (err) {
			console.error(err);
			res.send(500).send({
				status: "error",
				data: "Internal Server Error",
			});
		}
	}

	/**
	 * Puts/edits a clock event for the authenticated employee
	 * @body employee_id
	 * @body clock_id
	 * @body clock_in_time - time to set as clock in (date string)
	 * @body clock_out_time - time to set as clock out (date string)
	 * @returns status - if clock event is updated
	 */
	public async putClockEvent(
		req: express.Request,
		res: express.Response
	): Promise<void> {
		let employee_id = req.body.employee_id;
		let clock_id = req.body.clock_id;
		let clock_in_time = new Date(req.body.clock_in_time);
		let clock_out_time = new Date(req.body.clock_out_time);

		try {
			let db = await MongoDb.client.connect();
			let dbo = db.db(MongoDb.database);
			let response = await dbo.collection("employees").updateOne(
				{
					employee_id: employee_id,
					logs: { $elemMatch: { clock_id: clock_id } },
				},
				{
					$set: {
						"logs.$": {
							clock_in_date_time: clock_in_time,
							clock_out_date_time: clock_out_time,
							clock_id: clock_id,
						},
					},
				}
			);

			db.close();

			console.log(response);
			if (response.modifiedCount > 0)
				res.status(200).send({
					status: "ok",
					data: "Updated clock event",
				});
			else
				res.status(400).send({
					status: "error",
					data: "Failed to update clock event",
				});
		} catch (err) {
			console.error(err);
			res.status(500).send({
				status: "error",
				data: "Internal Server Error",
			});
		}
	}
}
