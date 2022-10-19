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


    public postHello(req: express.Request, res: express.Response): void {

    }
}