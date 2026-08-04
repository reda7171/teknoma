import { JumiaAPI } from './src/lib/jumia-api';
async function test() {
    const jumia = await JumiaAPI.getInstance();
    const prods = await jumia.getProducts({ size: 1 });
    const sku = prods.products[0].variations[0].sku;
    const stock = await jumia.getCatalogStock({ sku });
    console.log(JSON.stringify(stock, null, 2));
}
test();
