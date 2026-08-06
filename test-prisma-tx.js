const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
    try {
        const books = await prisma.book.findMany({ take: 2 });
        await prisma.$transaction([
            prisma.book.update({ where: { id: books[0].id }, data: { imageKeywords: 't1' }}),
            prisma.book.update({ where: { id: books[1].id }, data: { imageKeywords: 't2' }})
        ]);
        console.log('Tx success');
    } catch(e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}
run();
