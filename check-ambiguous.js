const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    // Récupérer les livres de محمد ابراهيم et اسلام جمال pour comprendre qui ils sont
    const ambiguous = ['محمد ابراهيم', 'اسلام جمال', 'شيماء علي'];
    for (const name of ambiguous) {
        const books = await prisma.book.findMany({
            where: { author: name },
            select: { title: true }
        });
        console.log(`\n${name}:`);
        books.forEach(b => console.log(`  - ${b.title}`));
    }
}

run()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
