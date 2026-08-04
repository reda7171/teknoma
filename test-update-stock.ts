import { JumiaAPI } from './src/lib/jumia-api';
async function test() {
    const jumia = await JumiaAPI.getInstance();
    // find the product
    const prods = await jumia.getProducts({ sellerSku: 'RIW-MSDQEHJ7-66XW' });
    const product = prods.products?.[0];
    if (!product) {
        console.log("Product not found");
        return;
    }
    console.log("Found product:", JSON.stringify(product, null, 2));

    const sku = product.sellerSku || (product.variations && product.variations[0]?.sellerSku);
    const id = product.id;
    console.log("Sending payload with id:", id, "sku:", sku);

    const res = await jumia.updateProductsStock([{
        sellerSku: sku,
        id: id,
        stock: 5
    }]);
    console.log("Update response:", JSON.stringify(res, null, 2));
}
test();
