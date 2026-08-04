import { JumiaAPI } from './src/lib/jumia-api';
async function test() {
    const jumia = await JumiaAPI.getInstance();
    const stock = await jumia.getCatalogStock({ size: 100 });
    console.log(stock.products.length);
}
test();
