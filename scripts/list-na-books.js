// Lister les livres sans catégorie
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const books = await prisma.book.findMany({
    where: {
      OR: [
        { category: null },
        { category: 'N/A' },
        { category: '' }
      ]
    },
    select: { id: true, title: true, author: true, category: true },
  });
  console.log('Total:', books.length);
  console.log(JSON.stringify(books, null, 2));
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
