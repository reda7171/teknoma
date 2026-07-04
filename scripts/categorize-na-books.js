// Catégorisation automatique des livres sans catégorie
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Mapping id -> catégorie basé sur l'analyse des titres/auteurs
const categorizations = [
  // Romans / Fiction
  { id: '5c114e13-a3fe-4d84-9f55-9469924a215d', category: 'Roman' },          // كافكا على الشاطئ - Kafka sur le rivage
  { id: '5ccbb48c-3ebf-47f1-b7d4-94bc21363222', category: 'Roman' },          // لعنة أديمون - Roman arabe
  { id: '61f59ad8-4821-40c7-b4f1-76f8755d2a8d', category: 'Roman' },          // الوليمة - Oussama Al Moslim
  { id: '86330efa-6d16-46df-9b65-e459854a7b44', category: 'Roman' },          // تانجل 1 و 2
  { id: '936ab82a-5edc-4ddd-919a-e665cbe764a5', category: 'Roman' },          // آزر
  { id: '9b5a1a40-22f6-4c4c-aa4d-9f7208c3f95e', category: 'Roman' },          // القادمون
  { id: 'a6bc4d78-4c60-4b6a-858f-b1dd04ec2142', category: 'Roman' },          // الجلاد تحت جلدي
  { id: 'aa49fd22-ac7e-4493-96ad-a8ddefa55750', category: 'Roman' },          // مملكة الكوابيس و الضباب
  { id: 'aea8078d-671a-43fe-bbb3-03272c6ea9af', category: 'Roman' },          // أبي الذي أكره
  { id: 'b091fa2d-0422-4b46-a647-8a9237eddffd', category: 'Roman' },          // العرجاء - Oussama Al Moslim
  { id: 'b1846c8c-182d-41bb-bdb6-58a845c64060', category: 'Roman' },          // قواعد جارتين
  { id: 'b5939fe8-b060-4020-af8d-979ad0249b79', category: 'Roman' },          // عرين الأسد - Oussama Al Moslim
  { id: 'b759967b-ba8d-454e-81c4-bdf6409839f3', category: 'Roman' },          // ممتلئ بالفراغ
  { id: 'baab2775-53c3-4b7e-9553-1ac70010966c', category: 'Roman' },          // عداء الطائرة الورقية - Khaled Hosseini
  { id: 'bb562782-d2ac-48a1-ab89-139202509447', category: 'Roman' },          // أمواج أكما
  { id: 'be3f6076-4682-4c35-a51f-464212a8a8e2', category: 'Roman' },          // ارسس - Ahmed Al Hamdan
  { id: 'c1e6a1d3-f9c4-4713-8dac-2daba0e85d1a', category: 'Roman' },          // بساتين عربستان - Oussama Al Moslim
  { id: 'c3e6f475-ce2c-44fd-b0ce-1ce58dcaebe9', category: 'Roman' },          // بيت الخناس
  { id: 'c718ad41-491d-4a54-9a13-5fa4da409d35', category: 'Roman' },          // بالنيابة عنهم
  { id: 'cc40f487-0f3e-4d3f-b934-9ac93744ed37', category: 'Roman' },          // متلازمة فريجولي
  { id: 'fd59a477-8fc7-4ca3-8b5c-be7b26754de1', category: 'Roman' },          // رواية في قلبي انثى عبرية
  { id: '8e320ea5-4cbb-499f-9d75-0aceba807d5e', category: 'Roman' },          // آخر قهوة

  // Littérature classique
  { id: '735ebd7b-7da6-435b-9c75-f12e5beb24e0', category: 'Classique' },      // مذلون مهانون - Dostoïevski
  { id: '7b1afe06-5304-44bb-8678-66764fa3e7c7', category: 'Classique' },      // البؤساء - Victor Hugo
  { id: '7da8d8a7-58eb-4974-aac9-b5d5f22e1fe4', category: 'Classique' },      // الفقراء - Dostoïevski
  { id: '8a0c2c6b-ef25-45bc-953f-3e309d35499f', category: 'Classique' },      // التحول - Kafka
  { id: 'aa894430-7a74-4131-a100-6ed7eb7f9bc3', category: 'Classique' },      // الإخوة كارامازوف - Dostoïevski
  { id: 'b59c5267-ed97-4b78-b6b0-90b211e80e9f', category: 'Classique' },      // القوزاق
  { id: 'b47d94e0-f230-49cd-92e0-c8bd1a7fd60b', category: 'Classique' },      // سيرة حمار - Hassan Ourid
  { id: 'c212e586-dcf7-4286-8070-f13a5e956814', category: 'Classique' },      // صاحب الظل الطويل

  // Développement personnel
  { id: '71e9e6a5-f5fd-4956-8f29-fe686ee7e6ea', category: 'Développement personnel' }, // سيكولوجية المال - Morgan Housel
  { id: '7b749c28-b8e9-47d2-8bde-ee77a567f709', category: 'Développement personnel' }, // ابق قويا
  { id: '8d5e9a37-3fb5-4f1f-8002-4826a4ccf2f2', category: 'Développement personnel' }, // السلام عليك يا صاحبي - Adham Sharqawi
  { id: '9e49ef79-84f2-4042-80b0-e1b157b10470', category: 'Développement personnel' }, // Atomic Habits - James Clear
  { id: 'b0e85b74-7f3e-40c1-bd6b-09aea7c847e8', category: 'Développement personnel' }, // كيف تؤثر على الآخرين - Dale Carnegie
  { id: 'be47d117-ab9a-47eb-bb8f-d75172f7a3ec', category: 'Développement personnel' }, // السيطرة على المصير
  { id: 'fd30d852-c9ac-4714-abee-f1410a060917', category: 'Développement personnel' }, // لن يكسرني رجل

  // Psychologie
  { id: '8cf338e8-805d-49b7-8129-5936dea11320', category: 'Psychologie' },    // محاط بالمرضى النفسيين - Thomas Erikson
  { id: '8e828c9b-75b3-482e-adb5-ee43c005213f', category: 'Psychologie' },    // جلسات نفسية
  { id: 'f51d93c5-867a-4510-9d3b-9f36bb97b477', category: 'Psychologie' },    // الرجال من المريخ والنساء من الزهرة
  { id: 'af7b2e22-4b56-462a-949c-10d22de06d9f', category: 'Psychologie' },    // لماذا يتزوج الرجال العاهرات - Sherry Argov

  // Histoire / Biographie
  { id: '6cf34d24-34c3-42da-af88-d277dfefa6dc', category: 'Histoire' },       // تشي جيفارا
  { id: '83771861-aa65-46dd-b86d-ec79250b4995', category: 'Histoire' },       // تزممارت
  { id: 'ad290fd1-8c76-4813-b79a-fa0f31ff4932', category: 'Histoire' },       // السجينة
  { id: 'f64cf738-67a4-4fca-9bd8-e1277f8ca4da', category: 'Histoire' },       // مقدمة ابن خلدون

  // Littérature islamique / Spiritualité
  { id: '7365ff1d-f2bc-414f-bec3-4e1d5f07ea3c', category: 'Islamique' },     // ربيهم بآية و حديث
  { id: '946ec591-02cf-4f61-b3e7-f71f0399b9b4', category: 'Islamique' },     // رسائل من علي بن أبي طالب
  { id: 'afa09072-7f50-4f28-938f-0e9a1cc531aa', category: 'Islamique' },     // ان الله معنا

  // Thriller / Horreur
  { id: '7deb9fb8-0eae-4feb-abb5-a5121cf1faf5', category: 'Thriller' },      // نبي أرض الشمال

  // Autre / Divers
  { id: 'aa1a8fae-5d90-415a-a8ed-bb83ee18db53', category: 'Autre' },         // Bookmarks - riwaya (produit)
];

async function main() {
  console.log(`Catégorisation de ${categorizations.length} livres...`);
  let updated = 0;

  for (const item of categorizations) {
    await prisma.book.update({
      where: { id: item.id },
      data: { category: item.category },
    });
    updated++;
    console.log(`  [${updated}/${categorizations.length}] ${item.id} -> ${item.category}`);
  }

  console.log(`\nTerminé. ${updated} livres mis à jour.`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
