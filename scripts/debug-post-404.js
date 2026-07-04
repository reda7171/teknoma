const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  // Chercher TOUS les posts avec ce slug approximatif
  const posts = await p.post.findMany({
    where: {
      slug: { contains: '5-raisons' }
    },
    select: { id: true, slug: true, published: true, language: true, title: true }
  });
  console.log('Posts found:', JSON.stringify(posts, null, 2));

  // Tester la même query que getPostBySlug avec locale=fr
  const slug = '5-raisons-livres-papier-ne-disparaitront-jamais';
  const withLang = await p.post.findFirst({
    where: { slug, published: true, language: 'fr' }
  });
  console.log('\nWith language=fr:', withLang ? 'FOUND' : 'NOT FOUND');

  // Sans filtre langue
  const withoutLang = await p.post.findFirst({
    where: { slug, published: true }
  });
  console.log('Without language filter:', withoutLang ? 'FOUND' : 'NOT FOUND');

  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
