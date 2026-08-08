import { JumiaAPI } from './src/lib/jumia-api'

async function main() {
    const jumia = await JumiaAPI.getInstance();
    const data = await jumia.getCatalogStock({ sellerSku: '1', size: 1 });
    console.log("CatalogStock sample:", JSON.stringify(data, null, 2));
}

main().catch(console.error);
