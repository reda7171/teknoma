import { JumiaAPI } from './src/lib/jumia-api';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
    console.log("Fetching setting...");
    const jumia = await JumiaAPI.getInstance();
    if (!jumia) {
        console.log("Jumia disabled or missing env.");
        return;
    }
    console.log("Getting orders...");
    const res = await jumia.getOrders(5);
    console.log(JSON.stringify(res, null, 2));
}

run().catch(console.error);
