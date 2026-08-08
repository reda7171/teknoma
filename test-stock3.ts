import { JumiaAPI } from './src/lib/jumia-api';

async function testSync() {
    const jumia = await JumiaAPI.getInstance();
    
    let updates = [{
        PRODUCT_SID: "273e4c7b-4679-41dc-a3cd-14d5a460dc67",
        sellerSku: "12356789",
        stock: 50
    }];
    let result = await jumia.updateProductsStock(updates);
    
    await new Promise(r => setTimeout(r, 2000));
    let feed = await jumia.getFeed(result.feedId);
    console.log("PRODUCT_SID Feed:", JSON.stringify(feed, null, 2));

    updates = [{
        product_sid: "273e4c7b-4679-41dc-a3cd-14d5a460dc67",
        sellerSku: "12356789",
        stock: 50
    }];
    result = await jumia.updateProductsStock(updates);
    
    await new Promise(r => setTimeout(r, 2000));
    feed = await jumia.getFeed(result.feedId);
    console.log("product_sid Feed:", JSON.stringify(feed, null, 2));

    updates = [{
        productSid: "273e4c7b-4679-41dc-a3cd-14d5a460dc67",
        sku: "12356789",
        quantity: 50
    }];
    result = await jumia.updateProductsStock(updates);
    
    await new Promise(r => setTimeout(r, 2000));
    feed = await jumia.getFeed(result.feedId);
    console.log("productSid+quantity Feed:", JSON.stringify(feed, null, 2));
}

testSync().catch(console.error);
