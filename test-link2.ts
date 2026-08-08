import { JumiaAPI } from './src/lib/jumia-api';

async function test() {
    const jumia = await JumiaAPI.getInstance();
    const sku = "12356789";
    const res = await jumia.getProducts({ sellerSku: sku });
    
    let products = res.products || res.data || res;
    if (!Array.isArray(products)) products = [products];
    for (const p of products) {
        if (!p) continue;
        if (p.sellerSku === sku) {
            console.log("Found direct");
            return;
        }
        if (p.variations) {
            for (const v of p.variations) {
                if (v.sellerSku === sku) {
                    console.log("Found in variations");
                    return;
                }
            }
        }
    }
    console.log("Not found");
}

test().catch(console.error);
