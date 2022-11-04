import express from "express";
import { ObjectId } from "mongodb";
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
		let employee_id = req.body.user.employee_id;
		// manager_id = id of authenticated user
		let manager_id = req.body.employee_id;

		//checks if the authenticated user is an admin
		dbo.collection('employees').findOne({ employee_id: manager_id}).then(async (manager:any) => {
			//checks if the user has admin access
			if (manager?.admin){
				let employeeResult = await dbo.collection('employees').findOneAndUpdate({employee_id: employee_id}, {$set :{status: "Terminated"}});
				if (!employeeResult.ok)
					return res.status(404).send({status: 'error', data: `Employee ID ${employee_id} not found`})
				
				let userResult = await dbo.collection('users').findOneAndDelete({_id: new ObjectId(employee_id)});
				if (!userResult.ok)
					return res.status(500).send({status: 'error', data: `Internal Server Error - employee marked as terminated, user not deleted`});

				return res.status(200).send({'user' : userResult.value, 'employee': employeeResult.value});

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

		// the authenticated user calling this endpoint is the manager
		let manager_id = req.body.employee_id;

		// check if username is in use
		let userResult:any = await dbo.collection("users").findOne({ username: req.body.username });
		if (userResult) {
			res.send({ status: 'error', data: 'Username in use' });
			return;
		}

		// create new user object
		let newUser = {
			username : req.body.username,
			password : await SecUtils.createHash(req.body.password),
		}

		// create new employee object
		let newEmployee: Employee = {
			first_name: req.body.first_name,
			last_name : req.body.last_name,
			address : req.body.address,
			jobs: [{
					start_date: new Date(), // new employee starts today
					title: req.body.job_title,
					pay_rate: req.body.hourly_rate,
					level: req.body.job_level
			}],
			manager_id: manager_id,
			status: "Active",
		}

		//checks if there is an authenticated admin to create the user
		dbo.collection('employees').findOne({ employee_id: manager_id }).then(async (manager:any) => {
			//checks if the user has admin access
			if (manager?.admin){
				// insert user into the users table
				userResult = await dbo.collection("users").insertOne(newUser);
				if (!userResult.acknowledged){
					return res.send({ status: 'error', data: "Internal Server Error - failed to insert user"});
				}
				// set employee id to the inserted id
				newEmployee.employee_id = userResult.insertedId.toString();
				// insert employee into the employees table
				let employeeResult = await dbo.collection('employees').insertOne({_id:userResult.insertedId, ...newEmployee});
				if (!employeeResult.acknowledged){
					return res.send({ status: 'error', data: "Internal Server Error - user inserted, failed to insert employee"});
				}

				return res.send({status: 'ok', data: {'employee_id': userResult.insertedId}});

			} else {
				return res.status(403).send({ status: 'error', data: 'Invalid login' });
			}
		})
	}
}