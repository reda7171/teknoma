const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.pageView.deleteMany({
    where: { url: '/fr/blog/mock-article-url' }
  });
  console.log(`Deleted ${result.count} mock page views.`);
}
main().finally(() => prisma.$disconnect());
