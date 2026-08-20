const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const data = `
301. Good to Great

العربية:
كتاب في إدارة الأعمال يشرح كيف تنتقل الشركات من الأداء الجيد إلى الأداء الاستثنائي من خلال القيادة والانضباط والاستراتيجية.

Français :
Un ouvrage de management qui analyse comment les entreprises peuvent passer de bonnes performances à l'excellence grâce au leadership, à la discipline et à la stratégie.

English:
A business classic examining how companies can move from good performance to sustained excellence through leadership, discipline, and strategy.

302. IT STARTS WITH US

العربية:
رواية عاطفية تتناول الحب والماضي والاختيارات الصعبة، وتستكشف إمكانية بناء حياة جديدة بعد التجارب المؤلمة.

Français :
Un roman sentimental sur l'amour, le passé et les choix difficiles, autour de la possibilité de reconstruire sa vie après des expériences douloureuses.

English:
A romantic novel about love, the past, difficult choices, and the possibility of rebuilding life after painful experiences.

303. L'Étranger

العربية:
رواية فلسفية شهيرة تتناول الاغتراب والعبث والحرية ونظرة الإنسان إلى المجتمع والحياة والموت.

Français :
Un classique de la littérature et de la philosophie de l'absurde explorant l'étrangeté, la liberté, la société et le rapport à la mort.

English:
A landmark novel of absurdist literature exploring alienation, freedom, society, meaning, and death.

304. L’intelligence émotionnelle 1 & 2

العربية:
كتاب يشرح دور الذكاء العاطفي في فهم المشاعر وإدارتها وبناء العلاقات واتخاذ القرارات وتحسين الأداء الشخصي والمهني.

Français :
Un ouvrage consacré à l'intelligence émotionnelle, à la compréhension des émotions, aux relations et à l'amélioration des performances personnelles et professionnelles.

English:
A comprehensive work on emotional intelligence, emotional awareness, relationships, decision-making, and personal and professional performance.

305. La Boîte à merveilles

العربية:
رواية أدبية مغربية تستعيد عالم الطفولة في المدينة القديمة بفاس، من خلال ذكريات الراوي وعلاقته بعائلته ومحيطه.

Français :
Un classique de la littérature marocaine qui évoque l'enfance dans la médina de Fès à travers les souvenirs du narrateur et son univers familial.

English:
A Moroccan literary classic portraying childhood in the old medina of Fez through the narrator's memories and family life.

306. La Mémoire d'un roi

العربية:
رواية أدبية تتناول الذاكرة والسلطة والتاريخ من خلال تجربة شخصية تتقاطع فيها الذكريات مع التحولات السياسية والاجتماعية.

Français :
Un roman autour de la mémoire, du pouvoir et de l'histoire, où souvenirs personnels et transformations politiques se rencontrent.

English:
A literary novel exploring memory, power, and history through the intersection of personal experience and political change.

307. La Psy

العربية:
رواية تشويق نفسي تدور حول شخصية تعمل في مجال العلاج النفسي وتواجه أحداثاً وأسراراً تجعل الحقيقة موضع شك.

Français :
Un thriller psychologique autour d'une professionnelle de la psychologie confrontée à des événements et secrets qui brouillent la frontière entre vérité et illusion.

English:
A psychological thriller centered on a mental-health professional confronted with secrets and events that make reality increasingly uncertain.

308. Le Dernier Jour d'un condamné

العربية:
رواية أدبية مؤثرة تتناول الساعات الأخيرة لرجل محكوم بالإعدام، وتطرح أسئلة حول الموت والعدالة والكرامة الإنسانية.

Français :
Un récit poignant qui donne accès aux dernières heures d'un condamné à mort et interroge la justice, la peine capitale et la dignité humaine.

English:
A powerful narrative portraying the final hours of a condemned man while questioning justice, capital punishment, and human dignity.

309. Le Double

العربية:
رواية نفسية وفلسفية تتناول الهوية والانقسام الداخلي من خلال رجل يكتشف ظهور شخص يشبهه ويهدد مكانته.

Français :
Un roman psychologique sur l'identité et le dédoublement, dans lequel un homme voit apparaître un double qui menace progressivement sa vie.

English:
A psychological novel about identity and inner conflict in which a man encounters a double who gradually threatens his life and position.

310. Le Joueur

العربية:
رواية نفسية تتناول الإدمان على القمار والحب والمال والتعلق، وتكشف تأثير الهوس في قرارات الإنسان وعلاقاته.

Français :
Un roman psychologique sur l'addiction au jeu, l'amour, l'argent et l'obsession, ainsi que leurs conséquences sur les relations.

English:
A psychological novel exploring gambling addiction, love, money, obsession, and their effects on human relationships.

311. Les Amants de Casablanca

العربية:
رواية عاطفية واجتماعية تدور في الدار البيضاء وتستكشف الحب والخيانة والرغبات والصراعات داخل العلاقات.

Français :
Un roman sentimental et social situé à Casablanca, explorant l'amour, l'infidélité, les désirs et les tensions du couple.

English:
A romantic and social novel set in Casablanca, exploring love, betrayal, desire, and relationship conflicts.

312. Les Hommes viennent de Mars, les Femmes viennent de Vénus

العربية:
كتاب في العلاقات يشرح الاختلافات الشائعة في طرق التواصل والتفكير بين الرجال والنساء، ويقدم أفكاراً لتحسين التفاهم.

Français :
Un classique des relations de couple qui explore les différences de communication entre hommes et femmes et propose des pistes pour mieux se comprendre.

English:
A relationship classic exploring common differences in communication between men and women and offering ideas for better mutual understanding.

313. Les Pauvres Gens

العربية:
رواية إنسانية تتناول الفقر والكرامة والحب والتضحية، وتسلط الضوء على حياة أشخاص يعيشون ظروفاً اجتماعية صعبة.

Français :
Un récit profondément humain sur la pauvreté, la dignité, l'amour et le sacrifice à travers des personnages confrontés à des conditions difficiles.

English:
A deeply human story about poverty, dignity, love, and sacrifice among people facing difficult social circumstances.

314. Livre Cadeau

العربية:
كتاب هدية مناسب للمشاركة مع شخص عزيز، ويقدم تجربة قراءة بسيطة تحمل طابعاً وجدانياً وشخصياً.

Français :
Un livre cadeau pensé pour être offert à une personne chère et créer un moment de lecture personnel et chaleureux.

English:
A gift book designed to be shared with someone special and create a warm, personal reading experience.

315. Master Your Emotions

العربية:
كتاب في تطوير الذات يساعد على فهم المشاعر والتعامل معها بطريقة أكثر وعياً، بهدف تحسين القرارات والعلاقات والتوازن الداخلي.

Français :
Un guide de développement personnel consacré à la compréhension et à la gestion des émotions pour améliorer les décisions, les relations et l'équilibre intérieur.

English:
A self-development guide focused on understanding and managing emotions to improve decisions, relationships, and inner balance.

316. Resistance, Rebellion, and Death

العربية:
مجموعة من النصوص والمقالات التي تتناول المقاومة والتمرد والموت، وتعكس أفكاراً فلسفية وأدبية حول الإنسان والحرية والصراع.

Français :
Un recueil de textes autour de la résistance, de la rébellion et de la mort, explorant la liberté, le conflit et la condition humaine.

English:
A collection of writings exploring resistance, rebellion, death, freedom, conflict, and the human condition.

317. Rich Dad Poor Dad

العربية:
كتاب في الثقافة المالية يطرح أفكاراً حول المال والاستثمار وبناء الأصول والفرق بين عقلية الموظف وعقلية صاحب الأعمال.

Français :
Un classique de l'éducation financière qui aborde l'argent, l'investissement, les actifs et les différentes façons de penser la richesse.

English:
A personal finance classic exploring money, investing, assets, wealth-building, and different approaches to financial thinking.

318. Rules of Life

العربية:
كتاب يقدم مجموعة من المبادئ والتأملات العملية لبناء حياة أكثر توازناً ووضوحاً ونجاحاً وسعادة.

Français :
Un guide personnel proposant des principes pratiques pour construire une vie plus équilibrée, heureuse et réussie.

English:
A practical guide offering personal principles for building a happier, more balanced, and successful life.

319. Surrounded by Vampires

العربية:
كتاب في العلاقات والطاقة النفسية يتناول الأشخاص الذين يستنزفون الآخرين عاطفياً، ويقدم أفكاراً لحماية الحدود الشخصية.

Français :
Un ouvrage consacré aux relations avec les personnes émotionnellement épuisantes et aux moyens de préserver ses limites personnelles.

English:
A self-help book about emotionally draining relationships and ways to protect personal boundaries and well-being.

320. The 48 Laws of Power

العربية:
كتاب في الاستراتيجية والسلوك الاجتماعي يستعرض مجموعة من القواعد والأفكار لفهم القوة والنفوذ والصراعات داخل العلاقات والمجتمعات.

Français :
Un ouvrage de stratégie sociale présentant des principes pour comprendre le pouvoir, l'influence, les rivalités et les rapports humains.

English:
A strategy and social psychology book presenting principles for understanding power, influence, rivalry, and human behavior.

321. The 7 Habits of Highly Effective People

العربية:
كتاب كلاسيكي في تطوير الذات يقدم سبع عادات تساعد على بناء الشخصية وتحسين الإنتاجية والعلاقات وتحقيق الأهداف.

Français :
Un classique du développement personnel présentant sept habitudes destinées à améliorer l'efficacité, les relations et l'accomplissement personnel.

English:
A personal development classic presenting seven habits for improving effectiveness, relationships, productivity, and personal growth.

322. The Art of War

العربية:
كتاب كلاسيكي في الاستراتيجية والتخطيط يركز على فهم المنافسين وإدارة الموارد واتخاذ القرارات بذكاء لتحقيق الأهداف.

Français :
Un classique de la stratégie consacré à la planification, à l'analyse de l'adversaire, à la gestion des ressources et à la prise de décision.

English:
A classic strategy text about planning, understanding opponents, managing resources, and making effective decisions.

323. The Darkest

العربية:
رواية مظلمة تجمع بين الغموض والتشويق والرعب، وتضع شخصياتها أمام أسرار وأحداث تهدد حياتها.

Français :
Un roman sombre mêlant mystère, suspense et horreur, où les personnages sont confrontés à des secrets et des dangers.

English:
A dark novel combining mystery, suspense, and horror as its characters confront dangerous secrets.

324. The Housemaid

العربية:
رواية تشويق نفسي عن خادمة تحصل على وظيفة لدى عائلة ثرية، لكنها تكتشف تدريجياً أن المنزل يخفي أسراراً خطيرة.

Français :
Un thriller psychologique dans lequel une femme de ménage découvre progressivement les secrets inquiétants d'une famille riche.

English:
A psychological thriller about a housemaid who gradually discovers disturbing secrets inside a wealthy family's home.

325. The Housemaid Is Watching

العربية:
رواية تشويق نفسي تعود إلى عالم الخادمة، حيث تبدو الحياة الجديدة أكثر هدوءاً قبل أن تبدأ أسرار ومخاطر جديدة بالظهور.

Français :
Un thriller psychologique où une nouvelle étape de la vie de la famille fait émerger de nouveaux secrets et de nouvelles menaces.

English:
A psychological thriller in which a seemingly peaceful new chapter brings fresh secrets, dangers, and unsettling discoveries.

326. The Housemaid's Secret

العربية:
رواية تشويق نفسي تكشف أسراراً خطيرة خلف أبواب منزل فاخر، حيث تعرف الخادمة أكثر مما ينبغي.

Français :
Un thriller psychologique autour d'une maison luxueuse dont les secrets deviennent de plus en plus inquiétants pour la femme de ménage.

English:
A psychological thriller about a luxurious home hiding disturbing secrets that the housemaid begins to uncover.

327. The Magic of Thinking Big

العربية:
كتاب تحفيزي في تطوير الذات يشجع على التفكير بطريقة أكثر إيجابية وطموحاً، وبناء الثقة والسعي نحو أهداف أكبر.

Français :
Un classique de la motivation qui encourage à développer une vision ambitieuse, renforcer sa confiance et viser des objectifs plus élevés.

English:
A motivational classic encouraging ambitious thinking, greater confidence, positive attitudes, and bigger goals.

328. The Mountain Is You

العربية:
كتاب في تطوير الذات يركز على العوائق الداخلية والتخريب الذاتي، ويساعد على فهم الأنماط التي تمنع الإنسان من التقدم.

Français :
Un ouvrage de développement personnel sur l'auto-sabotage, les blocages intérieurs et les mécanismes qui empêchent le changement.

English:
A self-development book about self-sabotage, inner obstacles, and the patterns that can prevent personal growth.

329. The Psychology of Money

العربية:
كتاب يشرح الجانب النفسي للمال، وكيف تؤثر العواطف والتجارب والعادات في طريقة الادخار والاستثمار واتخاذ القرارات المالية.

Français :
Un ouvrage sur la psychologie de l'argent et l'influence des émotions, expériences et habitudes sur nos décisions financières.

English:
A book exploring the psychology behind money and how emotions, experiences, and habits influence financial decisions.

330. The Rules of Love

العربية:
كتاب يقدم مجموعة من الأفكار والقواعد حول الحب والعلاقات وبناء روابط أكثر نضجاً واستقراراً وسعادة.

Français :
Un guide consacré à l'amour et aux relations, proposant des principes pour construire des liens plus heureux et épanouissants.

English:
A relationship guide offering principles for building happier, healthier, and more fulfilling connections.

331. The Seat of the Soul

العربية:
كتاب روحاني وفلسفي يتأمل في الوعي والروح والنمو الداخلي والعلاقة بين التجربة الإنسانية والمعنى الروحي.

Français :
Un ouvrage spirituel et philosophique sur la conscience, l'évolution intérieure et la dimension spirituelle de l'expérience humaine.

English:
A spiritual and philosophical work exploring consciousness, inner growth, and the deeper meaning of human experience.

332. The Silent Patient

العربية:
رواية تشويق نفسي عن فنانة تتوقف عن الكلام بعد حادثة غامضة، ويحاول معالج نفسي اكتشاف الحقيقة وراء صمتها.

Français :
Un thriller psychologique autour d'une artiste qui cesse de parler après un événement mystérieux, tandis qu'un thérapeute cherche à comprendre pourquoi.

English:
A psychological thriller about an artist who stops speaking after a mysterious incident while a therapist tries to uncover the truth behind her silence.

333. Think and Grow Rich

العربية:
كتاب كلاسيكي في النجاح يركز على قوة التفكير والأهداف والإيمان بالنفس والمثابرة في تحقيق الطموحات.

Français :
Un classique du développement personnel consacré au pouvoir de la pensée, aux objectifs, à la persévérance et à la réussite.

English:
A classic success book focused on mindset, goals, persistence, self-belief, and achievement.

334. Thinking, Fast and Slow

العربية:
كتاب في علم النفس السلوكي يشرح نظامي التفكير السريع والبطيء وكيف تؤثر التحيزات الذهنية في أحكامنا وقراراتنا.

Français :
Un ouvrage majeur de psychologie cognitive expliquant deux modes de pensée et la manière dont les biais influencent nos décisions.

English:
A major work in behavioral psychology explaining two modes of thinking and how cognitive biases shape judgment and decisions.

335. When You're Ready, This Is How You Heal

العربية:
كتاب تأملي عن التعافي العاطفي وتجاوز الألم وفهم الذات وبناء حياة جديدة عندما يصبح الإنسان مستعداً للتغيير.

Français :
Un ouvrage introspectif sur la guérison émotionnelle, le dépassement de la douleur et la reconstruction personnelle.

English:
A reflective book about emotional healing, overcoming pain, self-understanding, and rebuilding your life when you're ready to change.

336. Zero to One

العربية:
كتاب في ريادة الأعمال والابتكار يشرح كيفية بناء أفكار ومنتجات جديدة وإنشاء شركات قادرة على خلق قيمة مختلفة.

Français :
Un ouvrage sur l'entrepreneuriat et l'innovation consacré à la création de nouvelles idées, produits et entreprises à forte valeur.

English:
A startup and innovation book about creating new ideas, products, and businesses that generate unique value.

337. آخر قهوة

العربية:
كتاب أدبي وتأملي يحمل طابعاً عاطفياً، ويتناول الذكريات والفراق والمشاعر الإنسانية من خلال نصوص قصيرة.

Français :
Un ouvrage sensible autour des souvenirs, de la séparation et des émotions humaines à travers de courts textes.

English:
A sensitive collection reflecting on memories, separation, and human emotions through short literary pieces.

338. آرسس

العربية:
رواية خيال علمي وتشويق تدور في عالم مستقبلي غامض، حيث تواجه الشخصيات أحداثاً وأسئلة تتعلق بالتقنية والإنسان.

Français :
Un roman de science-fiction et de suspense situé dans un univers futuriste mystérieux, où technologie et nature humaine se confrontent.

English:
A science-fiction thriller set in a mysterious future where technology, humanity, and hidden forces collide.

339. آزر

العربية:
رواية عربية تجمع بين الغموض والخيال والأحداث غير المألوفة، وتكشف عالماً مليئاً بالأسرار والمفاجآت.

Français :
Un roman arabe mêlant mystère, fantastique et événements inattendus dans un univers riche en secrets.

English:
An Arabic novel combining mystery, fantasy, unexpected events, and hidden secrets.

340. أبادول

العربية:
رواية فانتازيا ومغامرة تأخذ القارئ إلى عالم مختلف مليء بالأسرار والصراعات والشخصيات الغامضة.

Français :
Un roman fantastique d'aventure qui plonge le lecteur dans un monde mystérieux rempli de conflits et de personnages énigmatiques.

English:
A fantasy adventure transporting readers into a mysterious world filled with conflict, secrets, and enigmatic characters.

341. أبي الذي أكره

العربية:
كتاب إنساني يناقش العلاقة المعقدة بين الأبناء والآباء، وتأثير التجارب الأسرية المؤلمة في الشخصية والمشاعر.

Français :
Un ouvrage sensible sur les relations difficiles entre parents et enfants et sur l'impact des expériences familiales douloureuses.

English:
A sensitive work exploring difficult parent-child relationships and the lasting impact of painful family experiences.

342. أحببت وغداً

العربية:
رواية عاطفية تتناول الحب والانتظار والاختيارات والمشاعر المتناقضة التي ترافق العلاقات الإنسانية.

Français :
Un roman sentimental sur l'amour, l'attente, les choix et les émotions contradictoires qui accompagnent les relations.

English:
A romantic novel exploring love, waiting, choices, and the conflicting emotions found in relationships.

343. أخطاء التربية

العربية:
كتاب تربوي يناقش الأخطاء الشائعة في تربية الأطفال وتأثيرها، ويقدم أفكاراً تساعد الآباء على تحسين أساليب التربية.

Français :
Un guide parental consacré aux erreurs courantes dans l'éducation des enfants et aux moyens d'adopter des approches plus constructives.

English:
A parenting guide examining common mistakes in child-rearing and offering ideas for more constructive approaches.

344. أرض السافلين

العربية:
رواية غامضة ومشوقة تجمع بين الخيال والفلسفة وعوالم مختلفة، وتدفع القارئ إلى التفكير في الخير والشر وطبيعة الإنسان.

Français :
Un roman mystérieux mêlant fantastique et réflexion philosophique autour du bien, du mal et de la nature humaine.

English:
A mysterious novel combining fantasy and philosophical reflection on good, evil, and human nature.

345. أرض زيكولا

العربية:
رواية فانتازيا تدور في عالم خيالي مختلف تُقاس فيه قيمة الإنسان بوحدات غير المال، وتقدم مغامرة مليئة بالأسرار والتحديات.

Français :
Une fantasy originale située dans un monde où la valeur des individus se mesure autrement que par l'argent, entre aventure et mystère.

English:
An imaginative fantasy set in a world where human value is measured differently from money, combining adventure, mystery, and challenges.

346. أسرار الخادمة – بالفرنسية

العربية:
رواية تشويق نفسي عن خادمة تدخل إلى عالم عائلة تخفي أسراراً خطيرة خلف حياتها المثالية.

Français :
Un thriller psychologique dans lequel une femme de ménage découvre les secrets inquiétants d'une famille apparemment parfaite.

English:
A psychological thriller about a housemaid who discovers disturbing secrets hidden behind a family's perfect appearance.

347. أسرار سورة البقرة

العربية:
كتاب ديني وتأملي يتناول موضوعات سورة البقرة ورسائلها ودروسها الإيمانية، مع التركيز على التدبر والاستفادة العملية.

Français :
Un ouvrage spirituel proposant des réflexions sur les thèmes et enseignements de la sourate Al-Baqara.

English:
A spiritual work exploring themes, reflections, and lessons drawn from Surah Al-Baqarah.

348. أسرار عقل المليونير

العربية:
كتاب في الثقافة المالية وتطوير الذات يناقش المعتقدات والسلوكيات المرتبطة بالمال وكيفية تطوير عقلية مالية أكثر وعياً.

Français :
Un livre de développement personnel et d'éducation financière consacré aux croyances et comportements liés à l'argent.

English:
A personal finance and self-development book exploring beliefs, habits, and behaviors related to money and wealth.

349. أسفار الشياطين

العربية:
رواية رعب وفانتازيا مظلمة تأخذ القارئ في رحلة عبر عوالم غامضة مليئة بالأسرار والكيانات المخيفة.

Français :
Un roman de dark fantasy et d'horreur plongeant le lecteur dans des mondes mystérieux peuplés de secrets et de forces inquiétantes.

English:
A dark fantasy and horror novel taking readers through mysterious worlds filled with secrets and frightening forces.

350. أسفار مريم المحرمة

العربية:
رواية غامضة تجمع بين التاريخ والخيال والأسرار، وتقدم رحلة مليئة بالأحداث غير المألوفة والأسئلة حول الحقيقة.

Français :
Un roman mystérieux mêlant histoire, fantastique et secrets dans une quête où la frontière entre vérité et fiction devient incertaine.

English:
A mysterious novel blending history, fantasy, and hidden secrets in a journey where the line between truth and fiction becomes uncertain.
`;

async function main() {
    const linesOfData = data.trim().split(/\n/);
    let parsedBlocks = [];
    let currentBlock = [];
    
    // Custom block parsing
    for (const line of linesOfData) {
        if (line.match(/^\d+\.\s+/) || line.match(/^\d+\./)) {
            if (currentBlock.length > 0) {
                parsedBlocks.push(currentBlock.join('\n'));
                currentBlock = [];
            }
            currentBlock.push(line.replace(/^\d+\.\s+/, '').replace(/^\d+\./, ''));
        } else if (line.trim() && !line.trim().match(/^الكتب العربية$/)) {
            if (currentBlock.length > 0) {
                currentBlock.push(line);
            }
        }
    }
    if (currentBlock.length > 0) {
        parsedBlocks.push(currentBlock.join('\n'));
    }
    
    const books = await prisma.book.findMany({
        select: { id: true, title: true }
    });
    
    let count = 0;
    
    for (const block of parsedBlocks) {
        if (!block.trim()) continue;
        
        const lines = block.trim().split('\n').map(l => l.trim()).filter(l => l);
        const title = lines[0];
        
        let ar = "", fr = "", en = "";
        let currentLang = "";
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith('العربية:')) {
                currentLang = 'ar';
                continue;
            } else if (line.startsWith('Français :') || line.startsWith('Français:')) {
                currentLang = 'fr';
                continue;
            } else if (line.startsWith('English:')) {
                currentLang = 'en';
                continue;
            }
            
            if (currentLang === 'ar') ar += (ar ? " " : "") + line;
            if (currentLang === 'fr') fr += (fr ? " " : "") + line;
            if (currentLang === 'en') en += (en ? " " : "") + line;
        }

        let searchTitle = title;
        if (title.includes(' – ')) searchTitle = title.split(' – ')[0];
        if (title.includes(' - ')) searchTitle = title.split(' - ')[0];
        const cleanTitle = (str) => str.toLowerCase().trim()
            .replace(/[أإآ]/g, 'ا')
            .replace(/ة/g, 'ه')
            .replace(/ – /g, ' - ')
            .replace(/ \- /g, ' - ');
            
        const targetClean = cleanTitle(searchTitle);

        const matched = books.find(b => {
            const dbClean = cleanTitle(b.title);
            return dbClean.includes(targetClean) || targetClean.includes(dbClean);
        });
        
        if (matched) {
            await prisma.book.update({
                where: { id: matched.id },
                data: {
                    description: ar,
                    descriptionFr: fr,
                    descriptionEn: en
                }
            });
            count++;
            console.log("Updated descriptions for: " + matched.title);
        } else {
            console.log("NOT FOUND: " + title);
        }
    }
    
    console.log('Descriptions mises à jour : ' + count + ' livres.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
