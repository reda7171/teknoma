const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.post.updateMany({
    where: { published: false },
    data: { published: true }
  });
  
  console.log(`Finished! Published ${result.count} articles.`);
}

main().finally(() => prisma.$disconnect());
