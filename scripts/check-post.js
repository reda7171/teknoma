const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const slug = '5-raisons-livres-papier-ne-disparaitront-jamais';

  // Chercher le post exact
  const exact = await p.post.findFirst({
    where: { slug },
    select: { id: true, slug: true, published: true, language: true, title: true }
  });
  console.log('Exact match:', JSON.stringify(exact));

  // Chercher des posts similaires
  const similar = await p.post.findMany({
    where: { slug: { contains: 'raisons' } },
    select: { id: true, slug: true, published: true, language: true, title: true }
  });
  console.log('Similar slugs:', JSON.stringify(similar));

  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
