import express from "express";
import { SecUtils } from "../secutils";
import {SecController} from "./seccontroller";

export class SecRouter {
    private router: express.Router = express.Router();
    private controller: SecController = new SecController();

    public getRouter(): express.Router {
        this.router.post('/token', this.controller.login);
		this.router.post('/register', SecUtils.middleware ,this.controller.register);
		this.router.post('/changepwd', this.controller.changePwd);
        this.router.delete('/removeUser', SecUtils.middleware ,this.controller.removeUser);
        this.router.delete('/updateUser', SecUtils.middleware ,this.controller.updateUser);
        this.router.delete('/updateEmployee', SecUtils.middleware ,this.controller.updateEmployee);
        return this.router;
    }
}