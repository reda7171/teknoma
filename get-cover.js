const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const book = await prisma.book.findFirst({where: { title: 'تشي جيفارا' }, select: { image: true }}); 
    console.log(book?.image);
}

run()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
