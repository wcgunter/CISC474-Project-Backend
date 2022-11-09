import express from "express";
import { Db, ObjectId } from "mongodb";
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

	public async changePwd(req: express.Request, res: express.Response): Promise<void> {
        res.send('change password endpoint');
    }

	public async removeUser(req: express.Request, res: express.Response): Promise<void> {
        let db = await MongoDb.client.connect(); //connect to mongo
        let dbo = db.db(MongoDb.database); //get our database

		let target = req.body.user.employee_id

		//checks if there is an admin with that username
		dbo.collection('users').findOne({ _id: new ObjectId(req.body.employee_id) }).then((existingUser: any) => {
			//checks if the user has admin access
			if (existingUser?.admin){
				dbo.collection('employees').findOneAndUpdate({employee_id: target}, {$set :{status: "Terminated"}}).then((employeeResult) => {
					if (!employeeResult.ok){
						return res.status(500).send({'employee': employeeResult})
					}else if (!employeeResult.value){
						return res.status(404).send({'employee': 'Employee ID not found'})
					}else{
						dbo.collection('users').findOneAndDelete({employee_id: target}).then((userResult) => {
							if (userResult.ok){
								return res.status(200).send({'user' : userResult.value, 'employee': employeeResult.value})
							}else{
								return res.status(500).send({'user' : userResult, 'employee': employeeResult})
							}
						})
					}
				})
			}else{
				return res.status(403).send({ status: 'error', data: 'Invalid login' });
			}
		})	
	}

	public async register(req: express.Request, res: express.Response): Promise<void> {
        let db = await MongoDb.client.connect(); //connect to mongo
        let dbo = db.db(MongoDb.database); //get our database

		let newUser:any = {
			email : req.body.user.email,
			username : req.body.user.username,
			password : await SecUtils.createHash(req.body.user.password),
			employee_id : req.body.user.employee_id,
			admin : req.body.employee.admin
		}

		let newEmployee:any = {
			first_name: req.body.employee.first_name,
			last_name : req.body.employee.last_name,
			address : req.body.employee.address,
			employee_id : req.body.user.employee_id,
			jobs: [{
					start_date: new Date(), // new employee starts today
					title: req.body.employee.job.title,
					pay_rate: req.body.employee.job.pay_rate,
					level: req.body.employee.job.level
			}],
			manager_id: req.body.employee.manager_id,
			status: "Active",
			logs: [] // no logs for new employee

		}

		//checks if there is an admin with that username
		dbo.collection('users').findOne({ _id: new ObjectId(req.body.employee_id) }).then((adminResult: any) => {
			//checks if the user has admin access
			if (adminResult?.admin){
				//inserts user into the users table
				dbo.collection("users").insertOne(newUser).then((userResult) => {
					if(userResult.acknowledged){
						//tries to insert employee into the employees table 
						dbo.collection('employees').insertOne(newEmployee).then((employeeResult) => {
							if (employeeResult.acknowledged){
								return res.status(201).send({'user': userResult, 'employee' : employeeResult});
							}else{
							//employee result was not acknowledged
								return res.status(500).send({'employees': employeeResult})
							}
						}).catch((e) => {
							//this code means that the key already exist
							if (e.code == '11000'){
								dbo.collection('employees').findOneAndUpdate({employee_id : newEmployee.employee_id}, {$set : {status : 'Active'}, $push: {jobs : newEmployee.jobs[0]}}).then(() => {
									return res.status(201).send({'user': userResult, 'employee': "Updated the existing employee with the employee_id"});
								})		
							}else{
								//some other employees table error
								return res.status(500).send({'user': userResult, 'employee' : e})
							}
						})
					}else{
						//user result was not acknowledged
						return res.status(500).send(userResult);
					}
				}).catch((e)=>{
					if(e.code == "11000"){
						return res.status(302).send("Employee ID in user table already exists")
					}
				})
			}else{
				return res.status(403).send({ status: 'error', data: 'No Admin Access', result: adminResult});
			}
		})
	}
	public async updateEmployee(req: express.Request, res: express.Response): Promise<void> {
		let db = await MongoDb.client.connect(); //connect to mongo
        let dbo = db.db(MongoDb.database); //get our database

		let updatedEmployee:any = {}

		for (const key of Object.keys(req.body)){
			updatedEmployee[key] = req.body[key];
		}

		dbo.collection("users").findOne({_id : new ObjectId(req.body.employee_id)}).then((adminResult) => {
			if (adminResult?.admin){
				dbo.collection("employees").findOneAndUpdate({employee_id: updatedEmployee.employee_id}, {$set: updatedEmployee}).then((employeeResult) => {
					if (!employeeResult.ok){
						return res.status(500).send(employeeResult)
					}else if (!employeeResult.value){
						return res.status(404).send({'employee': 'Employee ID not found'})
					}else{
						return res.status(200).send(employeeResult)
					}
				})
			}else{
				return res.status(403).send({ status: 'error', data: 'No Admin Access', result: adminResult});
			}
		})
	}

	public async updateUser(req: express.Request, res: express.Response): Promise<void> {
		let db = await MongoDb.client.connect(); //connect to mongo
        let dbo = db.db(MongoDb.database); //get our database

		let updatedUser:any = {}

		for (const key of Object.keys(req.body.user)){
			updatedUser[key] = req.body.user[key];
		}

		dbo.collection("users").findOne({_id : new ObjectId(req.body.employee_id)}).then((adminResult) => {
			if (adminResult?.admin){
				dbo.collection("users").findOneAndUpdate({employee_id: updatedUser.employee_id}, {$set: updatedUser}).then((userResult) => {
					if (!userResult.ok){
						return res.status(500).send(userResult)
					}else if (!userResult.value){
						return res.status(404).send({'employee': 'Employee ID not found'})
					}else{
						return res.status(200).send(userResult)
					}
				})
			}else{
				return res.status(403).send({ status: 'error', data: 'No Admin Access', result: adminResult});
			}
		})
	}
}