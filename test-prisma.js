const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
    try {
        const books = await prisma.book.findMany({ take: 2 });
        console.log('Books found:', books.length);
        await prisma.book.update({ 
            where: { id: books[0].id }, 
            data: { imageKeywords: 'test' }
        });
        console.log('Update success');
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}
run();
