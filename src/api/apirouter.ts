import express from "express";
import { SecUtils } from "../secutils";
import {ApiController} from "./apicontroller";

export class ApiRouter {
    private router: express.Router = express.Router();
    private controller: ApiController = new ApiController();

    // Creates the routes for this router and returns a populated router object
    public getRouter(): express.Router {
        
        this.router.get('/employee/pay/:startDate/:endDate', SecUtils.middleware, this.controller.getEmployeesPay);

        this.router.get('/employee/logs', SecUtils.middleware, this.controller.getEmployeeLogs);
        this.router.get('/employees/', SecUtils.middleware, this.controller.getEmployees);

        this.router.post('/clock/', SecUtils.middleware, this.controller.postClockEvent);
        this.router.delete('/clock/', SecUtils.middleware, this.controller.deleteClockEvent);
        this.router.put('/clock/', SecUtils.middleware, this.controller.putClockEvent);
        return this.router;
    }
}