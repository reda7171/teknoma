const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // 1. Get an admin user
    const admin = await prisma.user.findFirst({
        where: { role: 'ADMIN' }
    });

    if (!admin) {
        console.error("Aucun administrateur trouvé pour être l'auteur.");
        return;
    }

    const articles = [
        {
            title: "أفضل 5 كتب في علم النفس وتطوير الذات ستغير نظرتك للحياة",
            slug: "meilleurs-livres-psychologie-developpement-personnel",
            language: "ar",
            category: "تطوير الذات",
            tags: "علم النفس, تطوير الذات, صحة نفسية",
            excerpt: "اكتشف أفضل كتب علم النفس وتطوير الذات التي ستساعدك على فهم نفسك وتحقيق السلام الداخلي.",
            content: "<h2>المقدمة</h2><p>اكتب هنا مقدمة عن أهمية الصحة النفسية...</p><h2>1. اكتب حتى لا اصاب بالجنون - مريم الحيسي</h2><p>تحدث عن هذا الكتاب هنا واضف الرابط...</p><h2>2. كلنا مرضى نفسيين - إسماعيل عرفة</h2><p>تحدث عن الكتاب هنا...</p><h2>3. ان الله معنا - فهد البشارة</h2><p>تحدث عن الكتاب هنا...</p><h2>4. أخطاء التربية - شيماء علي</h2><p>تحدث عن الكتاب هنا...</p>",
        },
        {
            title: "كيف تبدأ مشروعك من الصفر؟ أهم كتب البيع والبزنس في 2024",
            slug: "comment-commencer-projet-zero-livres-business-alex-hormozi",
            language: "ar",
            category: "المال والأعمال",
            tags: "بزنس, ريادة أعمال, مبيعات, أليكس هرموزي",
            excerpt: "تعرف على أهم الكتب التي ستساعدك في بناء مشروعك الخاص وزيادة مبيعاتك، بما في ذلك كتب أليكس هرموزي.",
            content: "<h2>المقدمة</h2><p>ريادة الأعمال تتطلب معرفة قوية...</p><h2>1. $100M Offers - Alex Hormozi</h2><p>كيف تصنع عروض لا تقاوم...</p><h2>2. $100M Money models - Alex Hormozi</h2><p>نماذج مالية ناجحة...</p>",
        },
        {
            title: "لعشاق الغموض والتشويق: 5 روايات عربية حديثة ستحبس أنفاسك",
            slug: "top-5-romans-arabes-modernes-thriller-mystere",
            language: "ar",
            category: "روايات",
            tags: "روايات, تشويق, غموض, رعب",
            excerpt: "قائمة بأفضل روايات التشويق والغموض العربية الحديثة التي لن تستطيع التوقف عن قراءتها.",
            content: "<h2>المقدمة</h2><p>إذا كنت من محبي الإثارة...</p><h2>1. الجساسة - أحمد آل حمدان</h2><p>رواية تحبس الأنفاس...</p><h2>2. ستوكهولم و البارون - شهد قربان</h2><p>إثارة نفسية...</p><h2>3. نامت الأعين واستيقظت الوحوش</h2><p>رعب وتشويق...</p><h2>4. مملكة الكوابيس والضباب - سما سامي</h2><p>خيال مظلم...</p>",
        },
        {
            title: "من الخبز الحافي إلى ليطمئن قلبي.. كتب عربية يجب أن تقرأها مرة في حياتك",
            slug: "livres-arabes-classiques-incontournables-lire-absolument",
            language: "ar",
            category: "الأدب الكلاسيكي",
            tags: "أدب, كلاسيكيات, روحانيات, ثقافة",
            excerpt: "رحلة أدبية مع أعظم الكتب العربية التي تلامس الروح والعقل.",
            content: "<h2>المقدمة</h2><p>الأدب العربي مليء بالكنوز...</p><h2>1. الخبز الحافي - محمد شكري</h2><p>رائعة الأدب المغربي...</p><h2>2. ليطمئن قلبي - أدهم شرقاوي</h2><p>رحلة روحانية...</p><h2>3. رسائل من علي بن أبي طالب</h2><p>حكمة الأجيال...</p><h2>4. تحت مسمى الرجولة و جمرة</h2><p>دراما اجتماعية وعلاقات...</p>",
        }
    ];

    console.log("Création des articles en cours...");

    for (const article of articles) {
        // Add random string to slug to avoid duplicates if run multiple times
        const uniqueSlug = article.slug + '-' + Math.floor(Math.random() * 1000);
        
        await prisma.post.create({
            data: {
                title: article.title,
                slug: uniqueSlug,
                content: article.content,
                excerpt: article.excerpt,
                language: article.language,
                category: article.category,
                tags: article.tags,
                authorId: admin.id,
                authorName: "Riwaya Team",
                published: false, // Draft mode
            }
        });
        console.log(`✅ Article créé: ${article.title}`);
    }

    console.log("🎉 Terminé ! Retrouvez ces articles dans l'interface Admin > Blog (en tant que brouillons).");
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
