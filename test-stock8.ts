import { JumiaAPI } from './src/lib/jumia-api';

async function testSync(key: string) {
    const jumia = await JumiaAPI.getInstance();
    
    const updates = [{
        [key]: "273e4c7b-4679-41dc-a3cd-14d5a460dc67",
        sellerSku: "12356789",
        stock: 50
    }];
    const result = await jumia.updateProductsStock(updates);
    await new Promise(r => setTimeout(r, 2000));
    const feed = await jumia.getFeed(result.feedId);
    console.log("Key " + key + " => " + feed.status);
}

async function run() {
    await testSync('id');
    await testSync('ProductSid');
}
run().catch(console.error);
