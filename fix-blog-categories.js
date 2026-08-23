const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const translations = {
    fr: {
        'General': 'Général',
        'تطوير الذات': 'Développement Personnel',
        'روايات': 'Roman & Fiction',
        'المال والأعمال': 'Business & Finance',
        'الأدب الكلاسيكي': 'Littérature Classique'
    },
    ar: {
        'Histoire & Biographie': 'تاريخ وسيرة ذاتية',
        'General': 'عام',
        'Roman & Fiction': 'روايات وخيال',
        'Psychologie': 'علم النفس',
        'Développement Personnel': 'تطوير الذات'
    },
    en: {
        'Général': 'General',
        'عام': 'General',
        'تاريخ وسيرة ذاتية': 'History & Biography',
        'Histoire & Biographie': 'History & Biography',
        'روايات وخيال': 'Romance & Fiction',
        'Roman & Fiction': 'Romance & Fiction',
        'علم النفس': 'Psychology',
        'Psychologie': 'Psychology',
        'تطوير الذات': 'Personal Development',
        'Développement Personnel': 'Personal Development',
        'مراجعات الكتب': 'Book Reviews'
    }
};

async function main() {
    const posts = await prisma.post.findMany();
    
    for (const post of posts) {
        if (!post.category) continue;
        
        const lang = post.language;
        if (translations[lang] && translations[lang][post.category]) {
            const newCategory = translations[lang][post.category];
            await prisma.post.update({
                where: { id: post.id },
                data: { category: newCategory }
            });
            console.log(`Updated post ${post.id} in ${lang}: ${post.category} -> ${newCategory}`);
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
