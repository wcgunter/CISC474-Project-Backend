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

    public async getEmployeeLogs(req: express.Request, res: express.Response): Promise<void> {
        let db = await MongoDb.client.connect(); //connect to mongo
        let dbo = db.db(MongoDb.database); //get our database
        
        dbo.collection("employees").findOne({"employee_id": req.body.employee_id}, (err:any, result:any) => {
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
    public async getEmployees(req: express.Request, res: express.Response): Promise<void> {
        let db = await MongoDb.client.connect(); //connect to mongo
        let dbo = db.db(MongoDb.database); //get our database

        // manager id is retrieved from the body, which is populated with security
        dbo.collection("employees").find({"manager_id": req.body.employee_id}).toArray((err:any, result:any) => {
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
        let employee_id = req.body.employee_id;
        let in_start_date = new Date(Number(req.params.startDate));
        let in_end_date = new Date(Number(req.params.endDate));
        let db = await MongoDb.client.connect(); //connect to mongo
        let dbo = db.db(MongoDb.database); //get our database

        //look in the collection EMPLOYEES for ONE employee with values {} (ex: {"employee_id":"000000000"})
        dbo.collection("employees").findOne({"employee_id":employee_id}, (err:any, result:any) => {
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
    // given its employee id, clock time, clock event (in or out), and the ID of the clock event
    // 2022-07-11T23:50:21.817Z
    public async addClockEvent(req: express.Request, res: express.Response): Promise<void> {
        let employee_id = req.body.employee_id;
        let clock_time = new Date(req.body.clock_time);
        let clock_event = req.body.clock_event; // 'in' or 'out'
        let clock_id = req.body.clock_id;  

        try{ 
            let db = await MongoDb.client.connect();
            let dbo = db.db(MongoDb.database); 

            if (clock_event === 'in'){

                // make sure the clock-in event doesn't exist
                let clockEvent = await dbo.collection('employees').find(
                    { "employee_id": employee_id, "logs": { $elemMatch: { 'clock_id': clock_id } } },
                    { projection: {'logs.$': 1 }}).toArray();

                if(clockEvent[0]?.logs[0]){
                    res.status(400).send("Error - clock event exists. Cannot clock in");
                    return;
                }

                // push new clock event with clock-in time
                let response = await dbo.collection("employees").updateOne(
                    {"employee_id": employee_id}, 
                    { $push: {"logs": {'clock_in_date_time': clock_time, 'clock_id': clock_id} } }
                );
                
                console.log(response);
                
            } else if (clock_event === 'out'){

                // make sure the clock-out event does not exist
                let clockEvent = await dbo.collection('employees').find(
                    { "employee_id": employee_id, "logs": { $elemMatch: { 'clock_id': clock_id } } },
                    { projection: {'logs.$': 1 }}).toArray();

                if (clockEvent[0]?.logs[0].clock_out_date_time){
                    res.status(400).send("Error - clock event exists. Cannot clock out");
                    return;
                }

                // set the clock_out_date_time on the log
                let response = await dbo.collection("employees").updateOne(
                    {"employee_id": employee_id, "logs":{ $elemMatch: { 'clock_id': clock_id } }}, 
                    { $set: {"logs.$.clock_out_date_time": clock_time } }
                );

                console.log(response);
            }
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
        let employee_id = req.body.employee_id;
        let clock_id = req.body.clock_id;

        try{ 
            let db = await MongoDb.client.connect();
            let dbo = db.db(MongoDb.database);
            dbo.collection("employees").updateOne(
                {"employee_id":employee_id}, 
                {$pull: {'logs' : {"clock_id": clock_id}}});

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
    // given its employee id, the clock_id for the clock event to edit, and the clock times to set.
    public async replaceClockEvent(req: express.Request, res: express.Response) : Promise<void>{
        let employee_id = req.body.employee_id;
        let clock_id = req.body.clock_id;
        let clock_in_time = new Date(req.body.clock_in_time);
        let clock_out_time = new Date(req.body.clock_out_time);

        try{ 
            let db = await MongoDb.client.connect(); 
            let dbo = db.db(MongoDb.database);
            dbo.collection("employees").updateOne(
                {"employee_id":employee_id,  "logs":{ $elemMatch: { 'clock_id': clock_id } }}, 
                {$set: {"logs.$" : {"clock_in_date_time" : clock_in_time, "clock_out_date_time": clock_out_time, "clock_id": clock_id}}}
            );
            res.status(200).send("updated clock event");
            console.log("put");
        }
        catch (err) {
            console.error(err);
            res.send(400).send('Server Error');
        }
    }
}