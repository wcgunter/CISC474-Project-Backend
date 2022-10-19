import { MongoClient } from "mongodb";
import { Config } from "./config";

export class MongoDb {
    static client = new MongoClient(Config.url);
    static database = "APIDatabase";
}