import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
    if (!admin) throw new Error("No admin user found")

    const articles = [
        {
            title: "The Joy and Benefits of Re-reading Your Favorite Books",
            slug: "benefits-of-re-reading-books",
            excerpt: "Why do we revisit the same stories when there are millions of unread books? Discover the psychological and cognitive benefits of re-reading.",
            content: `## The Guilt of the Re-reader\n\nMany readers feel a pang of guilt when they pick up a book they have already read. With "To-Be-Read" (TBR) piles growing taller every day and the constant pressure to consume the latest releases, re-reading can feel like a waste of time. But is it?\n\nPsychologists and literary experts argue that re-reading is not just a comfort mechanism; it is a deeply enriching cognitive exercise.\n\n### 1. Emotional Regulation and Comfort\n\nWhen we re-read a book, we already know what happens. The brain doesn't have to expend energy predicting the plot or bracing for unexpected emotional shocks. This predictability provides a profound sense of safety and comfort, which is incredibly effective for anxiety relief. Re-reading acts as a literary safety blanket.\n\n### 2. Discovering the Unseen Details\n\nDuring a first read, your brain is primarily focused on the plot: *What happens next?* \n\nDuring a second or third read, the pressure of the plot is gone. You are free to appreciate the craftsmanship of the author. You notice the subtle foreshadowing in chapter one, the thematic metaphors, and the intricate character development that you missed when you were racing to the end.\n\n### 3. Measuring Your Own Personal Growth\n\n*“No man ever steps in the same river twice, for it's not the same river and he's not the same man.”* - Heraclitus.\n\nWhen you re-read a book five years later, the words haven't changed, but you have. A character you once disliked might suddenly seem sympathetic because of your new life experiences. Re-reading a book serves as a mirror, reflecting your own personal growth and changing perspectives.\n\n## Conclusion\n\nDo not feel guilty about picking up your favorite novel for the fifth time. Re-reading is a celebration of the book's enduring impact on your life. Embrace the joy of returning to familiar worlds.`,
            coverImage: "https://images.unsplash.com/photo-1455390582262-044cdead2708?auto=format&fit=crop&q=80&w=1200",
            language: "en"
        },
        {
            title: "Comment choisir son prochain livre sans se tromper ?",
            slug: "comment-choisir-prochain-livre",
            excerpt: "Face à l'abondance de choix en librairie, trouver la prochaine lecture parfaite peut s'avérer difficile. Voici nos meilleures méthodes pour éviter la panne de lecture.",
            content: `## L'angoisse de la page blanche... pour le lecteur\n\nVous venez de terminer un livre incroyable. Vous êtes encore imprégné de son univers, et vient la redoutable question : *Que vais-je lire maintenant ?* L'abondance de choix peut souvent mener à une paralysie décisionnelle. Voici comment naviguer dans l'océan littéraire pour trouver votre prochaine pépite.\n\n### 1. Pratiquez le "Mood Reading"\n\nAu lieu de suivre aveuglément les classements des meilleures ventes ou les recommandations génériques, écoutez vos émotions. De quoi avez-vous besoin aujourd'hui ?\n*   Besoin d'évasion ? Cherchez de la Fantasy ou de la Science-Fiction.\n*   Besoin de réconfort ? Tournez-vous vers la littérature Feel-Good.\n*   Besoin de stimulation intellectuelle ? Optez pour un essai ou une biographie historique.\n\n### 2. Explorez la bibliographie de vos auteurs favoris\n\nC'est la méthode la plus sûre. Si vous avez adoré le style, le rythme et la construction des personnages d'un auteur, il y a de fortes chances que vous appréciiez ses autres œuvres. Beaucoup de lecteurs s'arrêtent au best-seller d'un écrivain sans explorer ses romans de jeunesse, qui sont parfois tout aussi fascinants.\n\n### 3. Lisez les remerciements et les recommandations des auteurs\n\nLes écrivains sont avant tout de grands lecteurs. Regardez qui ils remercient ou quels auteurs ils citent en interview. Si vous aimez le style de Stephen King, lisez les auteurs qu'il recommande publiquement. C'est un excellent moyen de découvrir des écrivains partageant le même ADN littéraire.\n\n### 4. N'ayez pas peur des échantillons\n\nNe vous fiez pas seulement à la couverture ou au résumé. Ouvrez le livre et lisez la première page. Si le style de l'auteur ne vous accroche pas dès les premiers paragraphes, reposez-le. L'alchimie entre un lecteur et la plume d'un auteur est immédiate.\n\n## En résumé\n\nLe meilleur livre pour vous n'est pas forcément celui qui a gagné le dernier prix littéraire. C'est celui qui résonne avec votre état d'esprit actuel. Prenez le temps d'explorer, et rappelez-vous : il n'y a pas de mauvaises lectures, seulement des lectures au mauvais moment.`,
            coverImage: "https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&q=80&w=1200",
            language: "fr"
        },
        {
            title: "5 raisons pour lesquelles les livres papier ne disparaîtront jamais",
            slug: "5-raisons-livres-papier-ne-disparaitront-jamais",
            excerpt: "À l'ère du tout-numérique, le livre papier fait de la résistance et continue de séduire de nouvelles générations. Voici pourquoi le format physique est éternel.",
            content: `## Une mort annoncée... et annulée\n\nAu début des années 2010, l'arrivée fracassante des liseuses électroniques et des tablettes devait signer la fin imminente du livre papier. Pourtant, plus d'une décennie plus tard, le marché de l'édition physique se porte merveilleusement bien. Mieux encore : les jeunes générations (la Gen Z) plébiscitent le format papier. Pourquoi cet objet vieux de plusieurs siècles refuse-t-il de mourir ?\n\n### 1. L'expérience multisensorielle\n\nLa lecture numérique n'engage que la vue. Le livre papier engage la vue, le toucher, et l'odorat. Le poids du livre, la texture du papier sous les doigts, et cette odeur si particulière (l'odeur des vieux livres vient de la dégradation de la lignine) créent une expérience immersive irremplaçable.\n\n### 2. Le besoin de déconnexion (Digital Detox)\n\nNous passons en moyenne 6 à 8 heures par jour derrière des écrans (ordinateurs, smartphones, télévisions). Le livre papier est devenu l'un des rares sanctuaires où il n'y a ni notification, ni lumière bleue, ni mise à jour. C'est un espace de déconnexion totale, indispensable pour la santé mentale en 2026.\n\n### 3. La perception de la progression\n\nLire sur un écran vous donne un simple pourcentage de progression en bas de page. Avec un livre physique, vous sentez littéralement le poids des pages lues s'alourdir dans votre main gauche et les pages restantes s'affiner dans votre main droite. Cette sensation physique de l'avancement est très satisfaisante pour le cerveau.\n\n### 4. L'esthétique et l'identité\n\nUne bibliothèque est le reflet de l'âme de son propriétaire. Les couvertures de livres, leurs tranches colorées et la façon dont ils sont rangés (ou empilés) font partie intégrante de la décoration intérieure. L'objet-livre affirme notre identité culturelle bien plus qu'une liste de fichiers dans une liseuse.\n\n### 5. La facilité de partage\n\nPrêter un livre que l'on a adoré à un ami, y glisser un mot, voir les pages écornées témoignant de son voyage... Le livre papier est un objet social par excellence, fait pour circuler de main en main.\n\n**La conclusion est claire :** Le numérique et le physique coexistent désormais, mais le livre papier conserve un statut d'objet totem indétrônable.`,
            coverImage: "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&q=80&w=1200",
            language: "fr"
        },
        {
            title: "كيف تساعدك القراءة على تقليل التوتر والقلق؟",
            slug: "reading-reduces-stress-anxiety",
            excerpt: "في عالم مليء بالضغوط السريعة، تعتبر القراءة واحدة من أكثر الطرق الفعالة والمثبتة علمياً لتخفيف التوتر وتهدئة العقل. اكتشف السر وراء ذلك.",
            content: `## الهروب الإيجابي من الواقع\n\nنعيش في عصر تتسارع فيه وتيرة الحياة وتتكاثر فيه مصادر القلق، من الأخبار السلبية المستمرة إلى ضغوط العمل ومتطلبات الحياة اليومية. في هذا الزحام، يقف الكتاب كملجأ هادئ وآمن. لكن تأثير القراءة يتجاوز مجرد "تضييع الوقت"؛ إنها عملية علاجية حقيقية.\n\n### 1. تخفيض مستويات التوتر علمياً\n\nأجرت جامعة ساسكس البريطانية دراسة رائدة أثبتت أن القراءة قادرة على تقليل مستويات التوتر بنسبة تصل إلى 68%. وقد تفوقت القراءة على وسائل استرخاء أخرى شهيرة مثل الاستماع إلى الموسيقى، أو شرب كوب من الشاي، أو حتى المشي. ست دقائق فقط من القراءة الصامتة كانت كافية لإبطاء معدل ضربات القلب وتخفيف توتر العضلات.\n\n### 2. التركيز أحادي المهمة (Single-tasking)\n\nعقولنا مرهقة من تعدد المهام (Multitasking). عند تصفح الإنترنت، نحن نقرأ، ونستمع، ونراقب الإشعارات في نفس الوقت. أما قراءة كتاب ورقي فتجبر العقل على التركيز في مهمة واحدة فقط. هذا التركيز العميق يشبه حالة التأمل (Mindfulness)، مما يمنح العقل فرصة حقيقية للراحة من التشتت.\n\n### 3. الانفصال المؤقت عن المشاكل\n\nعندما تندمج في قصة رواية أو تتابع تحليلاً عميقاً في كتاب غير روائي، فإنك تنفصل تماماً عن مشاكلك اليومية. أنت لا تتجاهل مشاكلك، بل تمنح عقلك الباطن استراحة ضرورية، مما يساعدك على العودة لمواجهتها لاحقاً بمنظور أوضح وطاقة متجددة.\n\n### 4. توسيع منظور الحياة\n\nالقراءة عن صراعات شخصيات الروايات أو قراءة كتب السير الذاتية تذكرنا بأن التحديات جزء طبيعي من التجربة الإنسانية. هذا يقلل من الشعور بالوحدة والعزلة الذي غالباً ما يصاحب القلق، ويجعلنا أكثر تقبلاً وتقديراً لمسار حياتنا.\n\n## نصيحة عملية\n\nلتحقيق أقصى استفادة، اجعل القراءة جزءاً من روتينك المسائي. اترك هاتفك خارج غرفة النوم، واقرأ لمدة 20 دقيقة قبل النوم. ستلاحظ تحسناً كبيراً في جودة نومك وانخفاضاً ملحوظاً في مستويات القلق الصباحي.`,
            coverImage: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=1200",
            language: "ar"
        },
        {
            title: "Why You Should Always Carry a Book With You",
            slug: "always-carry-a-book",
            excerpt: "Turn waiting time into reading time. How the simple habit of carrying a book everywhere can transform your daily life and productivity.",
            content: `## The Lost Art of Waiting\n\nThink about how much of your day is spent waiting. Waiting for the bus, waiting at the doctor's office, waiting for a friend who is running late, or waiting for water to boil. \n\nWhat do most of us do during these fragmented minutes? We pull out our smartphones and scroll mindlessly through social media. But there is a better way to reclaim this lost time: always carry a physical book.\n\n### 1. Reclaiming Micro-Moments\n\nStephen King, one of the most prolific writers of our time, famously advises aspiring writers to read everywhere. He takes a book to the movies and reads before the lights go down. \n\nIf you replace just 15 minutes of daily smartphone scrolling with reading, you will read roughly 15-20 extra books a year. Those micro-moments add up to a massive intellectual compounding effect.\n\n### 2. A Shield Against Digital Fatigue\n\nEvery time you reach for your phone out of boredom, you subject your brain to an overwhelming flood of dopamine, advertisements, and fragmented information. Pulling out a book instead provides an immediate sense of groundedness. It forces your brain to slow down, focus on a single narrative thread, and rest your eyes from blue light.\n\n### 3. The Ultimate Conversation Starter\n\nCarrying a book is a visible signal of your interests. A book cover can act as an open invitation for organic, real-world connections. You would be surprised how often someone will strike up a conversation by saying, *"I loved that book! How far into it are you?"*\n\n### 4. It Is a Physical Commitment\n\nPutting a book in your bag every morning is a physical commitment to your own personal growth and entertainment. It is a reminder that you value literature and learning enough to literally carry it on your shoulders.\n\n## How to Start\n\nChoose a paperback. Hardcovers are beautiful but heavy. Slip a relatively short, engaging paperback into your bag, backpack, or even a large coat pocket. The next time you find yourself standing in a queue, resist the digital pull. Open a page, and dive in.`,
            coverImage: "https://images.unsplash.com/photo-1491841550275-ad7854e35ca6?auto=format&fit=crop&q=80&w=1200",
            language: "en"
        }
    ]

    for (const article of articles) {
        await prisma.post.create({
            data: {
                ...article,
                published: true,
                publishedAt: new Date(),
                authorId: admin.id,
                viewCount: Math.floor(Math.random() * 1000) + 100,
                category: 'General'
            }
        })
    }

    console.log("5 MORE unique articles created successfully.")
}

main().finally(() => prisma.$disconnect())
