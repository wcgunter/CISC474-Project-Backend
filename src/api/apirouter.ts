import express from "express";
import {ApiController} from "./apicontroller";

export class ApiRouter {
    private router: express.Router = express.Router();
    private controller: ApiController = new ApiController();

    // Creates the routes for this router and returns a populated router object
    public getRouter(): express.Router {
        this.router.get("/hello", this.controller.getHello);
        this.router.get("/employees/:employeeID_in/:startDate_in/:endDate_in", this.controller.getEmployeesPay);
        this.router.post("/employees/:employeeID_in/:clock_in/:clock_out", this.controller.addClockEvent);
        this.router.delete("/employees/:employeeID_in/:clock_in/:clock_out", this.controller.deleteClockEvent);
        this.router.put("/employees/:employeeID_in/:original_clock_in/:original_clock_out/:new_clock_in/:new_clock_out", this.controller.replaceClockEvent);
        return this.router;
    }
}