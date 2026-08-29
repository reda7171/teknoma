const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.post.findMany({ select: { slug: true } })
  .then(posts => console.log(JSON.stringify(posts, null, 2)))
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
