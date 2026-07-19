const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function capitalizeWords(str) {
  return str.replace(/(^\w|\s\w)/g, m => m.toUpperCase());
}

async function main() {
  const posts = await prisma.post.findMany({
    select: { id: true, title: true }
  });

  let count = 0;
  for (const post of posts) {
    const newTitle = capitalizeWords(post.title);
    if (newTitle !== post.title) {
      await prisma.post.update({
        where: { id: post.id },
        data: { title: newTitle }
      });
      console.log(`Updated: "${post.title}" -> "${newTitle}"`);
      count++;
    }
  }
  console.log(`\nFinished! Updated ${count} titles.`);
}

main().finally(() => prisma.$disconnect());
