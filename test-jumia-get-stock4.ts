import { prisma } from './src/lib/prisma'
import { JumiaAPI } from './src/lib/jumia-api'

async function main() {
    const jumia = await JumiaAPI.getInstance();
    const books = await prisma.book.findMany({ where: { sellerSku: { not: null }, isSyncedWithJumia: true } });
    console.log("Total books synced with Jumia:", books.length);
    let found = 0;
    for (let i = 0; i < Math.min(20, books.length); i++) {
        const book = books[i];
        let data = await jumia.getProducts({ sellerSku: book.sellerSku as string });
        let product = data?.products?.[0];
        
        if (!product) {
            data = await jumia.getProducts({ sellerSku: book.sellerSku + '_v2' });
            product = data?.products?.[0];
        }
        
        const variation = product?.variations?.find((v: any) => v.sellerSku === book.sellerSku || v.sellerSku === book.sellerSku + '_v2');
        const sid = variation?.id || product?.id;
        if (sid) {
            found++;
        }
        console.log(`Book ${book.id} - SKU: ${book.sellerSku} -> SID: ${sid || "NOT FOUND"}`);
    }
    console.log(`Found ${found} / 20`);
}

main().catch(console.error);
