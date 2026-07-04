const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  const post = await p.post.findFirst({
    where: { id: '01ccf477-3f39-4cc3-b4bc-363f02300ba6' },
    select: { slug: true }
  });

  const slug = post.slug;
  console.log('Slug brut:', slug);
  console.log('Longueur:', slug.length);
  console.log('Chars:', [...slug].map(c => `${c}(${c.charCodeAt(0)})`).join(' '));

  // URL encodé équivalent
  console.log('URL encoded:', encodeURIComponent(slug));

  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
