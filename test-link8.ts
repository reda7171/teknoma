import { JumiaAPI } from './src/lib/jumia-api';

async function test() {
    const jumia = await JumiaAPI.getInstance();
    const res = await jumia.getProducts({ sids: ["b90958f7-e6ea-4797-9d32-86a2f9de194b"] });
    let products = res.products || res.data || res;
    if (!Array.isArray(products)) products = [products];
    for (const p of products) {
        if (!p) continue;
        if (p.variations) {
            for (const v of p.variations) {
                console.log("Variation sku:", v.sellerSku);
                console.log("Hex:", Buffer.from(v.sellerSku || "").toString('hex'));
            }
        }
    }
}

test().catch(console.error);
