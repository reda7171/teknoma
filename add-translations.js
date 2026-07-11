const fs = require('fs');
const files = ['src/messages/fr.json', 'src/messages/en.json', 'src/messages/ar.json'];

const translations = {
  fr: {
    pageTitle: 'Déposez votre liste scolaire : <span class="text-transparent bg-clip-text bg-gradient-to-r from-[#10b981] to-teal-500">on s\'occupe de tout !</span>',
    tag: 'Rentrée Scolaire',
    subtitle: 'Liste complète garantie, sans prise de tête 👌',
    teamMsg: 'Notre équipe s\'occupera de tout préparer,<br class="hidden md:block"/> fini les tracas de la rentrée scolaire !',
    formTitle: 'Envoyez-nous votre liste',
    fillAllError: 'Veuillez remplir tous les champs et ajouter un fichier.',
    genericError: 'Une erreur est survenue.',
    successTitle: 'Liste reçue avec succès !',
    successMsg: 'Nous avons bien reçu votre liste. Notre équipe s\'occupe de tout et vous contactera très prochainement sur le numéro fourni.',
    sendAnother: 'Envoyer une autre liste',
    fullName: 'Nom complet *',
    fullNamePlaceholder: 'Ex: Mohamed Amine',
    phone: 'Numéro de téléphone *',
    phonePlaceholder: 'Ex: 06 12 34 56 78',
    fileLabel: 'Fichier de la liste (PDF, DOCX, TXT) *',
    dragDrop: 'Cliquez ou glissez votre fichier ici',
    fileLimits: 'PDF, DOCX ou TXT (Max 10MB)',
    sending: 'Envoi en cours...',
    send: 'Envoyer ma liste'
  },
  en: {
    pageTitle: 'Drop your school list: <span class="text-transparent bg-clip-text bg-gradient-to-r from-[#10b981] to-teal-500">we take care of everything!</span>',
    tag: 'Back to School',
    subtitle: 'Complete list guaranteed, hassle-free 👌',
    teamMsg: 'Our team will take care of everything,<br class="hidden md:block"/> no more back-to-school worries!',
    formTitle: 'Send us your list',
    fillAllError: 'Please fill in all fields and add a file.',
    genericError: 'An error occurred.',
    successTitle: 'List received successfully!',
    successMsg: 'We have received your list. Our team is taking care of it and will contact you shortly on the provided number.',
    sendAnother: 'Send another list',
    fullName: 'Full name *',
    fullNamePlaceholder: 'E.g., John Doe',
    phone: 'Phone number *',
    phonePlaceholder: 'E.g., 06 12 34 56 78',
    fileLabel: 'List file (PDF, DOCX, TXT) *',
    dragDrop: 'Click or drag your file here',
    fileLimits: 'PDF, DOCX or TXT (Max 10MB)',
    sending: 'Sending...',
    send: 'Send my list'
  },
  ar: {
    pageTitle: 'ضع قائمتك المدرسية : <span class="text-transparent bg-clip-text bg-gradient-to-r from-[#10b981] to-teal-500">نحن نتكفل بالباقي !</span>',
    tag: 'الدخول المدرسي',
    subtitle: 'قائمة كاملة مضمونة، بدون أي عناء 👌',
    teamMsg: 'فريقنا سيتكفل بتحضير كل شيء،<br class="hidden md:block"/> وداعا لمتاعب الدخول المدرسي!',
    formTitle: 'أرسل لنا قائمتك',
    fillAllError: 'المرجوا ملء جميع الحقول وإضافة ملف.',
    genericError: 'حدث خطأ ما.',
    successTitle: 'تم استلام القائمة بنجاح!',
    successMsg: 'لقد توصلنا بقائمتك بنجاح. فريقنا يتكفل بها وسيتصل بك قريبا على الرقم الذي قدمته.',
    sendAnother: 'إرسال قائمة أخرى',
    fullName: 'الاسم الكامل *',
    fullNamePlaceholder: 'مثال: محمد أمين',
    phone: 'رقم الهاتف *',
    phonePlaceholder: 'مثال: 06 12 34 56 78',
    fileLabel: 'ملف القائمة (PDF, DOCX, TXT) *',
    dragDrop: 'انقر أو اسحب ملفك هنا',
    fileLimits: 'PDF, DOCX أو TXT (الحد الأقصى 10 ميغابايت)',
    sending: 'جاري الإرسال...',
    send: 'إرسال قائمتي'
  }
};

files.forEach((file) => {
  const lang = file.match(/([a-z]{2})\.json/)[1];
  let data = JSON.parse(fs.readFileSync(file, "utf8"));
  data.DeposerListe = translations[lang];
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  console.log(`Updated ${file}`);
});
