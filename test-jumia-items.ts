import { JumiaAPI } from "./src/lib/jumia-api"

async function run() {
    const jumia = await JumiaAPI.getInstance()
    if (!jumia) return;

    // Try finding the real ID of the order
    const ordersRes = await jumia.getOrders(5)
    const orders = ordersRes?.orders || ordersRes?.data?.orders || []
    if (orders.length > 0) {
        const o = orders[0]
        
        // Try to fetch items using different IDs
        if (o.id) {
             try { 
                 const res = await (jumia as any).request(`/orders/items?orderId=${o.id}`); 
                 const data = res[0] || res;
                 const items = data.items || data || [];
                 if (items.length > 0) {
                     const itemIds = items.map((i:any) => i.id)
                     console.log("Found item IDs:", itemIds);

                     // Test print-labels
                     const payload = {
                         orderItemIds: itemIds,
                         orderIds: [o.id],
                         orderId: o.id,
                     }
                     console.log("Printing labels payload:", payload);
                     const printRes = await (jumia as any).request(`/orders/print-labels?orderId=${o.id}`, 'POST', payload)
                     console.log("Print labels response keys:", Object.keys(printRes));
                     console.log("Print labels response snippet:", JSON.stringify(printRes).substring(0, 500));
                 }
             } catch(e:any) { console.error("Error fetching items:", e.message) }
        }
    }
}

run().catch(console.error).finally(() => process.exit(0))
