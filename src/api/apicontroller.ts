import express from "express";
import { MongoDb } from "../MongoDb";

interface TimeSheet {
    clock_in_date_time: string;
    clock_out_date_time: string;
}

interface Job {
    start_date: string;
    title: string;
    pay_rate: string;
    level: string;
}

export class ApiController {

    public async getHello(req: express.Request, res: express.Response): Promise<void> {
        let db = await MongoDb.client.connect(); //connect to mongo
        let dbo = db.db(MongoDb.database); //get our database
        
        // look in the collection EMPLOYEES for ONE emloyee with values {} (ex: {"employee_id":"000000000"})
        dbo.collection("employees").findOne({"employee_id":"000000000"}, (err:any, result:any) => {
            if (err) throw err;
            console.log(result);
            res.status(200).send(result);
            db.close();
        });
    }

    //Function that returns the pay and # of hours worked for a given employee ID between 2 dates
    //employeeID_in is the employee ID
    //startDate_in is the start date in milliseconds
    //endDate_in is the end date in milliseconds
    public async getEmployeesPay(req: express.Request, res: express.Response): Promise<void> {
        let in_employee_id = req.params.employeeID_in;
        let in_start_date = new Date(Number(req.params.startDate_in));
        let in_end_date = new Date(Number(req.params.endDate_in));

        let db = await MongoDb.client.connect(); //connect to mongo
        let dbo = db.db(MongoDb.database); //get our database

        //look in the collection EMPLOYEES for ONE employee with values {} (ex: {"employee_id":"000000000"})
        dbo.collection("employees").findOne({"employee_id":in_employee_id}, (err:any, result:any) => {
            if (err) throw err;
            var pay_dollars = 0;
            var time_hours = 0;
            var pay_rate = 0;
            result.logs.forEach((element: TimeSheet) => {
                console.log(element);
                var start_date = new Date(element.clock_in_date_time);
                var end_date = new Date(element.clock_out_date_time);
                console.log("in_start_date: " + in_start_date.getTime() + " \nin_end_date: " + in_end_date.getTime() + " \nstart_date: " + start_date.getTime() + " \nend_date: " + end_date.getTime());
                console.log(in_start_date <= end_date)
                if ((in_start_date <= end_date && start_date <= in_end_date)) {
                    var largerStart = 0;
                    var smallerEnd = 0;
                    if (start_date > in_start_date) {
                        largerStart = start_date.getTime();
                        console.log("largerStart: shift start")
                    } else {
                        largerStart = in_start_date.getTime();
                        console.log("largerStart: search start")
                    }
                    if (end_date < in_end_date) {
                        smallerEnd = end_date.getTime();
                        console.log("smallerEnd: shift end")
                    } else {
                        smallerEnd = in_end_date.getTime();
                        console.log("smallerEnd: search end")
                        
                    }
                    console.log("largerStart: " + largerStart + " \nsmallerEnd: " + smallerEnd);
                    let time_worked = (smallerEnd - largerStart) / 1000 / 60 / 60;
                    console.log("Time worked: " + time_worked);
                    time_hours += time_worked;
                    result.jobs.forEach((job: any) => {
                        var job_start_date = new Date(String(job.start_date));
                        if(start_date >= job_start_date) {
                            pay_rate = job.pay_rate;
                        }
                    });
                    pay_dollars += time_hours * pay_rate;
                }
            });
            res.status(200).send("Hours worked: " + time_hours + " Pay: $" + pay_dollars);
            db.close();
        });
}}