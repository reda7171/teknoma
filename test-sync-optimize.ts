import { syncBooksQuantityToJumia } from "./src/lib/actions/jumia"
import { prisma } from "./src/lib/prisma"

async function main() {
    const bookId = "0199942d-3cec-4ad8-a8e2-cf471d7be496"
    
    console.log("1. Initial state (should fetch from Jumia API):")
    const res1 = await syncBooksQuantityToJumia([bookId])
    console.log(res1)
    
    console.log("\n2. DB state after first sync:")
    const b1 = await prisma.book.findUnique({ where: { id: bookId }, select: { jumiaProductSid: true, jumiaQcStatus: true }})
    console.log(b1)
    
    console.log("\n3. Second state (should NOT fetch from Jumia API, much faster):")
    const start = Date.now()
    const res2 = await syncBooksQuantityToJumia([bookId])
    console.log(res2)
    console.log(`Time taken: ${Date.now() - start}ms`)
}

main().catch(console.error)
