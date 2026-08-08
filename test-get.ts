import { JumiaAPI } from './src/lib/jumia-api';

async function test() {
    const jumia = await JumiaAPI.getInstance();
    const res = await jumia.getProducts({ sellerSku: "12356789" });
    console.log(JSON.stringify(res, null, 2));
}

test().catch(console.error);
