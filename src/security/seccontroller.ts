import express from "express";
import { MongoDb } from "../MongoDb";
import { SecUtils } from "../secutils";

export class SecController {

	public async login(req: express.Request, res: express.Response): Promise<void> {
        let {username, password} = req.body;
		if (!username || !password) {
			res.send({ status: 'error', data: 'username and password required' });
			return;
		}

		try {
			let db = (await MongoDb.client.connect());
			let usersTable = db.db(MongoDb.database).collection('users');
			const result = await usersTable.findOne({ username: username });
			if (!result) {
				res.status(403).send({ status: 'error', data: 'Invalid login' });
				return;
			}
			if (!await SecUtils.compareToHash(password, result.password)) {
				res.status(403).send({ status: 'error', data: 'Invalid login' });
				return;
			}
			// username and employee ID get sent in the token
			const token = SecUtils.getToken({ _id: result._id, username: username, employee_id: result._id });
			db.close();
			res.status(200).send({ status: 'ok', data: { token: token } });
		} catch (e) {
			console.error(e);
			res.status(500).send({ status: 'error', data: e });
		}
	}

	public async register(req: express.Request, res: express.Response): Promise<void> {
		let {username, password} = req.body;
		if (!username || !password) {
			res.send({ status: 'error', data: 'username and password required' });
			return;
		}

		try {
			const hash: string = await SecUtils.createHash(password);

			let db = (await MongoDb.client.connect());
			let usersTable = db.db(MongoDb.database).collection('users');
			let employeesTable = db.db(MongoDb.database).collection('employees');

			// check if username is in use
			let userResult:any = await usersTable.findOne({ username: username });
			if (userResult) {
				res.send({ status: 'error', data: 'Username in use' });
				return;
			}
			
			// create user in users table
			const userRecord = {
				username: username,
				password: hash,
			}; 
			userResult = await usersTable.insertOne(userRecord);

			// create employee in employees table
			// TODO - populate data for employee record
			const employeeRecord = {
				// user's _id is the employee id
				employee_id: userResult.insertedId.toString(),
				first_name: "first name",
				last_name: "last name",
				address: "my address",
				jobs: [{
					start_date: new Date(), // new employee starts today
					title: "job title",
					pay_rate: 123,
					level: "L1"
				}],
				manager_id: "manager's employee id",
				status: "Active",
				logs: [] // no logs for new employee
			};
			let employeeResult:any = await employeesTable.insertOne(employeeRecord);
			
			res.send({ status: 'ok', data: [userResult.insertedId, employeeResult.insertedId]});
		} catch (e) {
			console.error(e);
			res.send({ status: 'error', data: e });
		}
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