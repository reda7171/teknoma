import { JumiaAPI } from './src/lib/jumia-api';

async function test() {
    const jumia = await JumiaAPI.getInstance();
    const sku = "D8EC428A";
    const checkSku = async (skuStr: string) => {
        const res = await jumia.getProducts({ sellerSku: skuStr });
        let products = res.products || res.data || res;
        if (!Array.isArray(products)) products = [products];
        for (const p of products) {
            if (!p) continue;
            if (p.sellerSku?.trim() === skuStr.trim()) return true;
            if (p.variations) {
                for (const v of p.variations) {
                    if (v.sellerSku?.trim() === skuStr.trim()) return true;
                }
            }
        }
        return false;
    }
    const found = await checkSku(sku);
    console.log("Found:", found);
}

test().catch(console.error);
