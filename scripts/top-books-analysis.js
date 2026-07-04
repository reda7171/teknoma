// Analyser les livres les plus commandés
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Top 15 livres par quantité commandée (statuts non-annulés)
  const topBooks = await prisma.orderItem.groupBy({
    by: ['bookId'],
    where: {
      type: 'BOOK',
      bookId: { not: null },
      order: {
        status: { notIn: ['CANCELLED', 'RETURNED'] }
      }
    },
    _sum: { quantity: true },
    _count: { id: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: 15,
  });

  // Récupérer les détails des livres
  const bookIds = topBooks.map(b => b.bookId).filter(Boolean);
  const books = await prisma.book.findMany({
    where: { id: { in: bookIds }, active: true, stock: { gt: 0 } },
    select: { id: true, title: true, author: true, price: true, category: true, stock: true, language: true }
  });

  // Merger les données
  const result = topBooks
    .map(tb => {
      const book = books.find(b => b.id === tb.bookId);
      if (!book) return null;
      return { ...book, totalSold: tb._sum.quantity, orderCount: tb._count.id };
    })
    .filter(Boolean);

  console.log('Top livres vendus (en stock, actifs):');
  result.forEach((b, i) => {
    console.log(`${i+1}. [${b.totalSold} vendus] ${b.title} — ${b.author} (${b.price} MAD) [${b.category || 'N/A'}]`);
  });

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
