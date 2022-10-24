import express from "express";
import {ApiController} from "./apicontroller";

export class ApiRouter {
    private router: express.Router = express.Router();
    private controller: ApiController = new ApiController();

    // Creates the routes for this router and returns a populated router object
    public getRouter(): express.Router {
        this.router.get("/hello", this.controller.getHello);
        this.router.get("/employees/:employeeID_in/:startDate_in/:endDate_in", this.controller.getEmployeesPay);
        this.router.get(`/userlogs/:id`, this.controller.getUserLog);
        this.router.get(`/queryByManagerId/:id`, this.controller.queryByManagerId);
        return this.router;
    }
}