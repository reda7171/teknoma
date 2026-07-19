const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Afficher tous les posts
  const all = await prisma.scheduledPost.findMany({ 
    select: { id: true, status: true, date: true, time: true } 
  });
  console.log('Posts actuels:', JSON.stringify(all, null, 2));

  // Remettre tous les FAILED en PENDING
  const count = await prisma.scheduledPost.updateMany({
    where: { status: 'FAILED' },
    data: { status: 'PENDING' }
  });
  console.log('Mis à jour en PENDING:', count.count, 'posts');

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
