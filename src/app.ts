import express from "express";
import {ApiRouter} from "./api/apirouter";
import {SecRouter} from "./security/secrouter";

class Application {
    public app: express.Application;
    public port: number;

    constructor() {
        this.app = express();
        this.port = process.env.PORT?+process.env.PORT:3000;
        this.app.use(express.urlencoded({ extended: false }));
        this.app.use(express.json());
        this.initCors();
        this.buildRoutes();
    }

    // Starts the server on the port specified in the environment or on port 3000 if none specified.
    public start(): void {
        this.app.listen(this.port, () => console.log("Server listening on port " + this.port + "!"));
    }

    public initCors(): void {
        this.app.use(function(req: express.Request, res: express.Response, next: any) {
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Methods", "PUT, GET, POST, DELETE, OPTIONS");
            res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization, Access-Control-Allow-Credentials");
            res.header("Access-Control-Allow-Credentials", "true");
            next();
        });
    }

    // setup routes for the express server
    public buildRoutes(): void {
        this.app.use("/api", new ApiRouter().getRouter()); // api endpoints 
        this.app.use("/security", new SecRouter().getRouter()); // security endpoints
    }
}
new Application().start();