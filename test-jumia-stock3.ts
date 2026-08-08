import { JumiaAPI } from './src/lib/jumia-api'

async function main() {
    const jumia = await JumiaAPI.getInstance();
    
    // Test 1: use "id"
    const payload1 = {
        products: [
            {
                id: "429f1711-c777-4bf3-bf3c-d26ada261e1d",
                sellerSku: "RIW-MRUKYUO2-00CK",
                stock: 5,
                quantity: 5,
            }
        ]
    };
    try {
        const data = await jumia.updateProductsStock(payload1.products);
        console.log("Response 1:", JSON.stringify(data, null, 2));
    } catch(err: any) {
        console.error("Error 1:", err.response?.data || err.message);
    }
}

main().catch(console.error);
