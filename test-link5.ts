import { checkJumiaLinkBySkuExact } from './src/lib/actions/jumia';

async function test() {
    const sku = "D8EC428A";
    const res = await checkJumiaLinkBySkuExact(sku);
    console.log("checkJumiaLinkBySkuExact:", res);
}

test().catch(console.error);
