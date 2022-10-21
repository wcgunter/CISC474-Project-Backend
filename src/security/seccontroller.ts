import express from "express";
import { MongoDb } from "../MongoDb";

export class SecController {

	public async login(req: express.Request, res: express.Response): Promise<void> {
        res.send('login endpoint');
	}

	public async register(req: express.Request, res: express.Response): Promise<void> {
		res.send('register endpoint');
	}

	public async changePwd(req: express.Request, res: express.Response): Promise<void> {
        res.send('change password endpoint');
    }

	public async removeUser(req: express.Request, res: express.Response): Promise<void> {
        let db = await MongoDb.client.connect(); //connect to mongo
        let dbo = db.db(MongoDb.database); //get our database
        
        // look in the collection EMPLOYEES for ONE emloyee with values {} (ex: {"employee_id":"000000000"})
        dbo.collection("employees").findOneAndDelete({"employee_id":req.body.id}).then((result) => {
			if (!result.ok){
				res.status(500).send("Not able to find and Delete");
			}else if(result.value == null){
				res.status(404).send("Employee ID not found");
			}else{
				res.status(200).send(result.value);
			}
		})
	
	}

	public async registerUser(req: express.Request, res: express.Response): Promise<void> {
        let db = await MongoDb.client.connect(); //connect to mongo
        let dbo = db.db(MongoDb.database); //get our database
        
        // look in the collection EMPLOYEES for ONE emloyee with values {} (ex: {"employee_id":"000000000"})
        dbo.collection("employees").insertOne(req.body).then((result) => {
			if(result.acknowledged){
				return res.status(200).send(result.insertedId);
			}else{
				return res.status(500).send("Some odd reason")
			}
		}).catch((e)=>{
			if(e.code == "11000"){
				res.status(302).send("Employee ID already exists")
			}
		})
	
	}

}