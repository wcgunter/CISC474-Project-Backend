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

    public async getUserLog(req: express.Request, res: express.Response): Promise<void> {
        let db = await MongoDb.client.connect(); //connect to mongo
        let dbo = db.db(MongoDb.database); //get our database
        
        dbo.collection("employees").findOne({"employee_id": req.params.id}, (err:any, result:any) => {
            if (err) throw err;
            
            try{
                res.status(200).send(result.logs);
                console.log(result.logs);
            } catch {
                res.status(200).send(result);
                console.log(result);
            }
            
            db.close();
        });
    }

    //Get all users for a specific manager id
    public async queryByManagerId(req: express.Request, res: express.Response): Promise<void> {
        let db = await MongoDb.client.connect(); //connect to mongo
        let dbo = db.db(MongoDb.database); //get our database
        
        dbo.collection("employees").find({"manager_id": req.params.id}).toArray((err:any, result:any) => {
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
                var start_date = new Date(element.clock_in_date_time);
                var end_date = new Date(element.clock_out_date_time);
                if ((in_start_date <= end_date && start_date <= in_end_date)) {
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
                    let time_worked = (smallerEnd - largerStart) / 1000 / 60 / 60;
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
    }

    // Function that adds/posts a clock event to the logs of a particular employee, 
    // given its employee id, clock in and clock out events as Parameters.
    // For example: employee_id = 000000000
    // clock_in : 2022-07-11T23:50:21.817Z
    // clock_out : 2022-07-11T23:59:21.817Z
    // clock_in and clock_out dates are in ISO format.
    public async addClockEvent(req: express.Request, res: express.Response): Promise<void> {
        let in_employee_id = req.params.employeeID_in;
        let in_clock_event = new Date(req.params.clock_in);
        let out_clock_event = new Date(req.params.clock_out);  
        console.log(in_clock_event);
        console.log(out_clock_event);
        try{ 
            let db = await MongoDb.client.connect();
            let dbo = db.db(MongoDb.database); 
            console.log("Pushed");
            dbo.collection("employees").updateOne({"employee_id":in_employee_id}, { $push: {"logs": {"clock_in_date_time": in_clock_event, "clock_out_date_time": out_clock_event} } });
            res.status(200).send("Done")
        }
        catch (err) {
            console.error(err);
            res.send(400).send('Server Error');
        }
    }

    // Function that deletes a clock event from the array of logs of a particular employee, 
    // given its employee id, clock in and clock out events as Parameters.
    // For example: employee_id = 000000000
    // clock_in : 2022-07-11T23:50:21.817Z
    // clock_out : 2022-07-11T23:59:21.817Z
    // clock_in and clock_out dates are in ISO format.
    public async deleteClockEvent(req: express.Request, res: express.Response) : Promise<void>{
        let in_employee_id = req.params.employeeID_in;
        let in_clock_event = new Date(req.params.clock_in);
        let out_clock_event = new Date(req.params.clock_out);
        console.log(in_clock_event);
        console.log(out_clock_event);
        try{ 
            let db = await MongoDb.client.connect();
            let dbo = db.db(MongoDb.database);
            dbo.collection("employees").updateOne({"employee_id":in_employee_id}, {$pull: {"logs" : {"clock_in_date_time" : in_clock_event, "clock_out_date_time": out_clock_event}}});
            res.status(200).send("Deleted");
            console.log("Deleted");
        }
        catch (err) {
            console.error(err);
            res.send(400).send('Server Error');
        }
    }

    // Function that edits a clock event from the array of logs of a particular employee
    // by replacing that event with the new clock event, 
    // given its employee id, the clock in and clock out events to be edited and the new clock-in and clock-out values.
    // For example: employee_id = 000000000
    // original_clock_in : 2022-07-11T23:50:21.817Z
    // origianal_clock_out : 2022-07-11T23:59:21.817Z
    // new_clock_in : 2022-07-15T23:50:21.817Z
    // new_clock_out : 2022-07-15T23:59:21.817Z
    // clock_in and clock_out dates are in ISO format.
    public async replaceClockEvent(req: express.Request, res: express.Response) : Promise<void>{
        let in_employee_id = req.params.employeeID_in;
        let original_in_clock_event = new Date(req.params.original_clock_in);
        let original_out_clock_event = new Date(req.params.original_clock_out);
        let new_in_clock_event = new Date(req.params.new_clock_in);
        let new_out_clock_event = new Date(req.params.new_clock_out);

        console.log(original_in_clock_event);
        console.log(original_out_clock_event);

        console.log(new_in_clock_event);
        console.log(new_out_clock_event);

        try{ 
            let db = await MongoDb.client.connect(); 
            let dbo = db.db(MongoDb.database);
            dbo.collection("employees").updateOne({"employee_id":in_employee_id, "logs" : {"clock_in_date_time" : original_in_clock_event, "clock_out_date_time": original_out_clock_event}}, {$set: {"logs.$" : {"clock_in_date_time" : new_in_clock_event, "clock_out_date_time": new_out_clock_event}}});
            res.status(200).send("put");
            console.log("put");
        }
        catch (err) {
            console.error(err);
            res.send(400).send('Server Error');
        }
    }
}