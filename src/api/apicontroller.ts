import express from "express";
import { MongoDb } from "../MongoDb";

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

    //Lookup by a user ID (Currently defaults to 00000000)
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


    public postHello(req: express.Request, res: express.Response): void {

    }
}