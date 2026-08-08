import { JumiaAPI } from './src/lib/jumia-api';

async function testSync() {
    const jumia = await JumiaAPI.getInstance();
    
    const updates = [{
        productSid: "273e4c7b-4679-41dc-a3cd-14d5a460dc67",
        sellerSku: "12356789",
        stock: 50
    }];
    console.log("Sending:", updates);
    const result = await jumia.updateProductsStock(updates);
    console.log("Response:", JSON.stringify(result, null, 2));
}

testSync().catch(console.error);
