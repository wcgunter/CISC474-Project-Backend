import express from "express";
import {SecController} from "./seccontroller";

export class SecRouter {
    private router: express.Router = express.Router();
    private controller: SecController = new SecController();

    public getRouter(): express.Router {
        this.router.post('/token', this.controller.login);
		this.router.post('/register', this.controller.register);
		this.router.post('/changepwd', this.controller.changePwd);

        return this.router;
    }
}