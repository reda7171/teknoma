import { JumiaAPI } from './src/lib/jumia-api';
async function test() {
    const jumia = await JumiaAPI.getInstance();
    
    // get stock id
    const stock = await jumia.getCatalogStock({ sku: 'RIW-MSDQEHJ7-66XW' });
    const stockId = stock.products[0].id;
    
    // test update with stock id
    const res = await jumia.updateProductsStock([{
        sellerSku: 'RIW-MSDQEHJ7-66XW',
        id: stockId,
        stock: 12
    }]);
    
    console.log("Update response:", JSON.stringify(res, null, 2));
    
    // Wait a bit then check feed
    await new Promise(r => setTimeout(r, 2000));
    const feed = await jumia.request('/feeds/' + (res.feedId || res.feedSid));
    console.log("Feed status:", JSON.stringify(feed, null, 2));
}
test();
