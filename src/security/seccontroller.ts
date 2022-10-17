import express from "express";

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

}