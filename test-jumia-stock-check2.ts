import { JumiaAPI } from './src/lib/jumia-api'

async function main() {
    const jumia = await JumiaAPI.getInstance();
    const data = await jumia.getCatalogStock({ sellerSku: "RIW-MRUKYUO2-00CK", size: 1 });
    console.log("Variation:", JSON.stringify(data?.products?.[0]?.variations?.[0], null, 2));
}

main().catch(console.error);
