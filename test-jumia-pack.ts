import { prisma } from './src/lib/prisma'
import { JumiaAPI } from './src/lib/jumia-api'

async function main() {
    const packId = "c632797d-cfec-4084-8419-0993c9adc0ab";
    const pack = await prisma.pack.findUnique({ where: { id: packId } })
    if (!pack) {
        console.log("Pack not found in DB");
        return;
    }
    
    console.log("Pack sellerSku:", pack.sellerSku, "pack.id:", pack.id);
    
    const jumia = await JumiaAPI.getInstance();
    if (!jumia) {
        console.log("Jumia not configured");
        return;
    }
    
    const sellerSkuV2 = (pack.sellerSku || pack.id) + "_v2";
    console.log("Checking V2 sellerSku:", sellerSkuV2);
    
    const resV2 = await jumia.getProducts({ sellerSku: sellerSkuV2 });
    console.log("V2 response:", JSON.stringify(resV2, null, 2));

    const sellerSkuV1 = pack.sellerSku || pack.id;
    console.log("Checking V1 sellerSku:", sellerSkuV1);
    const resV1 = await jumia.getProducts({ sellerSku: sellerSkuV1 });
    console.log("V1 response:", JSON.stringify(resV1, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
