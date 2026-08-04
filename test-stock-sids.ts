import { JumiaAPI } from './src/lib/jumia-api';
async function test() {
    const jumia = await JumiaAPI.getInstance();
    const prods = await jumia.getProducts({ size: 2 });
    const sids = prods.products.map(p => p.id || p.sid);
    const stock = await jumia.getCatalogStock({ productSids: sids });
    console.log(JSON.stringify(stock, null, 2));
}
test();
