import { JumiaAPI } from './src/lib/jumia-api';
async function test() {
    const jumia = await JumiaAPI.getInstance();
    const stock = await jumia.getCatalogStock({ size: 2 });
    console.log("Stock item 0:", JSON.stringify(stock.products[0], null, 2));
    console.log("Stock item 1:", JSON.stringify(stock.products[1], null, 2));
}
test();
