const fs = require('fs');
const path = require('path');

const frContent = {
  "ProgrammeVendeurPartenaire": "Programme Vendeur Partenaire",
  "OuvrezVotre": "Ouvrez votre",
  "SuccursaleLitteraire": "succursale littéraire.",
  "HeroDescription": "Touchez des milliers de lecteurs à travers tout le Maroc. Nous gérons la livraison COD et sécurisons vos paiements.",
  "BtnDevenirVendeur": "Devenir vendeur",
  "BtnCommentCaMarche": "Comment ça marche ?",
  "PourquoiVendre": "Pourquoi vendre sur Riwaya ?",
  "CroissancePriorite": "Votre croissance, notre priorité.",
  "Feature1Title": "Audience qualifiée",
  "Feature1Desc": "Vos livres sont directement présentés à des milliers de passionnés de lecture au Maroc.",
  "Feature2Title": "Logistique COD",
  "Feature2Desc": "Oubliez les tracas d'expédition. Notre partenaire logistique récupère et livre en Cash On Delivery.",
  "Feature3Title": "Paiements rapides",
  "Feature3Desc": "Recevez votre argent rapidement et en toute sécurité après la confirmation de chaque livraison.",
  "Feature4Title": "Support dédié",
  "Feature4Desc": "Un accompagnement sur-mesure pour mettre en valeur votre catalogue et doper vos ventes.",
  "4Etapes": "Commencez à vendre en 4 étapes simples.",
  "Step1Title": "Créez votre boutique",
  "Step1Desc": "Remplissez le formulaire d'inscription pour configurer votre compte vendeur en moins de 3 minutes.",
  "Step2Title": "Ajoutez vos livres",
  "Step2Desc": "Uploadez vos couvertures, fixez vos prix et gérez facilement votre stock depuis votre tableau de bord.",
  "Step3Title": "Recevez les commandes",
  "Step3Desc": "Soyez notifié instantanément à chaque nouvel achat par un client de la plateforme.",
  "Step4Title": "Expédition & Paiement",
  "Step4Desc": "Préparez vos colis. Nous nous occupons de l'expédition (COD). Votre argent est transféré après livraison réussie.",
  "NouvelleCommande": "Nouvelle commande",
  "AlchimistePrice": "L'Alchimiste - 80 DH",
  "SoldeDisponible": "Solde disponible",
  "SoldeAmount": "+1 450 DH",
  "RejoindreVendeurs": "Rejoindre les vendeurs",
  "FormDescription": "Remplissez le formulaire ci-dessous pour que notre équipe valide votre compte et lance votre boutique."
};

const enContent = {
  "ProgrammeVendeurPartenaire": "Partner Seller Program",
  "OuvrezVotre": "Open your",
  "SuccursaleLitteraire": "literary branch.",
  "HeroDescription": "Reach thousands of readers across Morocco. We handle COD delivery and secure your payments.",
  "BtnDevenirVendeur": "Become a seller",
  "BtnCommentCaMarche": "How does it work?",
  "PourquoiVendre": "Why sell on Riwaya?",
  "CroissancePriorite": "Your growth, our priority.",
  "Feature1Title": "Qualified Audience",
  "Feature1Desc": "Your books are directly presented to thousands of reading enthusiasts in Morocco.",
  "Feature2Title": "COD Logistics",
  "Feature2Desc": "Forget shipping hassles. Our logistics partner collects and delivers via Cash On Delivery.",
  "Feature3Title": "Fast Payments",
  "Feature3Desc": "Receive your money quickly and securely after the confirmation of each delivery.",
  "Feature4Title": "Dedicated Support",
  "Feature4Desc": "Tailor-made support to showcase your catalog and boost your sales.",
  "4Etapes": "Start selling in 4 simple steps.",
  "Step1Title": "Create your store",
  "Step1Desc": "Fill out the registration form to set up your seller account in less than 3 minutes.",
  "Step2Title": "Add your books",
  "Step2Desc": "Upload your covers, set your prices, and easily manage your stock from your dashboard.",
  "Step3Title": "Receive orders",
  "Step3Desc": "Be notified instantly of every new purchase by a customer on the platform.",
  "Step4Title": "Shipping & Payment",
  "Step4Desc": "Prepare your packages. We handle shipping (COD). Your money is transferred after successful delivery.",
  "NouvelleCommande": "New order",
  "AlchimistePrice": "The Alchemist - 80 MAD",
  "SoldeDisponible": "Available balance",
  "SoldeAmount": "+1,450 MAD",
  "RejoindreVendeurs": "Join the sellers",
  "FormDescription": "Fill out the form below so our team can validate your account and launch your store."
};

const arContent = {
  "ProgrammeVendeurPartenaire": "برنامج البائع الشريك",
  "OuvrezVotre": "افتح",
  "SuccursaleLitteraire": "فرعك الأدبي.",
  "HeroDescription": "صل إلى آلاف القراء في جميع أنحاء المغرب. نحن نتولى خدمة الدفع عند الاستلام ونؤمن مدفوعاتك.",
  "BtnDevenirVendeur": "كن بائعاً",
  "BtnCommentCaMarche": "كيف يعمل؟",
  "PourquoiVendre": "لماذا تبيع على رواية؟",
  "CroissancePriorite": "نموك، أولويتنا.",
  "Feature1Title": "جمهور مؤهل",
  "Feature1Desc": "يتم عرض كتبك مباشرة لآلاف عشاق القراءة في المغرب.",
  "Feature2Title": "خدمات لوجستية (الدفع عند الاستلام)",
  "Feature2Desc": "انسَ متاعب الشحن. يقوم شريكنا اللوجستي بالاستلام والتسليم عبر خدمة الدفع عند الاستلام.",
  "Feature3Title": "مدفوعات سريعة",
  "Feature3Desc": "احصل على أموالك بسرعة وبأمان بعد تأكيد كل عملية تسليم.",
  "Feature4Title": "دعم مخصص",
  "Feature4Desc": "دعم مخصص لإبراز قائمة كتبك وزيادة مبيعاتك.",
  "4Etapes": "ابدأ البيع في 4 خطوات بسيطة.",
  "Step1Title": "أنشئ متجرك",
  "Step1Desc": "املأ استمارة التسجيل لإعداد حساب البائع الخاص بك في أقل من 3 دقائق.",
  "Step2Title": "أضف كتبك",
  "Step2Desc": "قم بتحميل الأغلفة وحدد الأسعار وأدر مخزونك بسهولة من لوحة التحكم الخاصة بك.",
  "Step3Title": "استقبل الطلبات",
  "Step3Desc": "احصل على إشعار فوري عند كل عملية شراء جديدة من عميل على المنصة.",
  "Step4Title": "الشحن والدفع",
  "Step4Desc": "جهز طرودك. نحن نتولى الشحن (الدفع عند الاستلام). يتم تحويل أموالك بعد التسليم الناجح.",
  "NouvelleCommande": "طلب جديد",
  "AlchimistePrice": "الخيميائي - 80 درهم",
  "SoldeDisponible": "الرصيد المتاح",
  "SoldeAmount": "+1 450 درهم",
  "RejoindreVendeurs": "انضم إلى البائعين",
  "FormDescription": "املأ الاستمارة أدناه ليقوم فريقنا بالتحقق من حسابك وإطلاق متجرك."
};

const updateFile = (lang, content) => {
    const filePath = path.join(__dirname, 'src/messages', `${lang}.json`);
    const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    fileData['DevenirVendeur'] = content;
    fs.writeFileSync(filePath, JSON.stringify(fileData, null, 2), 'utf8');
    console.log(`Updated ${lang}.json`);
};

updateFile('fr', frContent);
updateFile('en', enContent);
updateFile('ar', arContent);
