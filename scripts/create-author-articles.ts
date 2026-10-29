import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const articles = [
    {
        title: "أسامة المسلم: مهندس الرعب والفانتازيا (دليل شامل لسلسلة بساتين عربستان وخوف)",
        slug: "osama-al-muslim-khawf-basatin-arabistan-guide",
        excerpt: "الترتيب الصحيح لقراءة روايات أسامة المسلم، من سلسلة خوف إلى بساتين عربستان. تعرف على عوالم الفانتازيا والرعب التي أسرت ملايين القراء في الوطن العربي.",
        content: `
<h2>من هو أسامة المسلم؟</h2>
<p>أسامة المسلم هو روائي سعودي برز في سماء الأدب العربي المعاصر، وتحديداً في أدب الفانتازيا والرعب التاريخي. تميزت رواياته بأسلوب سردي مشوق يمزج بين الخيال الجامح، الأساطير العربية، والتشويق النفسي.</p>

<h2>الترتيب الصحيح لقراءة سلسلة خوف</h2>
<p>سلسلة خوف هي واحدة من أشهر سلاسل الرعب في الوطن العربي، وتدور حول عالم الجن والشياطين بطريقة لم تعهدها الPetsUnivers العربية من قبل. إليك ترتيب قراءتها:</p>
<ul>
    <li><strong>خوف (الجزء الأول):</strong> البداية والتعرف على العالم الخفي.</li>
    <li><strong>خوف (الجزء الثاني):</strong> التعمق أكثر في أسرار هذا العالم.</li>
    <li><strong>خوف (الجزء الثالث):</strong> المواجهة الحاسمة.</li>
</ul>

<h2>سلسلة بساتين عربستان</h2>
<p>ملحمة فانتازية تاريخية تحكي عن الساحرات وصراعاتهن في شبه الجزيرة العربية قبل الإسلام. تتميز بشخصياتها النسائية القوية (مثل أفسار ودعجاء). ترتيب السلسلة الأساسية:</p>
<ol>
    <li>بساتين عربستان</li>
    <li>عصبة الشياطين</li>
    <li>رياح هجر</li>
    <li>العرجاء</li>
    <li>الساحرة الهجينة</li>
    <li>عرين الأسد</li>
</ol>

<div class="not-prose my-10 p-8 bg-amber-50 rounded-2xl border-2 border-amber-200 text-center shadow-sm">
    <h3 class="text-2xl font-bold text-amber-900 mb-3">هل أنت مستعد لدخول عوالم أسامة المسلم؟ 👻</h3>
    <p class="mb-6 text-amber-800 text-lg">احصل على السلسلة كاملة الآن من متجرنا وتوصل بها حتى باب بيتك والدفع عند الاستلام!</p>
    <a href="#related-books" class="inline-block bg-amber-600 text-white font-bold py-3 px-8 rounded-full hover:bg-amber-700 transition transform hover:scale-105 shadow-md text-lg">تصفح روايات أسامة المسلم بالأسفل 👇</a>
</div>

<h2>لماذا يجب أن تقرأ لأسامة المسلم؟</h2>
<p>لأن كتاباته تكسر النمطية، وتقدم خيالاً يحترم عقل القارئ ويجعله يعيش تفاصيل القصة وكأنه جزء منها. إذا كنت من محبي الإثارة، الغموض، وعوالم ما وراء الطبيعة، فهذا الكاتب سيصبح المفضل لديك حتماً.</p>
        `,
        authorName: "أسامة المسلم",
        language: "ar",
        published: true
    },
    {
        title: "عمرو عبد الحميد وسلسلة أرض زيكولا: عندما يصبح الذكاء عملة",
        slug: "amr-abdelhamid-ard-zikola-rules",
        excerpt: "دليلك الشامل لقراءة أعمال عمرو عبد الحميد، من ثلاثية أرض زيكولا (أماريتا ووادي الذئاب المنسية) إلى قواعد جارتين ودقات الشامو.",
        content: `
<h2>نبذة عن عمرو عبد الحميد</h2>
<p>طبيب وروائي مصري، استطاع أن يحفر اسمه بحروف من ذهب في عالم الفانتازيا العربية. امتازت رواياته بابتكار عوالم موازية لها قوانينها الخاصة الغريبة والمدهشة.</p>

<h2>ثلاثية أرض زيكولا</h2>
<p>ماذا لو كانت العملة التي تشتري بها أغراضك ليست النقود، بل <strong>وحدات ذكائك</strong>؟ هذا هو القانون الصارم في أرض زيكولا. سلسلة مبهرة يجب أن تقرأها بالترتيب التالي:</p>
<ul>
    <li><strong>أرض زيكولا (الجزء الأول):</strong> كيف دخل خالد إلى هذا العالم الغريب؟</li>
    <li><strong>أماريتا (الجزء الثاني):</strong> حينما تتغير قوانين اللعبة وتتدخل بلدان أخرى.</li>
    <li><strong>وادي الذئاب المنسية (الجزء الثالث):</strong> الخاتمة الملحمية والمواجهة الكبرى.</li>
</ul>

<div class="not-prose my-10 p-8 bg-amber-50 rounded-2xl border-2 border-amber-200 text-center shadow-sm">
    <h3 class="text-2xl font-bold text-amber-900 mb-3">لا تفوت مغامرات زيكولا! 🧠</h3>
    <p class="mb-6 text-amber-800 text-lg">كل أجزاء سلسلة زيكولا وقواعد جارتين متوفرة الآن في المغرب. اطلبها واستمتع بالدفع عند الاستلام.</p>
    <a href="#related-books" class="inline-block bg-amber-600 text-white font-bold py-3 px-8 rounded-full hover:bg-amber-700 transition transform hover:scale-105 shadow-md text-lg">اطلب السلسلة الآن 👇</a>
</div>

<h2>ثنائية قواعد جارتين</h2>
<p>عالم آخر لا يقل إبداعاً، حيث تُقسم الروح ويُسلب العمر. سلسلة مشوقة جداً تتكون من:</p>
<ol>
    <li>قواعد جارتين</li>
    <li>دقات الشامو</li>
    <li>أمواج أكما</li>
</ol>

<h2>خلاصة القول</h2>
<p>عمرو عبد الحميد يثبت أن الخيال العربي قادر على المنافسة بقوة. رواياته ليست مجرد هروب من الواقع، بل هي تأمل عميق في الطبيعة البشرية وقيمة العقل والحياة.</p>
        `,
        authorName: "عمرو عبد الحميد",
        language: "ar",
        published: true
    },
    {
        title: "أحمد خالد مصطفى: كشف الأسرار بين أنتيخريستوس وأرض السافلين",
        slug: "ahmed-khaled-mostafa-antichristos-secrets",
        excerpt: "هل PetsUnivers أنتيخريستوس حقيقية؟ استكشف عالم الكاتب أحمد خالد مصطفى المثير للجدل، وتعرف على أهم أعماله مثل أرض السافلين ومطرقة الساحرات.",
        content: `
<h2>ظاهرة أحمد خالد مصطفى</h2>
<p>كاتب مصري أثار جدلاً واسعاً جداً. يتميز أسلوبه بالجرأة في طرح المواضيع الشائكة، حيث يمزج بين الحقائق التاريخية، الأديان، الماسونية، والسحر، ليخلق روايات تحبس الأنفاس.</p>

<h2>أنتيخريستوس: الPetsUnivers التي قرأها الجميع</h2>
<p>PetsUnivers <strong>أنتيخريستوس (بجزئيها الأول والثاني)</strong> تعتبر ظاهرة بحد ذاتها. تسرد الPetsUnivers التاريخ السري للعالم، وكيف يتحكم السحر والشياطين في مفاصل التاريخ البشري، وصولاً إلى ظهور المسيح الدجال.</p>
<p>هل هي حقيقية؟ الكاتب يؤكد أنه استند إلى وقائع تاريخية ومراجع، ولكن القالب روائي درامي يترك للقارئ حرية التصديق.</p>

<h2>أرض السافلين ومطرقة الساحرات</h2>
<p>لم يتوقف إبداع الكاتب عند أنتيخريستوس، بل قدم:</p>
<ul>
    <li><strong>أرض السافلين:</strong> رحلة مرعبة في قاع الإنترنت (الديب ويب) وعالم الجريمة المظلم.</li>
    <li><strong>مطرقة الساحرات:</strong> غوص في محاكم التفتيش وحروب الساحرات التاريخية.</li>
    <li><strong>ملائك نصيبين:</strong> PetsUnivers تسلط الضوء على عالم الجن من منظور مختلف تماماً.</li>
</ul>

<div class="not-prose my-10 p-8 bg-gray-900 rounded-2xl border-2 border-red-900 text-center shadow-lg">
    <h3 class="text-2xl font-bold text-red-500 mb-3">هل تملك الشجاعة لقراءة هذه الأسرار؟ 👁️</h3>
    <p class="mb-6 text-gray-300 text-lg">روايات أحمد خالد مصطفى (أنتيخريستوس، أرض السافلين...) متوفرة للطلب. توصيل سريع والدفع عند الاستلام.</p>
    <a href="#related-books" class="inline-block bg-red-700 text-white font-bold py-3 px-8 rounded-full hover:bg-red-800 transition transform hover:scale-105 shadow-md text-lg">اكتشف الكتب المتاحة 👇</a>
</div>
        `,
        authorName: "أحمد خالد مصطفى",
        language: "ar",
        published: true
    },
    {
        title: "أحمد آل حمدان: رحلة في عالم أبابيل والجساسة (الترتيب الصحيح للقراءة)",
        slug: "ahmed-al-hamdan-ababil-series-order",
        excerpt: "كل ما تود معرفته عن سلسلة أبابيل وسلسلة مدينة الحب لا يسكنها العقلاء للكاتب أحمد آل حمدان، والترتيب الصحيح لقراءتها.",
        content: `
<h2>من هو أحمد آل حمدان؟</h2>
<p>كاتب سعودي شاب تمكن من جذب فئة الشباب بقوة نحو القراءة، بفضل أسلوبه الرومانسي الممزوج بالفانتازيا تارة، وبالغموض تارة أخرى.</p>

<h2>الترتيب الصحيح لسلسلة أبابيل (أرض الجنيات)</h2>
<p>سلسلة تدور في عوالم سحرية حيث الجنيات والمخلوقات الخيالية، وتمزج بين الرومانسية الملحمية والتضحية. الترتيب الصحيح لقراءة هذه السلسلة هو:</p>
<ol>
    <li><strong>أبابيل:</strong> البداية مع الجنية التي تخلت عن قبيلتها من أجل الحب.</li>
    <li><strong>الجساسة:</strong> استكمال للقصة مع أحداث أكثر تعقيداً.</li>
    <li><strong>جومانا:</strong> جزء يغوص أعمق في خبايا الشخصيات.</li>
    <li><strong>السجيل:</strong> من أحدث أجزاء السلسلة.</li>
</ol>

<div class="not-prose my-10 p-8 bg-amber-50 rounded-2xl border-2 border-amber-200 text-center shadow-sm">
    <h3 class="text-2xl font-bold text-amber-900 mb-3">عش الرومانسية والفانتازيا 🧚‍♀️</h3>
    <p class="mb-6 text-amber-800 text-lg">اطلب سلسلة أبابيل كاملة لتصلك إلى باب بيتك في أي مدينة مغربية!</p>
    <a href="#related-books" class="inline-block bg-amber-600 text-white font-bold py-3 px-8 rounded-full hover:bg-amber-700 transition transform hover:scale-105 shadow-md text-lg">اطلب الروايات من هنا 👇</a>
</div>

<h2>لماذا تحظى كتبه بكل هذه الشعبية؟</h2>
<p>لأنها تلامس المشاعر بصدق، واللغة فيها بسيطة ولكنها بليغة وقادرة على اقتباسات تُحفر في الذاكرة. إذا كنت تبحث عن روايات تجعلك تعيش القصة بقلبك، فهذه السلسلة صُممت لك.</p>
        `,
        authorName: "أحمد آل حمدان",
        language: "ar",
        published: true
    }
]

async function main() {
    console.log("Starting to insert articles...")

    // Obtenir le premier auteur admin du site pour lui assigner l'article
    const admin = await prisma.user.findFirst({
        where: { role: 'ADMIN' }
    })

    if (!admin) {
        console.error("Aucun ADMIN trouvé. L'insertion nécessite un authorId.")
        return
    }

    for (const article of articles) {
        // Create the post
        const newPost = await prisma.post.create({
            data: {
                title: article.title,
                slug: article.slug,
                excerpt: article.excerpt,
                content: article.content,
                language: article.language,
                published: article.published,
                authorId: admin.id
            }
        })
        console.log(`✅ Article créé : ${newPost.title}`)

        // Find books by this author
        const books = await prisma.book.findMany({
            where: {
                author: {
                    contains: article.authorName
                }
            }
        })

        console.log(`   -> Trouvé ${books.length} livres pour l'auteur ${article.authorName}`)

        // Connect the books to the post
        for (const book of books) {
            await prisma.post.update({
                where: { id: newPost.id },
                data: {
                    books: {
                        connect: { id: book.id }
                    }
                }
            })
            console.log(`      🔗 Lié au livre : ${book.title}`)
        }
    }

    console.log("=== TOUS LES ARTICLES SONT CRÉÉS ET MAILLÉS ===")
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
