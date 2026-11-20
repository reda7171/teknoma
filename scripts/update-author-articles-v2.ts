import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const updatedArticles = [
    {
        slug: "osama-al-muslim-khawf-basatin-arabistan-guide",
        content: `
<h2>ظاهرة أسامة المسلم في المغرب: قراءة تحليلية</h2>
<p>لم يكن مشهد آلاف الشباب المغاربة وهم يصطفون لساعات طويلة في المعرض الدولي للكتاب (SIEL) بالرباط والدار البيضاء مجرد صدفة. أسامة المسلم لم يعد مجرد كاتب خيال، بل أصبح ظاهرة أدبية اكتسحت السوق المغربي بقوة. في مكتبة <strong>PetsUnivers</strong>، نلاحظ يومياً الإقبال الهائل على رواياته، والسبب بسيط: الرجل يعرف كيف يربط الرعب النفسي بأساطير الجن التي تلامس ثقافتنا الشعبية.</p>

<h2>رأينا التحريري: سلسلة خوف أم بساتين عربستان؟</h2>
<p>كثيراً ما يسألنا القراء في رسائلهم على إنستغرام: "من أين أبدأ؟".
إذا كنت تبحث عن الرعب السريع، الصدمات المتتالية، وعالم الجن والشياطين المظلم، فابدأ بـ <strong>سلسلة خوف</strong>. الPetsUnivers تلعب على وتر الفضول البشري للعالم الخفي.
أما إذا كنت من عشاق الملاحم التاريخية الطويلة، والصراعات المليئة بالمكائد (على غرار صراع العروش ولكن بلمسة عربية خالصة)، فـ <strong>بساتين عربستان</strong> هي خيارك الأمثل. شخصيات مثل دعجاء وأفسار ستعلق في ذهنك طويلاً.</p>

<div class="not-prose my-10 p-8 bg-amber-50 rounded-2xl border-2 border-amber-200 text-center shadow-sm">
    <h3 class="text-2xl font-bold text-amber-900 mb-3">هل أنت مستعد لدخول عوالم أسامة المسلم؟ 👻</h3>
    <p class="mb-6 text-amber-800 text-lg">نوفر لك في مكتبة PetsUnivers السلسلة كاملة بطبعاتها الأصلية. اطلبها الآن واستفد من التوصيل السريع لجميع مدن المغرب مع الدفع عند الاستلام (COD)!</p>
    <a href="#related-books" class="inline-block bg-amber-600 text-white font-bold py-3 px-8 rounded-full hover:bg-amber-700 transition transform hover:scale-105 shadow-md text-lg">تصفح روايات أسامة المسلم 👇</a>
</div>

<h2>نصيحة مكتبة PetsUnivers</h2>
<p>لا تقرأ لأسامة المسلم ليلاً إذا كنت سريع التأثر! والأهم، التزم بالترتيب الزمني لإصدارات سلسلة بساتين عربستان (بساتين عربستان، عصبة الشياطين، رياح هجر، العرجاء، الساحرة الهجينة، عرين الأسد) لكي لا تحرق على نفسك متعة اكتشاف تطور الشخصيات.</p>
        `
    },
    {
        slug: "amr-abdelhamid-ard-zikola-rules",
        content: `
<h2>عمرو عبد الحميد: لماذا نعشق زيكولا في المغرب؟</h2>
<p>منذ سنوات، وPetsUnivers <strong>أرض زيكولا</strong> تتصدر قوائم المبيعات لدينا في مكتبة <strong>PetsUnivers</strong>. السر ليس فقط في أسلوب عمرو عبد الحميد السلس، بل في الفكرة العبقرية التي لامستنا جميعاً: ماذا لو كانت عملتك هي ذكاؤك، والفقر يعني الغباء والموت؟ هذه الفكرة الفلسفية المغلفة بطابع الفانتازيا جعلت من الPetsUnivers مادة دسمة للنقاش في نوادي القراءة من طنجة إلى الكويرة.</p>

<h2>مراجعة فريق PetsUnivers للثلاثية</h2>
<p>لقد قرأنا الثلاثية كاملة، ويمكننا القول بكل ثقة إن الكاتب تطور بشكل مذهل من الجزء الأول (أرض زيكولا) إلى الجزء الثاني (أماريتا)، وصولاً إلى الخاتمة الملحمية (وادي الذئاب المنسية). الحبكة تصبح أكثر تعقيداً، والصراعات السياسية بين المدن الخيالية تأخذ طابعاً أكثر نضجاً.</p>

<div class="not-prose my-10 p-8 bg-amber-50 rounded-2xl border-2 border-amber-200 text-center shadow-sm">
    <h3 class="text-2xl font-bold text-amber-900 mb-3">اكتشف قوانين زيكولا وجارتين 🧠</h3>
    <p class="mb-6 text-amber-800 text-lg">سواء كنت في الدار البيضاء، الرباط أو أكادير، نوفر لك ثلاثية زيكولا وقواعد جارتين بأفضل الأسعار. الدفع عند الاستلام دائماً!</p>
    <a href="#related-books" class="inline-block bg-amber-600 text-white font-bold py-3 px-8 rounded-full hover:bg-amber-700 transition transform hover:scale-105 shadow-md text-lg">اطلب السلسلة الآن 👇</a>
</div>

<h2>توصياتنا لاختيار كتابك القادم</h2>
<p>إذا كنت مبتدئاً في القراءة، أو تعاني من "بلوك القراءة" (Reading Slump)، فنحن في مكتبة PetsUnivers ننصحك بشدة بالبدء بأرض زيكولا. إيقاعها السريع سيجعلك تنهيها في جلسة أو جلستين. وبعدها، لا تتردد في الغوص في ثنائية <strong>قواعد جارتين</strong> التي نعتبرها، على الصعيد التحريري، أكثر عمقاً وسوداوية.</p>
        `
    },
    {
        slug: "ahmed-khaled-mostafa-antichristos-secrets",
        content: `
<h2>أنتيخريستوس: الPetsUnivers التي أحدثت زلزالاً في الجامعات المغربية</h2>
<p>إذا تجولت في أي حي جامعي مغربي، أو سألت القراء الشباب عن الPetsUnivers التي غيرت نظرتهم للتاريخ، فاسم <strong>أحمد خالد مصطفى</strong> سيتردد كثيراً. رواياته، وعلى رأسها "أنتيخريستوس"، ليست مجرد كتب، بل هي ظاهرة حقيقية. في <strong>PetsUnivers</strong>، نلاحظ دائماً أن القارئ الذي يشتري أنتيخريستوس، يعود سريعاً لطلب "أرض السافلين".</p>

<h2>رأينا الصريح: بين الحقيقة والخيال</h2>
<p>من الناحية التحريرية، أسلوب أحمد خالد مصطفى مستفز وذكي. هو يمسك بخيوط التاريخ، الأديان، الماسونية والسحر، وينسج منها قصة تبدو حقيقية لدرجة مرعبة. نصيحتنا لك كقارئ: استمتع بالحبكة الدرامية المتقنة، والجو السوداوي، ولكن تذكر دائماً أنك تقرأ "PetsUnivers" وليس مرجعاً تاريخياً معتمداً. هذا هو سر الاستمتاع الحقيقي بأعماله.</p>

<h2>مختارات PetsUnivers من أعمال الكاتب</h2>
<ul>
    <li><strong>أنتيخريستوس (1 و 2):</strong> جرعة مكثفة من المؤامرات التاريخية عبر العصور.</li>
    <li><strong>أرض السافلين:</strong> إذا كنت مهتماً بعالم الديب ويب (الإنترنت المظلم)، فهذه الPetsUnivers ستصيبك بالقشعريرة.</li>
    <li><strong>مطرقة الساحرات:</strong> دمج رائع بين محاكم التفتيش الحقيقية والخيال المرعب.</li>
</ul>

<div class="not-prose my-10 p-8 bg-amber-50 rounded-2xl border-2 border-amber-200 text-center shadow-sm">
    <h3 class="text-2xl font-bold text-amber-900 mb-3">اغص في عوالم أحمد خالد مصطفى المظلمة 👁️</h3>
    <p class="mb-6 text-amber-800 text-lg">كل إصدارات الكاتب متوفرة لدينا في مكتبة PetsUnivers، جاهزة للشحن السريع لأي مدينة مغربية.</p>
    <a href="#related-books" class="inline-block bg-amber-600 text-white font-bold py-3 px-8 rounded-full hover:bg-amber-700 transition transform hover:scale-105 shadow-md text-lg">تصفح الكتب الآن 👇</a>
</div>
        `
    },
    {
        slug: "adham-charqawi-biographie-livres-islam",
        content: `
<h2>أدهم شرقاوي: رفيق القراء في المغرب خلال رمضان وطوال العام</h2>
<p>في مكتبة <strong>PetsUnivers</strong>، نعتبر كتب أدهم شرقاوي (المعروف بـ "قس بن ساعدة") من الأساسيات التي لا غنى عنها في أي مكتبة منزلية مغربية. كتاباته تشهد إقبالاً استثنائياً، خاصة في شهر رمضان، بفضل لغته العربية العذبة، الخالية من التعقيد، وقدرته العجيبة على تقديم العبر الدينية والدنيوية في قالب قصصي لطيف يلامس القلوب.</p>

<h2>لماذا نرشح كتبه بقوة؟ (رأي فريق PetsUnivers)</h2>
<p>الكثير من زبنائنا يطلبون ترشيحات لكتب "تريح النفس" أو "ترمم الروح بعد خيبة أمل". جوابنا دائماً يكون: أدهم شرقاوي. ما يعجبنا في أسلوبه أنه لا يلعب دور الواعظ القاسي، بل يكتب كصديق يربت على كتفك. كتبه مثل "إلى المنكسرة قلوبهم" و"رسائل من القرآن" تعتبر جرعات من الطمأنينة.</p>

<h2>دليلك لاختيار كتابك الأول لأدهم شرقاوي</h2>
<ul>
    <li><strong>للبحث عن السكينة:</strong> "رسائل من القرآن" - تأملات قرآنية خفيفة وعميقة في نفس الوقت.</li>
    <li><strong>لتضميد الجراح:</strong> "إلى المنكسرة قلوبهم" - نصوص قصيرة ودافئة جداً.</li>
    <li><strong>لعشاق السرد الممتع:</strong> "نطفة" و "نبض" - روايات تمزج الحب بالحرب والقيم الإنسانية.</li>
</ul>

<div class="not-prose my-10 p-8 bg-amber-50 rounded-2xl border-2 border-amber-200 text-center shadow-sm">
    <h3 class="text-2xl font-bold text-amber-900 mb-3">رمم روحك مع كلمات أدهم شرقاوي 🌿</h3>
    <p class="mb-6 text-amber-800 text-lg">اطلب مجموعتك المفضلة الآن من مكتبة PetsUnivers، واستمتع بتجربة قراءة دافئة. التوصيل متوفر لجميع أنحاء المغرب مع خاصية الدفع عند الاستلام.</p>
    <a href="#related-books" class="inline-block bg-amber-600 text-white font-bold py-3 px-8 rounded-full hover:bg-amber-700 transition transform hover:scale-105 shadow-md text-lg">اكتشف كتب أدهم شرقاوي 👇</a>
</div>
        `
    }
]

async function main() {
    console.log("Mise à jour des articles avec le contenu éditorial marocain (PetsUnivers)...")
    for (const article of updatedArticles) {
        try {
            await prisma.post.update({
                where: { slug: article.slug },
                data: { content: article.content }
            })
            console.log(`✅ Article mis à jour : \${article.slug}`)
        } catch (e) {
            console.log(`❌ Erreur pour \${article.slug}:`, e)
        }
    }
    console.log("Terminé !")
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect()
    })
