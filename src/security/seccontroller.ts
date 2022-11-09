import express from "express";
import { Db, ObjectId } from "mongodb";
import { MongoDb } from "../MongoDb";
import { SecUtils } from "../secutils";
import { Employee } from "../types";


export class SecController {
	
	/**
     * Authenticate an employee
     * @body username
	 * @body password
     * @returns auth token
     */
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
			// employee ID gets sent in the token
			const token = SecUtils.getToken({ _id: result._id, employee_id: result._id });
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

	/**
     * Terminate an employee and delete the user object
     * @body employee_id (populated via secutils) - id of the manager of the employee to terminate
	 * @body user.employee_id - the employee_id of the employee to terminate
     * @returns result
     */
	public async removeUser(req: express.Request, res: express.Response): Promise<void> {
        let db = await MongoDb.client.connect(); //connect to mongo
        let dbo = db.db(MongoDb.database); //get our database

		// employee_id = id of employee to remove, sent in body
		let target = req.body.user.employee_id;
		// manager_id = id of authenticated user
		let manager_id = req.body.employee_id;

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

	/**
     * Register a new user and create a new employee
     * @body employee_id (populated via secutils) - this is the id of the manager creating a new employee
	 * @body username - username of new user
	 * @body password - password of new user
	 * @body fisrt_name - FN of employee
	 * @body last_name - LN of employee
	 * @body address - address of employee
	 * @body job_title - starting job title
	 * @body hourly_pay - employee starting pay
	 * @body job_level - L1/L2... level of new employee
	 * 
     * @returns employee_id of the new employee
     */
	public async register(req: express.Request, res: express.Response): Promise<void> {
        let db = await MongoDb.client.connect(); //connect to mongo
        let dbo = db.db(MongoDb.database); //get our database

		let manager_id = req.body.employee_id;

		let newUser:any = {
			username : req.body.username,
			password : await SecUtils.createHash(req.body.password),
			admin : req.body.admin
		}

		let newEmployee:any = {
			first_name: req.body.first_name,
			last_name : req.body.last_name,
			address : req.body.address,
			jobs: [{
					start_date: new Date(), // new employee starts today
					title: req.body.job_title,
					pay_rate: req.body.pay_rate,
					level: req.body.job_level
			}],
			manager_id: manager_id,
			status: "Active",
		}

		//checks if there is an admin with that username
		dbo.collection('users').findOne({ _id: new ObjectId(req.body.employee_id) }).then((adminResult: any) => {
			//checks if the user has admin access
			if (adminResult?.admin){
				//inserts user into the users table
				dbo.collection("users").insertOne(newUser).then((userResult) => {
					if(userResult.acknowledged){
						//tries to insert employee into the employees table
						newEmployee.employee_id = userResult.insertedId.toString();
						dbo.collection('employees').insertOne({_id:userResult.insertedId, ...newEmployee}).then((employeeResult) => {
							if (employeeResult.acknowledged){
								return res.status(201).send({'user': userResult, 'employee' : employeeResult});
							}else{
							//employee result was not acknowledged
								return res.status(500).send({'employees': employeeResult})
							}
						}).catch((e) => {
							return res.status(500).send({'user': userResult, 'employee' : e})
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