import { JumiaAPI } from './src/lib/jumia-api'

async function main() {
    const jumia = await JumiaAPI.getInstance();
    const data = await jumia.getCatalogStock({ sellerSku: "RIW-MRUKYUO2-00CK", size: 1 });
    console.log("Data:", JSON.stringify(data, null, 2));
}

main().catch(console.error);
