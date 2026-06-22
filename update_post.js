const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const post = await prisma.post.findFirst({
    where: { slug: 'la-memoire-dun-roi-fr-2qfu4a' }
  });
  if (post) {
    await prisma.post.update({
      where: { id: post.id },
      data: { coverImage: '/blog/memoire-roi-hassan2.png' }
    });
    console.log('Cover updated for: ' + post.id);
  } else {
    console.log('NOT FOUND');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
