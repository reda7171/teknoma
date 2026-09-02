const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const book = await prisma.book.findUnique({ where: { id: 'b6bb8ecf-848e-4c3a-821f-6eebd31ca8bb' } });
    if(book) {
        console.log(book.title);
        console.log(book.author);
        console.log(book.description);
    } else {
        console.log("Book not found");
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
