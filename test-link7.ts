import { JumiaAPI } from './src/lib/jumia-api';

async function test() {
    const jumia = await JumiaAPI.getInstance();
    const sku = "D8EC428A";
    const res = await jumia.getProducts({ sellerSku: sku });
    let products = res.products || res.data || res;
    if (!Array.isArray(products)) products = [products];
    for (const p of products) {
        if (!p) continue;
        if (p.variations) {
            for (const v of p.variations) {
                console.log("Variation sku:", v.sellerSku);
                console.log("Hex:", Buffer.from(v.sellerSku || "").toString('hex'));
                console.log("Is match with trim:", v.sellerSku?.trim() === sku.trim());
            }
        }
    }
}

test().catch(console.error);
