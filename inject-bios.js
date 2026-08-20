const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const bios = [
    {
        name: 'Ahmed sefrioui',
        bio: `Ahmed Sefrioui (1915–2004) est un romancier marocain considéré comme l'un des pionniers de la littérature marocaine d'expression française. Né à Fès, il grandit dans la médina et puise dans ses souvenirs d'enfance la matière première de son œuvre. Son roman le plus célèbre, "La Boîte à merveilles" (1954), est une œuvre autobiographique qui décrit avec une grande sensibilité la vie quotidienne dans un quartier traditionnel de Fès. Sefrioui a travaillé au ministère de l'Éducation nationale et a contribué à faire rayonner la culture marocaine à travers ses écrits. Son style, empreint de lyrisme et de nostalgie, offre un tableau vivant de la société marocaine traditionnelle avant l'indépendance.`
    },
    {
        name: 'Thomas Erikson',
        bio: `Thomas Erikson est un auteur et coach suédois né en 1965 à Borlänge, en Suède. Il est surtout connu pour son bestseller mondial "Surrounded by Idiots" (Entouré d'idiots), publié en 2014, dans lequel il développe un système de classification des comportements humains en quatre profils distincts symbolisés par des couleurs : rouge, jaune, vert et bleu. Fort de plus de vingt ans d'expérience en tant que conférencier et formateur en communication, Erikson a travaillé avec de nombreuses entreprises et organisations en Scandinavie. Sa méthode, inspirée du modèle DISC, a séduit des millions de lecteurs dans le monde entier grâce à son approche accessible et pratique pour mieux comprendre les relations humaines au travail et dans la vie personnelle.`
    },
    {
        name: 'كيفن ليمان',
        bio: `كيفن ليمان عالم نفس وكاتب أمريكي من مواليد 1943، متخصص في علم النفس الأسري وتربية الأبناء. حصل على درجة الدكتوراه في علم النفس، وأسس ممارسة سريرية ناجحة في ولاية أريزونا الأمريكية. ألّف أكثر من خمسين كتاباً في مجالات الزواج والأسرة والتربية، من أبرزها "حاجب الأطفال" و"طرق تربية الأبناء". يُعرف ليمان بنظريته المتعلقة بترتيب الولادة وتأثيره على شخصية الإنسان. ظهر في برامج تلفزيونية أمريكية كبرى كـ Oprah وToday، ويُعدّ من أكثر الخبراء النفسيين موثوقية في قضايا الأسرة والعلاقات الإنسانية في الولايات المتحدة.`
    },
    {
        name: 'daniel goleman',
        bio: `Daniel Goleman is an American psychologist, author, and science journalist born on March 7, 1946, in Stockton, California. He earned his Ph.D. from Harvard University and later worked as a science writer for The New York Times. He is best known for his groundbreaking book "Emotional Intelligence" (1995), which argued that emotional skills — such as empathy, self-awareness, and impulse control — are at least as important as cognitive intelligence in determining success in life. The book spent more than a year and a half on The New York Times bestseller list. Goleman's work has profoundly influenced education, management, and leadership training worldwide. He has also written extensively on topics including mindfulness, creativity, and ecological intelligence.`
    },
    {
        name: 'خولة حمدي',
        bio: `خولة حمدي روائية وأكاديمية تونسية، تعمل أستاذة جامعية في تخصص تقنية المعلومات بجامعة الملك سعود في الرياض. اشتهرت بروايتها "في قلبي أنثى عبرية" التي أثارت جدلاً واسعاً لتناولها قضايا الهوية والانتماء والعلاقة بين العرب واليهود من منظور إنساني غير مألوف. تكتب حمدي بأسلوب سردي متميز يمزج بين العاطفة والتحليل النفسي العميق، وتجرؤ على طرح أسئلة وجودية تتعلق بالتسامح والآخر. رواياتها تُدرَّس في بعض الجامعات العربية، وقد ترجمت بعض أعمالها إلى لغات أجنبية، مما جعلها صوتاً روائياً عربياً مميزاً يلفت الانتباه على الصعيد الدولي.`
    },
    {
        name: 'Darren Hardy',
        bio: `Darren Hardy is an American author, speaker, and business mentor born on February 1, 1971. He is best known as the author of "The Compound Effect" (2010), a practical guide built on the principle that small, consistent actions accumulate over time to produce extraordinary results. Hardy served as the publisher and editorial director of SUCCESS magazine for over ten years, interviewing some of the world's most successful entrepreneurs and thought leaders. He has advised executives at major global companies and is a sought-after keynote speaker on the topics of productivity, leadership, and high performance. His philosophy centers on taking personal responsibility and making deliberate daily choices that compound into lasting success.`
    },
    {
        name: 'Stephen R. Covey',
        bio: `Stephen R. Covey (October 24, 1932 – July 16, 2012) was an American educator, author, and businessman widely regarded as one of the most influential management thinkers of the twentieth century. He earned his MBA from Harvard Business School and a doctorate from Brigham Young University. His landmark book, "The 7 Habits of Highly Effective People" (1989), has sold more than thirty million copies worldwide and has been named one of the most influential business books of the twentieth century. Covey believed that true success requires aligning one's actions with deeply held values and principles. He founded the Covey Leadership Center, later merged with FranklinQuest to form FranklinCovey Co., a global training organization. His work continues to influence leadership programs, schools, and corporations around the world.`
    },
    {
        name: 'اسلام جمال',
        bio: `إسلام جمال كاتب ومهندس ورائد أعمال مصري، من مواليد الإسكندرية عام 1989. حاصل على بكالوريوس الهندسة البحرية من جامعة الإسكندرية، وماجستير في الهندسة البحرية من جامعة اللويدز في إنجلترا. مؤسس مجموعة شركات "بلانش". يكتب في مجال تطوير الذات والكتب التحفيزية بأسلوب يربط الجانب النفسي بالدين والعبادات بطريقة عملية وسلسة موجهة للشباب. من أبرز مؤلفاته: "فاتتني صلاة" الذي يتناول أسباب التهاون في الصلاة وسبل المواظبة عليها، و"لكنود" الذي يتأمل مفهوم الامتنان وشكر النعم. يتميز أسلوبه بالصدق والقرب من القارئ من خلال تجاربه الشخصية المدموجة بفهم عملي للدين والحياة.`
    },
    {
        name: 'Ryan Holiday',
        bio: `Ryan Holiday (born June 16, 1987, in Sacramento, California) is an American author, marketer, and media strategist. He dropped out of college at 19 to apprentice under the author Robert Greene and later became director of marketing for American Apparel. He is best known for bringing Stoic philosophy to a modern audience through books such as "The Obstacle Is the Way" (2014), "Ego Is the Enemy" (2016), "The Daily Stoic" (2016), and "Stillness Is the Key" (2019). His work draws on the ancient wisdom of Marcus Aurelius, Seneca, and Epictetus and applies it to contemporary challenges in business, creativity, and personal growth. His books have been translated into dozens of languages and have found audiences ranging from athletes and military leaders to entrepreneurs and artists.`
    },
    {
        name: 'محمود ماهر',
        bio: `محمود ماهر كاتب وروائي مصري، يُلقَّب بـ "راوي الأندلس" نظراً لتخصصه في توثيق تاريخ الحضارة الإسلامية في الأندلس في قالب روائي مشوّق. حاصل على بكالوريوس في الصيدلة، غير أن شغفه بالتاريخ الإسلامي قاده إلى الكتابة الأدبية. أطلق مسيرته الروائية عام 2018 برواية "خريف شجرة الرمان" التي تناولت الأحداث التي سبقت سقوط غرناطة، وحققت نجاحاً واسعاً. يعتمد في أعماله على الحقائق التاريخية الموثقة مع الحفاظ على جماليات السرد الروائي. من أبرز مؤلفاته: "ربيع الأندلس"، "جارة الوادي"، "وداعاً طليطلة"، و"فتى الأندلس". يكتسب محمود ماهر شعبية متزايدة في الوطن العربي لقدرته على إحياء التراث الإسلامي وتقديمه للأجيال الجديدة بأسلوب جذاب.`
    },
    {
        name: 'شيماء علي',
        bio: `شيماء علي أخصائية تربية ومدربة أسرية مصرية، متخرجة من كلية الحقوق بجامعة الإسكندرية، ولها خلفية عملية واسعة في مجالي التدريس وإدارة المؤسسات التربوية. تكتب في مجال التربية الحديثة وتنمية شخصية الطفل بأسلوب مبسط يخاطب الآباء والأمهات بعيداً عن المصطلحات الأكاديمية الجافة. كتابها "أخطاء التربية" (دار عصير الكتب) يستعرض الأخطاء الشائعة التي يقع فيها المربون، كالحماية الزائدة والمقارنات السلبية والنقد المفرط، ويقدم بدائل عملية مستندة إلى أبحاث علم نفس الطفل. تسعى من خلال أعمالها إلى بناء جيل يمتلك شخصية مستقلة وواثقة من نفسها.`
    },
    {
        name: 'Robert Greene',
        bio: `Robert Greene (born May 14, 1959, in Los Angeles, California) is an American author best known for his books on strategy, power, and human nature. He studied classical studies at the University of Wisconsin–Madison and worked in over fifty different jobs — including magazine editor, Hollywood writer, and translator — before publishing his first book. In 1998, he co-wrote "The 48 Laws of Power" with book packager Joost Elffers after meeting him at an art school in Italy. The book became a global phenomenon, selling millions of copies and influencing politicians, executives, entertainers, and athletes worldwide. He followed it with "The Art of Seduction," "The 33 Strategies of War," "Mastery," and "The Laws of Human Nature." Greene's work draws on centuries of history and psychology to reveal the hidden dynamics of power and human behavior.`
    },
    {
        name: 'ماركوس زوساك',
        bio: `ماركوس زوساك روائي أسترالي ولد في 23 يونيو 1975 في سيدني، لأبوين مهاجرين من ألمانيا والنمسا. درس الأدب الإنجليزي والتاريخ في جامعة نيو ساوث ويلز وعمل مدرساً للغة الإنجليزية قبل أن يتفرغ للكتابة. اشتهر عالمياً بروايته "سارقة الكتب" (The Book Thief، 2005) التي تدور أحداثها في ألمانيا خلال الحرب العالمية الثانية وتُروى على لسان الموت. الرواية استوحاها من قصص والديه عن طفولتهما إبان الحرب، وتُرجمت إلى أكثر من أربعين لغة وحُوِّلت إلى فيلم سينمائي ناجح عام 2013. حصل زوساك عام 2014 على جائزة مارغريت أدواردز للإسهام المتميز في أدب الشباب. يُعدّ من أبرز الأصوات الروائية الأسترالية المعاصرة.`
    },
    {
        name: 'ميليسا دا كوستا',
        bio: `ميليسا دا كوستا روائية فرنسية ولدت في 7 أغسطس 1990 في مدينة ماكون، من عائلة ذات أصول برتغالية. درست الاقتصاد والتسيير في معهد IAE بليون، ثم عملت في مجال التواصل المؤسسي قبل أن تتفرغ للكتابة. نشرت مخطوطتها الأولى على منصة إلكترونية عام 2018، ما أتاح لها الانضمام إلى دار نشر Carnets Nord. روايتها الأولى "كل زرقة السماء" (Tout le bleu du ciel، 2019) حققت نجاحاً فورياً وباتت من أكثر الكتب مبيعاً في فرنسا. تتميز كتاباتها بأسلوب عاطفي سلس يتناول موضوعات الفقدان والنهوض والبحث عن الذات. حازت على جائزة آلان فورنييه 2020 وجائزة بابيليو 2022، وتُصنَّف اليوم من أبرز الروائيات الفرنسيات المعاصرة.`
    },
    {
        name: 'أدهم شرقاوي',
        bio: `أدهم شرقاوي كاتب وروائي فلسطيني لبناني النشأة، ولد عام 1980 في مدينة صور اللبنانية. حاصل على ماجستير في الأدب العربي من الجامعة اللبنانية في بيروت. بدأ مسيرته الكتابية عبر منتدى "الساخر" الإلكتروني ثم عمل في صحيفة الوطن القطرية. يكتب تحت اسم مستعار "قس بن ساعدة". يتميز أسلوبه بالبساطة والعمق في آنٍ واحد، وتتنوع موضوعاته بين الروايات الإنسانية والتأملات القرآنية والسيرة النبوية وكتب التطوير الذاتي. أصدر أول كتبه "حديث الصباح" عام 2012، وتوالت بعدها أعماله التي حققت انتشاراً واسعاً في العالم العربي، من بينها: "نبض"، "ليطمئن قلبي"، "رسائل من القرآن"، و"مع النبي". يُعدّ من الأصوات الأدبية الشبابية الأكثر تأثيراً في القراء العرب.`
    },
    {
        name: 'جيمس كلير',
        bio: `جيمس كلير كاتب أمريكي وخبير في علم السلوك البشري والعادات، ولد في 22 يناير 1986. يُعرف بكتابه الأشهر "العادات الذرية" (Atomic Habits، 2018) الذي أصبح من أكثر الكتب مبيعاً في التاريخ بتجاوزه خمسة عشر مليون نسخة حول العالم. يرتكز فكره على مبدأ أن التحسينات الصغيرة والمتراكمة — بنسبة 1% يومياً — تُحدث تحولات جذرية على المدى البعيد. يكتب كلير بأسلوب مستند إلى الأبحاث العلمية في علم الأعصاب والنفس مع تطبيقات عملية يومية. تُرجم كتابه إلى أكثر من خمسين لغة، ويُدرَّس في جامعات ومؤسسات عالمية عديدة. يرى أن التركيز على المنظومة لا الأهداف هو مفتاح النجاح المستدام.`
    },
    {
        name: 'أحمد آل حمدان',
        bio: `أحمد عبد الله سعد آل حمدان كاتب وروائي سعودي، أصدر عدداً من الروايات التي اتسمت بالعمق الإنساني ومعالجة قضايا الهوية والعلاقات الاجتماعية في السياق الخليجي المعاصر. يكتب بلغة عربية سلسة وأسلوب سردي يجمع بين التفاصيل الدقيقة والمشاعر الإنسانية الصادقة، مما أكسبه قراءً من مختلف أنحاء الوطن العربي. أعماله تعكس رؤية نقدية للمجتمع مع الحفاظ على قيم الأصالة والانتماء. يُعدّ من الأصوات الروائية السعودية الشابة الواعدة التي تُسهم في إثراء المشهد الثقافي السعودي والخليجي.`
    },
    {
        name: 'محمد ابراهيم',
        bio: `الدكتور محمد إبراهيم طبيب ومعالج نفسي مصري، حاصل على درجة الماجستير في الطب النفسي من جامعة عين شمس. يُعدّ من أبرز الأصوات الطبية العربية في مجال تبسيط علم النفس للجمهور العام. ألّف كتاب "جلسات نفسية" الذي يُقدَّم كسلسلة من الجلسات العلاجية المكتوبة، تتناول موضوعات شائعة كالتفكير المفرط، وجلد الذات، والخوف من الرفض، والتسويف، والعلاقات السامة. يتميز أسلوبه بالوضوح والدفء الإنساني بعيداً عن التعقيد الأكاديمي، مما يجعله في متناول القارئ العادي. يهدف من خلال كتاباته إلى مساعدة الناس على استعادة توازنهم النفسي وتحقيق السكينة الداخلية في زمن مليء بالضغوط.`
    }
];

async function run() {
    let updated = 0;
    
    for (const item of bios) {
        const result = await prisma.authorProfile.updateMany({
            where: { name: item.name },
            data: { bio: item.bio }
        });
        
        if (result.count > 0) {
            console.log(`✓ ${item.name}`);
            updated++;
        } else {
            console.log(`✗ Non trouvé: ${item.name}`);
        }
    }
    
    console.log(`\nTotal mis à jour : ${updated}/${bios.length}`);
}

run()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
