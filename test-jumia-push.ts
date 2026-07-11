import { JumiaAPI } from './src/lib/jumia-api'

async function run() {
    const jumia = await JumiaAPI.getInstance()
    if (!jumia) return;

    try {
        let res = await (jumia as any).request(`/catalog/categories?search=bestselling`)
        console.log("With search:", res.categories?.length || 0)
        
        let res2 = await (jumia as any).request(`/catalog/categories?name=bestselling`)
        console.log("With name:", res2.categories?.length || 0)
    } catch (e: any) {
        console.error(e.message)
    }
}

run().catch(console.error).finally(() => process.exit(0))
