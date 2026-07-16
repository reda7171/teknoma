const fs = require('fs');
const path = require('path');

const joinUsTranslations = {
  ar: {
    heroTag: "فرصة عمل",
    heroTitle1: "إلتحق",
    heroTitle2: "بفريق العمل",
    heroDescription: "مدونة المحترف تبحث عن مدون موهوب قادر على الإبداع من اجل وظيفة رسمية في المدونة . إذا كنت موهوب تحب التدوين ولذيك العديد من الافكار فنحن نبحث عنك . اكتب تدوينة تجريبية + تعريف عن نفسك وراسل الكل إلى أمين رغيب",
    conditionsTitle: "شروط المشاركة",
    conditionsDescription: "شكرا لانك إخترت ان تساهم بمواضيعك في مدونة المحترف ، كما ندعوك إلى قراءة هذه الشروط حتى ينشر موضوعك :",
    condition1Title: "لانقبل المواضيع المنقولة جملة وتفصيلا",
    condition1Desc: "سياسة مدونة المحترف طيلة 31 سنة تنبني على إثراء المحتوى العربي للتقنية وعليه فنحن لانقبل اي مواضيع منسوحة جملة وتفصيلا من مواقع اخرى ، في المقابل نقبل المواضيع التي تم صياغتها بطريقتك حتى وإن كانت من مصدر واحد او عدة مصادر .",
    condition2Title: "لانقبل المواضيع التي تم التطرق اليها سابقا",
    condition2Desc: "طبعا لايمكننا نشر مواضيع تم نشرها سابقا وذلك لكي نبتعد عن التكرار .",
    condition3Title: "لانقبل المواضيع التي تتضمن اكواد او برامج تفعيل",
    condition3Desc: "نحن في مدونة المحترف نسهر على عدم إنتهاك حقوق الملكية الفكرية ، لكن في المقابل نقبل اي مواضيع تتضمن اكواد تفعيل رسمية بطرق قانونية .",
    condition4Title: "لانقبل المواضيع ذات ركاكة في التعبير",
    condition4Desc: "كلنا خطائون ، ولا مانع ان تتواجد بعض الاخطاء البسيطة لكن في حالة كانت تجعل الجمل غير مفهومة ، فيستحيل نشرها لركاكتها او اخطاء إملائية كثيرة.",
    applyTitle: "كيفية المراسلة",
    applyDescription: "من اجل مراسلتنا بتدوينتك يرجى كاتبتها في ملف وورد ومراسلة المدونة إياها على الواتساب.",
    applyButton: "راسلنا عبر واتساب",
    applyThanks: "شكرا"
  },
  fr: {
    heroTag: "Opportunité",
    heroTitle1: "Rejoignez",
    heroTitle2: "l'équipe",
    heroDescription: "Le blog Al-Mohtarif recherche un blogueur talentueux et créatif pour un poste officiel sur le blog. Si vous êtes talentueux, que vous aimez bloguer et que vous avez de nombreuses idées, nous vous recherchons. Écrivez un article d'essai + une présentation de vous-même et envoyez le tout à Amine Raghib.",
    conditionsTitle: "Conditions de participation",
    conditionsDescription: "Merci d'avoir choisi de contribuer par vos sujets au blog Al-Mohtarif, nous vous invitons à lire ces conditions pour que votre sujet soit publié :",
    condition1Title: "Nous n'acceptons pas les sujets copiés",
    condition1Desc: "La politique du blog Al-Mohtarif depuis 31 ans repose sur l'enrichissement du contenu technique arabe et par conséquent, nous n'acceptons aucun sujet copié entièrement d'autres sites. En revanche, nous acceptons les sujets rédigés à votre manière, même s'ils proviennent d'une ou plusieurs sources.",
    condition2Title: "Nous n'acceptons pas les sujets déjà abordés",
    condition2Desc: "Bien sûr, nous ne pouvons pas publier des sujets qui ont déjà été publiés afin d'éviter les répétitions.",
    condition3Title: "Nous n'acceptons pas les sujets contenant des codes ou logiciels d'activation",
    condition3Desc: "Au blog Al-Mohtarif, nous veillons à ne pas enfreindre les droits de propriété intellectuelle. En revanche, nous acceptons tout sujet incluant des codes d'activation officiels obtenus par des moyens légaux.",
    condition4Title: "Nous n'acceptons pas les sujets mal formulés",
    condition4Desc: "Nous faisons tous des erreurs, et quelques petites fautes ne posent pas de problème, mais si elles rendent les phrases incompréhensibles ou si les fautes d'orthographe sont trop nombreuses, la publication est impossible.",
    applyTitle: "Comment postuler",
    applyDescription: "Afin de nous envoyer votre article, veuillez l'écrire dans un fichier Word et l'envoyer au blog via WhatsApp.",
    applyButton: "Contactez-nous sur WhatsApp",
    applyThanks: "Merci"
  },
  en: {
    heroTag: "Job Opportunity",
    heroTitle1: "Join",
    heroTitle2: "the Team",
    heroDescription: "Al-Mohtarif blog is looking for a talented and creative blogger for an official position on the blog. If you are talented, love blogging, and have many ideas, we are looking for you. Write a sample post + an introduction about yourself and send everything to Amine Raghib.",
    conditionsTitle: "Participation Conditions",
    conditionsDescription: "Thank you for choosing to contribute your topics to Al-Mohtarif blog. We invite you to read these conditions so your topic can be published:",
    condition1Title: "We do not accept fully copied topics",
    condition1Desc: "Al-Mohtarif blog's policy over the past 31 years has been based on enriching Arabic technical content, therefore we do not accept topics copied entirely from other sites. On the other hand, we accept topics written in your own words even if they come from one or multiple sources.",
    condition2Title: "We do not accept previously covered topics",
    condition2Desc: "Of course, we cannot publish topics that have already been published in order to avoid repetition.",
    condition3Title: "We do not accept topics containing activation codes or software",
    condition3Desc: "At Al-Mohtarif blog, we ensure not to violate intellectual property rights. However, we accept topics containing official activation codes obtained through legal means.",
    condition4Title: "We do not accept poorly written topics",
    condition4Desc: "We all make mistakes, and a few minor errors are fine, but if they make sentences incomprehensible or if there are too many spelling mistakes, it is impossible to publish.",
    applyTitle: "How to Apply",
    applyDescription: "In order to send us your post, please write it in a Word file and send it to the blog via WhatsApp.",
    applyButton: "Contact us via WhatsApp",
    applyThanks: "Thank you"
  }
};

const langs = ['ar', 'en', 'fr'];
langs.forEach(lang => {
  const filePath = path.join(__dirname, 'src', 'messages', `${lang}.json`);
  let data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  data.JoinUs = joinUsTranslations[lang];
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`Updated ${lang}.json`);
});
