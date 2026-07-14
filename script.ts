import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const books = await prisma.book.findMany({
    where: {
      posts: {
        none: {}
      }
    },
    select: {
      title: true
    }
  });
  console.log(JSON.stringify(books.map((b: any) => b.title), null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
