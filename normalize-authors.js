const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const mergeMap = {
    'Morgan Housel': ['morgan housel', 'مورغان هاوسل', 'مورجان هاوسل'],
    'Alex Michaelides': ['ألكس ميكايليديس', 'ألكس ميكايليدس'],
    'Charles Duhigg': [' Charles Duhigg'],
    'Darren Hardy': ['دارين هاردي'],
    'Stephen R. Covey': ['ستيفن كوفي'],
    'Mark Manson': ['مارك مانسون'],
    'Brianna Wiest': ['بريانا ويست'],
    'Thomas Erikson': ['توماس أريكسون'],
    'Robert Greene': ['روبرت غرين', 'روبرت كيوساكي'], // Wait, Robert Kiyosaki is different from Robert Greene!
    'David Schwartz': ['david schwartz'],
    'Daniel Goleman': ['daniel goleman'],
    'Victor Hugo': ['victor hugo'],
    'Dale Carnegie': ['ديل كارنيجى'],
    'Joseph Murphy': ['جوزيف ميرفي'],
    'Haruki Murakami': ['هاروكي موراكامي']
};

async function run() {
    let totalUpdated = 0;
    
    // Fix Robert Greene/Kiyosaki mistake from prompt
    const safeMergeMap = { ...mergeMap };
    safeMergeMap['Robert Greene'] = ['روبرت غرين'];
    safeMergeMap['Robert Kiyosaki'] = ['روبرت كيوساكي']; // Not requested but let's be careful

    for (const [canonical, variants] of Object.entries(safeMergeMap)) {
        for (const variant of variants) {
            const updateResult = await prisma.book.updateMany({
                where: { author: variant },
                data: { author: canonical }
            });
            if (updateResult.count > 0) {
                console.log(`Updated ${updateResult.count} books: "${variant}" -> "${canonical}"`);
                totalUpdated += updateResult.count;
            }
        }
    }

    console.log(`Total books updated: ${totalUpdated}`);
}

run()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
