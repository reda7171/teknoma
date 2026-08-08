import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function test() {
    const book = await prisma.book.findUnique({
        where: { id: "d8ec428a-1812-400d-a5ee-d4ca831e78b6" }
    });
    console.log("Book sellerSku:", book?.sellerSku);
    console.log("Book sid:", book?.jumiaProductSid);
    await prisma.$disconnect();
}

test().catch(console.error);
