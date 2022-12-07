import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Config } from './config';


export class SecUtils{
	static SALT_ROUNDS=10;

	/**
	 * Generates a JWT with object data
	 * @param obj 
	 * @returns jwt
	 */
	public static getToken(obj:any):string{
		return jwt.sign(obj, Config.tokenSecret);
	}
	
	/**
	 * Validates JWT and returns decoded object
	 * @param token 
	 * @returns decoded object or null
	 */
	public static verifyToken(token:string|undefined):any{
		if (!token||token.length==0)
			return null;
		try{
			return jwt.verify(token, Config.tokenSecret);
		}catch(e){
			console.error(e);
			return null;
		}
	}

	/**
	 * Takes a request and verifies authorization
	 * If authenticated, the request body is populated with the token contents
	 * @param req 
	 * @param res 
	 * @param next 
	 * @returns 
	 */
	public static middleware(req:express.Request,res:express.Response,next:express.NextFunction){
		const token=req.headers.authorization?.split(' ')[1];
		const result=SecUtils.verifyToken(token);
		if (result){
			// set data for body
			req.body.employee_id = result.employee_id;
			req.body.admin = result.admin;
			return next();
		}
        res.send({status:'error',data:'Security error'});
	}

	/**
	 * Compares a password string to a hashed equivalent
	 * @param password 
	 * @param hash 
	 * @returns 
	 */
	public static async compareToHash(password:string,hash:string):Promise<boolean>{
		return await bcrypt.compare(password,hash);
	}

	/**
	 * Creates a hash on an input string
	 * @param input 
	 * @returns hashed string
	 */
	public static async createHash(input:string):Promise<string>{
		const salt=await bcrypt.genSalt(SecUtils.SALT_ROUNDS);
		return await bcrypt.hash(input,salt);
	}
}
