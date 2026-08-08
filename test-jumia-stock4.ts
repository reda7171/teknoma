import { JumiaAPI } from './src/lib/jumia-api'

async function main() {
    const jumia = await JumiaAPI.getInstance();
    const payload = {
        products: [
            {
                productSid: "0e4c4cbb-7c80-418d-b46b-ff93248e7fe6",
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
