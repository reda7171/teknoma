import { JumiaAPI } from "./src/lib/jumia-api"

async function run() {
    const jumia = await JumiaAPI.getInstance()
    const response = await jumia.getProducts({size: 1})
    const products = response?.products || response?.data?.products || []
    
    console.log("FIRST PRODUCT JSON:")
    if (products.length > 0) {
        console.log(JSON.stringify(products[0], null, 2))
    }
}

run().catch(console.error).finally(() => process.exit(0))
