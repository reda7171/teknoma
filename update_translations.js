const fs = require('fs');
const path = require('path');

const messagesDir = path.join(__dirname, 'src/messages');
const files = ['fr.json', 'ar.json', 'en.json'];

const newTranslations = {
  fr: {
    MapNetwork: "Réseau Riwaya",
    MapExchange: "Échange de livres",
    UnlockMap: "Débloquez la carte",
    UnlockDesc: "Pour voir les livres disponibles près de chez vous et commencer à échanger.",
    SignUpCTA: "S'inscrire et passer la commande pour pouvoir échanger",
    WhatsAppSupport: "Support WhatsApp"
  },
  ar: {
    MapNetwork: "سوق الكتب",
    MapExchange: "اعثر على كنوز قرب منزلك",
    UnlockMap: "افتح الخريطة",
    UnlockDesc: "لرؤية الكتب المتاحة بالقرب منك والبدء في التبادل.",
    SignUpCTA: "قم بالتسجيل و اطلب لتبدأ في التبادل",
    WhatsAppSupport: "دعم واتساب"
  },
  en: {
    MapNetwork: "Riwaya Network",
    MapExchange: "Book Exchange",
    UnlockMap: "Unlock the Map",
    UnlockDesc: "To see available books near you and start exchanging.",
    SignUpCTA: "Sign up and place an order to start exchanging",
    WhatsAppSupport: "WhatsApp Support"
  }
};

for (const file of files) {
  const lang = file.split('.')[0];
  const filePath = path.join(messagesDir, file);
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Ensure Community.Market exists
    if (!data.Community) data.Community = {};
    if (!data.Community.Market) data.Community.Market = {};
    
    // Add translations
    Object.assign(data.Community.Market, newTranslations[lang]);
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Updated ${file}`);
  }
}
