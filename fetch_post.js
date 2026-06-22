const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const post = await prisma.post.findFirst({
    where: { slug: 'top-10-romans-arabes-2026' }
  });
  if (post) {
    console.log('ID: ' + post.id);
    console.log('COVER: ' + post.coverImage);
  } else {
    console.log('NOT FOUND');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
