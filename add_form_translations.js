const fs = require('fs');
const path = require('path');

const frContent = {
  "StoreNameLabel": "Nom de la boutique / Librairie *",
  "StoreNamePlaceholder": "Ex: Librairie des Oliviers",
  "ManagerNameLabel": "Nom du gérant *",
  "ManagerNamePlaceholder": "Votre prénom et nom",
  "EmailLabel": "Adresse Email *",
  "PhoneLabel": "Téléphone *",
  "CityLabel": "Ville *",
  "CityPlaceholder": "Casablanca",
  "StockSizeLabel": "Taille du stock estimée *",
  "SelectPlaceholder": "Sélectionnez...",
  "Stock1": "1 - 50 livres",
  "Stock2": "50 - 200 livres",
  "Stock3": "200 - 1000 livres",
  "Stock4": "1000+ livres",
  "Submitting": "Envoi en cours...",
  "SubmitBtn": "Soumettre ma candidature",
  "Disclaimer": "En soumettant ce formulaire, vous acceptez d'être recontacté par l'équipe Riwaya.",
  "ThanksTitle": "Merci !",
  "ThanksMsg": "Votre candidature a bien été reçue. Notre équipe vous contactera très prochainement pour finaliser la création de votre boutique.",
  "ErrorMsg": "Une erreur est survenue."
};

const enContent = {
  "StoreNameLabel": "Store / Bookstore Name *",
  "StoreNamePlaceholder": "Ex: The Olive Bookstore",
  "ManagerNameLabel": "Manager Name *",
  "ManagerNamePlaceholder": "Your first and last name",
  "EmailLabel": "Email Address *",
  "PhoneLabel": "Phone *",
  "CityLabel": "City *",
  "CityPlaceholder": "Casablanca",
  "StockSizeLabel": "Estimated Stock Size *",
  "SelectPlaceholder": "Select...",
  "Stock1": "1 - 50 books",
  "Stock2": "50 - 200 books",
  "Stock3": "200 - 1000 books",
  "Stock4": "1000+ books",
  "Submitting": "Sending...",
  "SubmitBtn": "Submit my application",
  "Disclaimer": "By submitting this form, you agree to be contacted by the Riwaya team.",
  "ThanksTitle": "Thank you!",
  "ThanksMsg": "Your application has been received. Our team will contact you shortly to finalize the creation of your store.",
  "ErrorMsg": "An error has occurred."
};

const arContent = {
  "StoreNameLabel": "اسم المتجر / المكتبة *",
  "StoreNamePlaceholder": "مثال: مكتبة الزيتون",
  "ManagerNameLabel": "اسم المدير *",
  "ManagerNamePlaceholder": "الاسم الشخصي والعائلي",
  "EmailLabel": "البريد الإلكتروني *",
  "PhoneLabel": "رقم الهاتف *",
  "CityLabel": "المدينة *",
  "CityPlaceholder": "الدار البيضاء",
  "StockSizeLabel": "حجم المخزون التقديري *",
  "SelectPlaceholder": "اختر...",
  "Stock1": "1 - 50 كتاب",
  "Stock2": "50 - 200 كتاب",
  "Stock3": "200 - 1000 كتاب",
  "Stock4": "1000+ كتاب",
  "Submitting": "جاري الإرسال...",
  "SubmitBtn": "تقديم طلبي",
  "Disclaimer": "بإرسالك لهذا النموذج، فإنك توافق على أن يتواصل معك فريق رواية.",
  "ThanksTitle": "شكراً لك!",
  "ThanksMsg": "لقد تلقينا طلبك. سيتصل بك فريقنا قريباً جداً لإنهاء إنشاء متجرك.",
  "ErrorMsg": "حدث خطأ."
};

const updateFile = (lang, content) => {
    const filePath = path.join(__dirname, 'src/messages', `${lang}.json`);
    const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    fileData['DevenirVendeurForm'] = content;
    fs.writeFileSync(filePath, JSON.stringify(fileData, null, 2), 'utf8');
    console.log(`Updated ${lang}.json for form`);
};

updateFile('fr', frContent);
updateFile('en', enContent);
updateFile('ar', arContent);
