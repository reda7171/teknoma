import { JumiaAPI } from './src/lib/jumia-api'

async function main() {
    const jumia = await JumiaAPI.getInstance();
    const payload = {
        products: [
            {
                productSid: "some-fake-sid",
                sellerSku: "fake-sku",
                stock: 5,
                quantity: 5
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
