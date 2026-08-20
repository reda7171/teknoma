const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const data = `The Power of Habits	English Non-Fiction	Self Help
أبابيل	Littérature	Livres en arabe
الخادمة تراقب الكتاب بالفرنسية	Littérature	Romans étrangers traduits
المراهق الجزء الأول و الثاني	Vie pratique	Développement personnel
رسائل إلى ميلينا	Littérature	Romans étrangers traduits
The Boyfriend	English Fiction	Thrillers & Horror
عالم بلا معالم	Littérature	Livres en arabe
عقدك النفسية سجنك الأبدي	Vie pratique	Développement personnel
Harry Potter وحجر الفيلسوف	Littérature	Romans étrangers traduits
$100M Leads	English Non-Fiction	Business
$100M Money Models	English Non-Fiction	Business
$100M Offers	English Non-Fiction	Business
005	Littérature	Livres en arabe
خوف 1 & 2 & 3	Littérature	Livres en arabe
الأبله 1 & 2	Littérature	Romans étrangers traduits
الجريمة والعقاب 1 & 2	Littérature	Romans étrangers traduits
الشياطين 1 & 2	Littérature	Romans étrangers traduits
101 Essays That Will Change the Way You Think	English Non-Fiction	Self Help
1984	Littérature	Romans étrangers traduits
The Rebel – Albert Camus	English Non-Fiction	Humanities
Antigone	Littérature	Théâtre
As Good as Dead	English Fiction	Thrillers & Horror
Brain Hacks	English Non-Fiction	Self Help
Can't Hurt Me	English Non-Fiction	Self Help
The Compound Effect	English Non-Fiction	Self Help
Dark Psychology and Manipulation	English Non-Fiction	Self Help
Ego Is the Enemy	English Non-Fiction	Self Help
Emotional Intelligence	English Non-Fiction	Self Help
Fearful	English Fiction	Thrillers & Horror
Good to Great	English Non-Fiction	Business
It Starts with Us	English Fiction	Adult & Dark Romance
L'Étranger	Littérature	Romans francophones
L’intelligence émotionnelle 1 & 2	Vie pratique	Développement personnel
La Boîte à merveilles	Littérature	Romans francophones
La Mémoire d'un roi	Littérature	Romans francophones
La Psy	Littérature	Romans francophones
Le Dernier Jour d'un condamné	Littérature	Romans francophones
Le Double	Littérature	Romans étrangers traduits
Le Joueur	Littérature	Romans étrangers traduits
Les Amants de Casablanca	Littérature	Littérature marocaine
Les Hommes viennent de Mars, les femmes viennent de Vénus	Vie pratique	Développement personnel
Les Pauvres Gens	Littérature	Romans étrangers traduits
Livre Cadeau	Littérature	Livres en arabe
Master Your Emotions	English Non-Fiction	Self Help
Resistance, Rebellion, and Death	English Non-Fiction	Humanities
Rich Dad Poor Dad	English Non-Fiction	Business
Rules of Life	English Non-Fiction	Self Help
Surrounded by Vampires	English Non-Fiction	Self Help
The 48 Laws of Power	English Non-Fiction	Self Help
The 7 Habits of Highly Effective People	English Non-Fiction	Self Help
The Art of War	English Non-Fiction	Humanities
The Darkest	English Fiction	Thrillers & Horror
The Housemaid	English Fiction	Thrillers & Horror
The Housemaid Is Watching	English Fiction	Thrillers & Horror
The Housemaid's Secret	English Fiction	Thrillers & Horror
The Magic of Thinking Big	English Non-Fiction	Self Help
The Mountain Is You	English Non-Fiction	Self Help
The Psychology of Money	English Non-Fiction	Business
The Rules of Love	English Non-Fiction	Self Help
The Seat of the Soul	English Non-Fiction	Self Help
The Silent Patient	English Fiction	Thrillers & Horror
Think and Grow Rich	English Non-Fiction	Business
Thinking, Fast and Slow	English Non-Fiction	Humanities
When You're Ready, This Is How You Heal	English Non-Fiction	Self Help
Zero to One	English Non-Fiction	Business
آخر قهوة	Littérature	Livres en arabe
آرسس	Littérature	Livres en arabe
آزر	Littérature	Livres en arabe
أبادول	Littérature	Livres en arabe
أبي الذي أكره	Vie pratique	Développement personnel
أحببت وغداً	Littérature	Livres en arabe
أخطاء التربية	Vie pratique	Développement personnel
أرض السافلين	Littérature	Livres en arabe
أرض زيكولا 1	Littérature	Livres en arabe
أسرار الخادمة – français	Littérature	Romans étrangers traduits
أسرار سورة البقرة	Littérature	Livres en arabe
أسرار عقل المليونير	Vie pratique	Développement personnel
أسفار الشياطين	Littérature	Livres en arabe
أسفار مريم المحرمة	Littérature	Livres en arabe
أغنى رجل في بابل	Vie pratique	Développement personnel
أفراح القبة	Littérature	Romans francophones
أفضل نسخة منك	Vie pratique	Développement personnel
أكتب حتى لا أنكسر	Vie pratique	Développement personnel
ألف شمس ساطعة	Littérature	Romans étrangers traduits
أماريتا – أرض زيكولا 2	Littérature	Livres en arabe
أمواج أكما	Littérature	Livres en arabe
أنتيخريستوس 1/2	Littérature	Livres en arabe
أيام في مكتبة موريساكي	Littérature	Romans étrangers traduits
أين المفر	Littérature	Livres en arabe
إلى المنكسرة قلوبهم	Littérature	Livres en arabe
إن ربي لطيف	Littérature	Livres en arabe
إنني أتعفن رعباً	Littérature	Livres en arabe
ابق قوياً	Vie pratique	Développement personnel
اعرف وجهك الآخر	Vie pratique	Développement personnel
أفول الغرب	Arts et sciences humaines	Histoire
اكتب حتى لا أصاب بالجنون	Vie pratique	Développement personnel
اكتب حتى لا يأكلني الشيطان	Vie pratique	Développement personnel
الأب الغني والأب الفقير	Vie pratique	Développement personnel
الأمير	Arts et sciences humaines	Sciences humaines
الإخوة كارامازوف	Littérature	Romans étrangers traduits
الإهانة	Littérature	Livres en arabe
البؤساء	Littérature	Romans étrangers traduits
البارون	Littérature	Livres en arabe
الجزار	Littérature	Livres en arabe
الجساسة	Littérature	Livres en arabe
الجلاد تحت جلدي	Littérature	Livres en arabe
الحرب والسلام	Littérature	Romans étrangers traduits
الحياة ليست رجلاً	Littérature	Livres en arabe
الخبز الحافي	Littérature	Littérature marocaine
الخيميائي	Littérature	Romans étrangers traduits
الداء والدواء	Littérature	Livres en arabe
الرجال من المريخ والنساء من الزهرة	Vie pratique	Développement personnel
الرحيق المختوم	Arts et sciences humaines	Histoire
الزمهرير	Littérature	Livres en arabe
الزوج الأبدي	Littérature	Romans étrangers traduits
الساحرة الهجينة	Littérature	Livres en arabe
السجيل	Littérature	Livres en arabe
السجينة	Littérature	Livres en arabe
السلام عليك يا صاحبي	Littérature	Livres en arabe
السماح بالرحيل	Vie pratique	Développement personnel
السيرة	Arts et sciences humaines	Histoire
السيطرة على المصير	Vie pratique	Développement personnel
الشاعر	Littérature	Livres en arabe
الشيطان يحكي	Littérature	Livres en arabe
العائد	Littérature	Livres en arabe
العادات الذرية	Vie pratique	Développement personnel
العادات السبع للناس الأكثر فعالية	Vie pratique	Développement personnel
العبرات	Littérature	Romans étrangers traduits
العرجاء	Littérature	Livres en arabe
العرش الأسود	Littérature	Livres en arabe
العرين	Littérature	Livres en arabe
العوسج	Littérature	Livres en arabe
الغريب	Littérature	Romans étrangers traduits
الفارق الذي تصنعه الأم	Vie pratique	Développement personnel
الفقراء	Littérature	Romans étrangers traduits
القادمون	Littérature	Livres en arabe
القوزاق	Littérature	Romans étrangers traduits
اللص والكلاب	Littérature	Livres en arabe
الليالي البيضاء	Littérature	Romans étrangers traduits
المريضة الصامتة	Littérature	Romans étrangers traduits
المزدوج	Littérature	Romans étrangers traduits
المسخ (التحول)	Littérature	Romans étrangers traduits
المقامر	Littérature	Romans étrangers traduits
النجاة من وهم العلاج والطب النفسي	Vie pratique	Santé & Bien-être
الهشاشة النفسية	Vie pratique	Santé & Bien-être
الهلكوت	Littérature	Livres en arabe
الوحش الذي يسكنك يمكن أن يكون لطيفاً	Vie pratique	Développement personnel
الوليمة	Littérature	Livres en arabe
إن الله معنا	Littérature	Livres en arabe
أول مرة أتدبر القرآن	Littérature	Livres en arabe
بالنيابة عنهم	Littérature	Livres en arabe
بساتين عربستان	Littérature	Livres en arabe
بيت الجمال	Littérature	Livres en arabe
بيت الخناس	Littérature	Livres en arabe
بيت خالتي	Littérature	Livres en arabe
تأثير المركب	Vie pratique	Développement personnel
تانجل 1 و2	Jeunesse	9-12 Years Old
تحت مسمى الرجولة	Vie pratique	Développement personnel
تروفانتس	Littérature	Livres en arabe
تزممارت	Littérature	Littérature marocaine
تشي جيفارا	Arts et sciences humaines	Histoire
ثلاثية غرناطة	Littérature	Livres en arabe
جريمة في رأس السيد هود	Littérature	Livres en arabe
جسمك يتذكر كل شيء	Vie pratique	Santé & Bien-être
جلسات نفسية	Vie pratique	Santé & Bien-être
جمالية الدين	Littérature	Livres en arabe
جمرة	Littérature	Livres en arabe
جومانا	Littérature	Livres en arabe
حديث الصباح	Littérature	Livres en arabe
حقل التفاح	Littérature	Livres en arabe
حلم العم	Littérature	Livres en arabe
حوار مع صديقي الملحد	Littérature	Livres en arabe
خمسون قانوناً للحب	Littérature	Livres en arabe
دقات الشامو	Littérature	Livres en arabe
ربيع قرطبة	Littérature	Livres en arabe
ربيهم بآية وحديث	Vie pratique	Spiritualité
رسائل من القرآن	Vie pratique	Spiritualité
رسائل من النبي	Vie pratique	Spiritualité
رسائل من علي بن أبي طالب	Vie pratique	Spiritualité
رسائل من عمر بن الخطاب	Vie pratique	Spiritualité
في قلبي أنثى عبرية	Littérature	Livres en arabe
رياح هجر	Littérature	Livres en arabe
زوجة رجل آخر وزوج تحت السرير	Littérature	Romans étrangers traduits
سارقة الكتب	Littérature	Romans étrangers traduits
ستوكهولم	Littérature	Livres en arabe
سجناء الـ1500 عام	Littérature	Livres en arabe
سفاح الأزقة	Littérature	Livres en arabe
سيرة حمار	Littérature	Livres en arabe
سيكولوجية الجماهير	Arts et sciences humaines	Sciences humaines
سيكولوجية المال	Vie pratique	Développement personnel
شمس منتصف الليل	Littérature	Livres en arabe
صاحب الظل الطويل	Littérature	Romans étrangers traduits
طغوت	Littérature	Livres en arabe
عالم صوفي	Littérature	Romans étrangers traduits
عداء الطائرة الورقية	Littérature	Romans étrangers traduits
عرين الأسد	Littérature	Livres en arabe
عشيرة برهوت	Littérature	Livres en arabe
عصبة الشياطين	Littérature	Livres en arabe
عصر الحب	Littérature	Livres en arabe
علمتني آية	Vie pratique	Spiritualité
فاتتني صلاة	Vie pratique	Spiritualité
فارس الأندلس	Littérature	Livres en arabe
فتى الأندلس	Littérature	Livres en arabe
فكر وازدد ثراء	Vie pratique	Développement personnel
فن الحرب	Arts et sciences humaines	Sciences humaines
فن اللامبالاة	Vie pratique	Développement personnel
فن إنفاق المال	Vie pratique	Développement personnel
فهم الأمراض النفسية منطقيًا	Vie pratique	Santé & Bien-être
فواصل	Littérature	Livres en arabe
قربان آل يونس	Littérature	Livres en arabe
قصاص	Littérature	Livres en arabe
قضية لوز مر	Littérature	Livres en arabe
قنديشة	Littérature	Livres en arabe
قواعد العشق الأربعون	Littérature	Romans étrangers traduits
قواعد جارتين	Littérature	Livres en arabe
قوانين التحرر من الصراع النفسي	Vie pratique	Développement personnel
قوة العادات	Vie pratique	Développement personnel
قوة عقلك الباطن	Vie pratique	Développement personnel
كافكا على الشاطئ	Littérature	Romans étrangers traduits
كتاب الخادمة بالعربية	Littérature	Romans étrangers traduits
Atomic Habits	English Non-Fiction	Self Help
مشروع بـ100 دولار	Vie pratique	Développement personnel
أربعون – أحمد الشقيري	Vie pratique	Spiritualité
سر الخادمة بالعربية	Littérature	Romans étrangers traduits
كفاحي	Arts et sciences humaines	Histoire
كل أزرق السماء	Littérature	Romans étrangers traduits
كلنا مرضى نفسيين	Vie pratique	Santé & Bien-être
كوني صحابية	Vie pratique	Spiritualité
كيف تؤثر على الآخرين وتكتسب الأصدقاء	Vie pratique	Développement personnel
كيف تربي طفلك القوي	Vie pratique	Développement personnel
كيف تربين رجلاً	Vie pratique	Développement personnel
لأنها كيارا	Littérature	Livres en arabe
لعنة أديمون	Littérature	Livres en arabe
لكنود	Littérature	Livres en arabe
لماذا يتزوج الرجال العاهرات	Vie pratique	Développement personnel
لماذا يسيء أبناؤنا التصرف؟	Vie pratique	Développement personnel
لن يكسرني رجل	Vie pratique	Développement personnel
ليطمئن قلبي	Littérature	Livres en arabe
مئة عام من العزلة	Littérature	Romans étrangers traduits
مائة من عظماء أمة الإسلام غيروا مجرى التاريخ	Arts et sciences humaines	Histoire
ماجدولين	Littérature	Livres en arabe
متعة التدبر	Vie pratique	Spiritualité
متلازمة فريجولي	Littérature	Livres en arabe
محاط بالحمقى	Vie pratique	Développement personnel
محاط بالمرضى النفسيين	Vie pratique	Santé & Bien-être
مدرسة محمد صلى الله عليه وسلم	Vie pratique	Spiritualité
مذكرات قبو	Littérature	Romans étrangers traduits
مذلون مهانون	Littérature	Romans étrangers traduits
مزرعة الحيوان	Littérature	Romans étrangers traduits
مطرقة الساحرات	Arts et sciences humaines	Histoire
معجزة الصباح	Vie pratique	Développement personnel
مقدمة ابن خلدون	Arts et sciences humaines	Sciences humaines
ملائك نصيبين	Littérature	Livres en arabe
ممتلئ بالفراغ	Vie pratique	Développement personnel
مملكة الكوابيس والضباب	Littérature	Livres en arabe
مينتو	Littérature	Livres en arabe
نامت الأعين واستيقظت الوحوش	Littérature	Livres en arabe
نبي أرض الشمال	Littérature	Livres en arabe
نساء على أجنحة الحلم	Littérature	Livres en arabe
نظرية الفستق	Vie pratique	Développement personnel
هاري بوتر وحجرة الأسرار	Littérature	Romans étrangers traduits
هذا ما حدث معها	Littérature	Livres en arabe
هسيس	Littérature	Livres en arabe
هكذا تتعافى عندما تكون مستعداً	Vie pratique	Santé & Bien-être
هكذا تكلم زرادشت	Arts et sciences humaines	Sciences humaines
واحة يعقوب	Littérature	Livres en arabe
وادي الذئاب المنسية – أرض زيكولا 3	Littérature	Livres en arabe
وبالحق أنزلناه	Vie pratique	Spiritualité
وقائع الجمعة الأخيرة	Littérature	Livres en arabe
ولنا في الحلال لقاء	Littérature	Livres en arabe
يسمعون حسيسها	Littérature	Livres en arabe`;

async function main() {
    let count = 0;
    const lines = data.split('\n');
    
    // Create a map to find the best match
    const books = await prisma.book.findMany({
        select: { id: true, title: true }
    });
    
    for (const line of lines) {
        if (!line.trim() || line.startsWith('Livre') || line.startsWith('Livres arabes')) continue;
        const parts = line.split('\t').map(x => x?.trim());
        if (parts.length < 3) continue;
        const [title, category, subCategory] = parts;

        const matched = books.find(b => {
            const dbTitle = b.title.toLowerCase().trim();
            const targetTitle = title.toLowerCase().trim();
            return dbTitle.includes(targetTitle) || targetTitle.includes(dbTitle);
        });
        
        if (matched) {
            await prisma.book.update({
                where: { id: matched.id },
                data: {
                    category,
                    subCategory
                }
            });
            count++;
            console.log("Updated: " + matched.title);
        }
    }
    console.log('Mis à jour ' + count + ' livres.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
