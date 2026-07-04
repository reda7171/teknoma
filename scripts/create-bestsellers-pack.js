// Créer le pack "Coups de Cœur Riwaya"
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Les 5 meilleurs (tous en stock, actifs, données réelles)
  const topBookIds = [
    // 1. اكتب حتى لا اصاب بالجنون — 9 vendus
    // 2. 005 — 8 vendus
    // 3. اكتب حتى لا ياكلني الشيطان — 7 vendus
    // 4. البارون — 6 vendus
    // 5. الليالي البيضاء — 4 vendus
  ];

  // Récupérer les IDs réels par titre
  const books = await prisma.book.findMany({
    where: {
      active: true,
      stock: { gt: 0 },
      title: {
        in: [
          'اكتب حتى لا اصاب بالجنون',
          '005',
          'اكتب حتى لا ياكلني الشيطان',
          'البارون',
          'الليالي البيضاء ',
        ]
      }
    },
    select: { id: true, title: true, price: true }
  });

  console.log('Livres sélectionnés:');
  let totalPrice = 0;
  books.forEach(b => {
    console.log(` - [${b.id}] ${b.title} — ${b.price} MAD`);
    totalPrice += b.price;
  });
  console.log(`\nPrix total unitaire: ${totalPrice} MAD`);

  // Prix du pack avec ~15% de réduction
  const packPrice = Math.round(totalPrice * 0.85);
  console.log(`Prix pack (-15%): ${packPrice} MAD`);

  if (books.length < 5) {
    console.log(`ATTENTION: seulement ${books.length}/5 livres trouvés`);
  }

  // Créer le pack
  const pack = await prisma.pack.create({
    data: {
      name: 'كتب أختارها لك رواية',
      nameFr: 'Coups de Cœur Riwaya',
      nameEn: 'Riwaya\'s Best Picks',
      description: 'أفضل 5 كتب بيعاً في متجر رواية — اختيار مدروس يناسب جميع الأذواق',
      descriptionFr: '5 livres parmi les plus vendus chez Riwaya — une sélection soignée pour tous les goûts.',
      descriptionEn: 'The 5 best-selling books at Riwaya — a curated selection for every taste.',
      price: packPrice,
      costPrice: 0,
      active: true,
      isFreeDelivery: false,
      shippingFees: 0,
      books: {
        create: books.map(b => ({ bookId: b.id }))
      }
    }
  });

  console.log(`\nPack créé avec succès!`);
  console.log(`ID: ${pack.id}`);
  console.log(`Nom: ${pack.nameFr}`);
  console.log(`Prix: ${pack.price} MAD`);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
