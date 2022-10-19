import express from "express";
import axios, { AxiosRequestConfig } from "axios";
import { MongoAtlasDB } from "../shared/MongoAtlasDb";
import { Config } from "../shared/config";

export class ApiController {
    static baseURL:string="https://data.mongodb-api.com/app/data-oncwp/endpoint/data/v1";
    static apiKey:string="SC5e4w8GsFdj1a94juqZPgvsyOFOSazcvz4Ms2aN6BXPLwArCfmPUy6G1JuZa6g8";
    static data:any =({
        "collection": "users", //there is also a collection called user_data
        "database": "APIDatabase",
        "dataSource": "CISC474Group1"
    })
    static config:AxiosRequestConfig = {
        method: 'post',
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Request-Headers': '*',
          'api-key': ApiController.apiKey,
        },
        data:null
    };

    //returns all records in the collection.
    public getHello(req: express.Request, res: express.Response): void {
        ApiController.config.url=ApiController.baseURL+'/action/find'
        ApiController.config.data=ApiController.data
        axios(ApiController.config)
            .then(response=>res.send(JSON.stringify(response.data)))
            .catch(error=>res.send(error));  
    }

    //inserts the body of the request into the database
    public postHello(req: express.Request, res: express.Response): void {
        ApiController.config.url=ApiController.baseURL+'/action/insertOne';
        ApiController.config.data={...ApiController.data,document:req.body};
        axios(ApiController.config).then(result=>res.send(result))
        .catch(err=>res.send(err))
    }

    public async getEmployeePay(req: express.Request, res: express.Response): Promise<void> {
        const employeeIDIN = req.body.employeeId;
        const startDate = req.body.startDate.toISOString();
        const endDate = req.body.endDate.toISOString();
        try {
                const db = new MongoAtlasDB(Config.databaseConfig.dataSource,'APIDatabase');
                const result = await db.findOne("employees", {employeeId: employeeIDIN});
                const numElements = result.data.logs.length;
                var pay = 0;
                var time = 0;
                result.data.logs.forEach((element: { clock_in_date_time: number; clock_out_date_time: number; pay: number; time: number; }) => {
                    if (element.clock_in_date_time >= startDate && element.clock_out_date_time <= endDate) {
                        pay += element.pay;
                        time += element.time;
                    }
                });
                res.send({pay: pay, time: time});
        } catch (error) {
            res.send(error);
        }
    }
}