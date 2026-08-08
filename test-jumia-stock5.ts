import { JumiaAPI } from './src/lib/jumia-api'

async function main() {
    const jumia = await JumiaAPI.getInstance();
    const payload = {
        products: [
            {
                product_sid: "0e4c4cbb-7c80-418d-b46b-ff93248e7fe6",
                sellerSku: "RIW-MRUKYUO2-00CK",
                stock: 12
            },
            {
                productSid: "0e4c4cbb-7c80-418d-b46b-ff93248e7fe6",
                sellerSku: "RIW-MRUKYUO2-00CK",
                stock: 12
            },
            {
                id: "0e4c4cbb-7c80-418d-b46b-ff93248e7fe6",
                sellerSku: "RIW-MRUKYUO2-00CK",
                stock: 12
            }
        ]
    };
    try {
        const data = await jumia.updateProductsStock(payload.products);
        console.log("Response:", JSON.stringify(data, null, 2));
    } catch(err: any) {
        console.error("Error:", err.response?.data || err.message);
    }
}

main().catch(console.error);
