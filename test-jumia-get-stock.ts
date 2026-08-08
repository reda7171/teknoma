import { JumiaAPI } from './src/lib/jumia-api'

async function main() {
    const jumia = await JumiaAPI.getInstance();
    
    // 1. Get Product by SKU
    const data = await jumia.getProducts({ sellerSku: "RIW-MRUKYUO2-00CK" });
    const sid = data?.products?.[0]?.id;
    console.log("Product SID:", sid);
    
    if (sid) {
        // 2. Get Stock by SID
        const stockData = await jumia.getCatalogStock({ productSids: [sid] });
        console.log("Stock Data:", JSON.stringify(stockData, null, 2));
    }
}

main().catch(console.error);
