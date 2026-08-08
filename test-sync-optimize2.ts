import { prisma } from "./src/lib/prisma"
import { JumiaAPI } from "./src/lib/jumia-api"

async function main() {
    const bookId = "0199942d-3cec-4ad8-a8e2-cf471d7be496"
    const books = await prisma.book.findMany({
        where: { id: bookId, sellerSku: { not: null } },
        select: { id: true, sellerSku: true, stock: true, jumiaProductSid: true, jumiaQcStatus: true }
    })
    
    const jumia = await JumiaAPI.getInstance()
    
    const updates: any[] = []
    for (const book of books) {
        let sid = book.jumiaProductSid;
        let sellerSku = book.sellerSku as string;
        let qcStatus = book.jumiaQcStatus;
        
        if (!sid) {
            console.log("No SID found, fetching from Jumia...");
            let data = await jumia.getProducts({ sellerSku: book.sellerSku as string })
            let product = data?.products?.[0] || data?.data?.[0] || data?.[0]
            
            if (!product || !product.id) {
                data = await jumia.getProducts({ sellerSku: book.sellerSku + '_v2' })
                product = data?.products?.[0] || data?.data?.[0] || data?.[0]
            }
            
            const variation = product?.variations?.find((v: any) => v.sellerSku === book.sellerSku || v.sellerSku === book.sellerSku + '_v2')
            sid = variation?.id || product?.id
            sellerSku = variation?.sellerSku || book.sellerSku as string
            
            const client = variation?.businessClients?.find((bc: any) => bc.code === 'jumia-ma' || bc.status)
            qcStatus = client?.qc?.status || 'UNKNOWN'

            if (sid) {
                await prisma.book.update({
                    where: { id: book.id },
                    data: { jumiaProductSid: sid, jumiaQcStatus: qcStatus }
                })
            }
        } else {
            console.log("SID found in DB!");
        }
        
        if (sid) {
            if (qcStatus !== 'APPROVED') {
                console.warn(`Skipping Jumia sync for ${book.sellerSku} - QC Status is ${qcStatus}`);
                continue;
            }
            
            updates.push({
                productSid: sid,
                sellerSku: sellerSku,
                stock: book.stock
            })
        }
    }
    
    console.log("Updates:", updates);
}

main().catch(console.error)
