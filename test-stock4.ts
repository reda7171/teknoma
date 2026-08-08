import { JumiaAPI } from './src/lib/jumia-api';

async function testSync() {
    const jumia = await JumiaAPI.getInstance();
    
    // Essayer seulement sellerSku et stock
    const updates = [{
        sellerSku: "12356789",
        stock: 50
    }];
    console.log("Sending:", updates);
    const result = await jumia.updateProductsStock(updates);
    console.log("Response:", JSON.stringify(result, null, 2));

    await new Promise(r => setTimeout(r, 2000));
    const feed = await jumia.getFeed(result.feedId);
    console.log("Feed:", JSON.stringify(feed, null, 2));
}

testSync().catch(console.error);
