import { JumiaAPI } from './src/lib/jumia-api';

async function testSync() {
    const jumia = await JumiaAPI.getInstance();
    
    // Essayer toutes les cls
    const updates = [{
        productSid: "273e4c7b-4679-41dc-a3cd-14d5a460dc67",
        ProductSid: "273e4c7b-4679-41dc-a3cd-14d5a460dc67",
        PRODUCT_SID: "273e4c7b-4679-41dc-a3cd-14d5a460dc67",
        product_sid: "273e4c7b-4679-41dc-a3cd-14d5a460dc67",
        PRODUCTSID: "273e4c7b-4679-41dc-a3cd-14d5a460dc67",
        sid: "273e4c7b-4679-41dc-a3cd-14d5a460dc67",
        id: "273e4c7b-4679-41dc-a3cd-14d5a460dc67",
        productId: "273e4c7b-4679-41dc-a3cd-14d5a460dc67",
        product_id: "273e4c7b-4679-41dc-a3cd-14d5a460dc67",
        product_sku: "273e4c7b-4679-41dc-a3cd-14d5a460dc67",
        sellerSku: "12356789",
        stock: 50
    }];
    console.log("Sending:", updates);
    const result = await jumia.updateProductsStock(updates);

    await new Promise(r => setTimeout(r, 2000));
    const feed = await jumia.getFeed(result.feedId);
    console.log("Feed:", JSON.stringify(feed, null, 2));
}

testSync().catch(console.error);
