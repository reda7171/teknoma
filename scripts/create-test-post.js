const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Créer un post test avec une date passée (maintenant - 1 minute)
  const pastDate = new Date(Date.now() - 60000);
  const post = await prisma.scheduledPost.create({
    data: {
      date: pastDate,
      time: '00:00',
      content: '📚 Test automatique Riwaya - cron planning n8n',
      platforms: JSON.stringify(['facebook']),
      mediaUrl: null,
      status: 'PENDING'
    }
  });
  console.log('Post test créé:', post.id, '| date:', pastDate.toISOString());
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
