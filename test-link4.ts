import { JumiaAPI } from './src/lib/jumia-api';

async function test() {
    const jumia = await JumiaAPI.getInstance();
    const res = await jumia.getProducts({ sids: ["b90958f7-e6ea-4797-9d32-86a2f9de194b"] });
    console.log(JSON.stringify(res, null, 2));
}

test().catch(console.error);
