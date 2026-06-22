const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const slugs = [
  'top-5-librairies-en-ligne-maroc-ar',
  'hada-alkitab-jaalani-ara-alamour-bichakl-mokhtalif',
  'ida-konta-torid-tatwir-nafsak-ibda-min-hona',
  'kotob-qad-toghayir-tariqat-tafkirik',
  'riwaya-allati-jaalatni-la-astatie-tawaquf',
  'mostahil-tonhi-hada-kitab-bidoun-sadma',
  'hadihi-riwaya-satabqa-fi-balik',
  'article-ar-vlm0wcm',
  'article-ar-3ymadc',
  'auteur-inconnu-ar-kgheki',
  'auteur-inconnu-ar-6egwqq',
  'article-ar-k1wtcv',
  'article-ar-n9mu2',
  'the-darkest-ar-3xhu06',
  'auteur-inconnu-ar-5ujsh',
  'article-ar-gon77',
  'article-ar-91uifh',
  'article-ar-cxo9s',
  'article-ar-zptbgi',
  'auteur-inconnu-ar-cuai1b'
];

async function main() {
  for (const slug of slugs) {
    const post = await prisma.post.findFirst({ where: { slug } });
    if (post) {
      console.log('ID: ' + post.id + ' | SLUG: ' + slug + ' | TITLE: ' + post.title);
    } else {
      console.log('NOT FOUND: ' + slug);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
