const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const updates = [
    { title: 'الحرب والسلام 1/2', author: 'ليو تولستوي' },
    { title: 'الاهانة', author: 'المهدي المنجرة' }, // matched exactly with what was outputted in get-unknown-books.js
    { title: 'أسفار الشياطين', author: 'سامح شوقي' },
    { title: 'ابق قويا', author: 'ديمي لوفاتو' },
    { title: 'تزممارت', author: 'أحمد المرزوقي' },
    { title: 'القوزاق', author: 'ليو تولستوي' },
    { title: 'رواية في قلبي انثى عبرية', author: 'خولة حمدي' } // exactly as in DB output
];

async function run() {
    let totalUpdated = 0;
    
    for (const update of updates) {
        const result = await prisma.book.updateMany({
            where: { title: update.title, author: 'Auteur inconnu' },
            data: { author: update.author }
        });
        if (result.count > 0) {
            console.log(`Updated "${update.title}" to author: ${update.author}`);
            totalUpdated += result.count;
        }
    }

    console.log(`Total books updated: ${totalUpdated}`);
}

run()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
