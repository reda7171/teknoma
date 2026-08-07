import { PrismaClient } from '@prisma/client'
import { JumiaAPI } from './src/lib/jumia-api'

const prisma = new PrismaClient()

async function main() {
    const book = await prisma.book.findFirst({ where: { sellerSku: { not: null }, isSyncedWithJumia: true } })
    if (!book) {
        console.log("No book found")
        return
    }
    const jumia = await JumiaAPI.getInstance()
    if (!jumia) {
        console.log("Could not init jumia")
        return
    }
    
    const catalogStock = await jumia.getCatalogStock({ sellerSku: book.sellerSku, size: 1 })
    console.log("Catalog Stock result:", JSON.stringify(catalogStock, null, 2))
    const sid = catalogStock.products[0]?.id
    
    console.log("Testing payload with 'stock' + productSid + sellerSku")
    const res1 = await jumia.updateProductsStock([{ productSid: sid, sellerSku: book.sellerSku, stock: book.stock }])
    
    console.log("Testing payload with 'stock' + productId + sellerSku")
    const res2 = await jumia.updateProductsStock([{ productId: sid, sellerSku: book.sellerSku, stock: book.stock }])
    
    console.log("Testing payload with 'stock' + id + sellerSku")
    const res3 = await jumia.updateProductsStock([{ id: sid, sellerSku: book.sellerSku, stock: book.stock }])
    
    await new Promise(r => setTimeout(r, 4000));
    
    console.log("Checking feed for productSid");
    console.log(await jumia.getFeed(res1.feedId));
    console.log("Checking feed for productId");
    console.log(await jumia.getFeed(res2.feedId));
    console.log("Checking feed for id");
    console.log(await jumia.getFeed(res3.feedId));
}

main()
