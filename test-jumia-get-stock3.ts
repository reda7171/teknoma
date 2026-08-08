import { prisma } from './src/lib/prisma'
import { JumiaAPI } from './src/lib/jumia-api'

async function main() {
    const jumia = await JumiaAPI.getInstance();
    
    // find a book with a sellerSku that fails or something
    const books = await prisma.book.findMany({ where: { sellerSku: { not: null } } });
    console.log("Total books with SKU:", books.length);
    for (let i = 0; i < Math.min(10, books.length); i++) {
        const book = books[i];
        console.log(`Checking book ${book.id} - SKU: ${book.sellerSku}`);
        try {
            const data = await jumia.getProducts({ sellerSku: book.sellerSku as string });
            const product = data?.products?.[0] || data?.data?.[0] || data?.[0];
            const variation = product?.variations?.find((v: any) => v.sellerSku === book.sellerSku || v.sellerSku === book.sellerSku + '_v2');
            const sid = variation?.id || product?.id;
            console.log(" -> SID:", sid);
        } catch (e: any) {
            console.log(" -> ERROR:", e.message);
        }
    }
}

main().catch(console.error);
