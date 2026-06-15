const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const posts = await prisma.post.findMany({
    where: {
      slug: {
        contains: 'top-5-librairies'
      }
    },
    select: {
      id: true,
      title: true,
      slug: true,
      language: true,
      published: true
    }
  });
  console.log(JSON.stringify(posts, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
