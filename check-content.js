const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const p = await prisma.post.findFirst();
  console.log('CONTENT START:');
  console.log(p.content.substring(0, 500));
}
main().finally(() => prisma.$disconnect());
