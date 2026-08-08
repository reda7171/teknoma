import { JumiaAPI } from './src/lib/jumia-api';
import { checkJumiaLinkBySkuExact } from './src/lib/actions/jumia';

async function test() {
    const jumia = await JumiaAPI.getInstance();
    const sku = "D8EC428A";
    const res = await checkJumiaLinkBySkuExact(sku);
    console.log("checkJumiaLinkBySkuExact:", res);
    
    const res2 = await jumia.getProducts({ sellerSku: sku });
    console.log(JSON.stringify(res2, null, 2));
}

test().catch(console.error);
