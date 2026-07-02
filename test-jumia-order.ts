import { JumiaAPI } from "./src/lib/jumia-api"

async function run() {
    const jumia = await JumiaAPI.getInstance()
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    const createdAfter = threeMonthsAgo.toISOString().split('T')[0]

    let token: string | undefined = undefined
    let allOrders: any[] = []
    
    // Fetch up to 5 pages
    for (let i = 0; i < 5; i++) {
        const response = await jumia.getOrders(100, token, undefined, createdAfter, undefined)
        const orders = response?.orders || response?.data?.orders || []
        allOrders = allOrders.concat(orders)
        
        token = response?.nextToken || response?.data?.nextToken
        if (!token) break
    }
    
    console.log(`TOTAL ORDERS FOUND: ${allOrders.length}`)
    allOrders.forEach(o => {
        console.log(`Number: ${o.number} | Status: ${o.status} | Date: ${o.createdAt}`)
    })
}

run().catch(console.error).finally(() => process.exit(0))
