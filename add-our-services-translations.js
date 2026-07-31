const fs = require('fs');
const path = require('path');

const messagesDir = path.join(process.cwd(), 'src', 'messages');
const locales = ['en', 'fr', 'ar'];

const translations = {
  en: {
    OurServices: {
      title: "Our Services",
      subtitle: "Discover all the services Riwaya offers for book lovers",
      hero_title: "Upgrade Your Reading Experience",
      hero_desc: "From buying and exchanging to special packs and local delivery, we have everything you need.",
      services: {
        buy: {
          title: "Buy Books",
          desc: "Explore a wide range of popular books across various categories and genres."
        },
        exchange: {
          title: "Book Exchange",
          desc: "Exchange books directly with other readers or earn credits for your next read."
        },
        packs: {
          title: "Advantageous Packs",
          desc: "Save more by buying books in curated packs of 2, 3, or 4 books."
        },
        cod: {
          title: "Cash on Delivery",
          desc: "Pay easily and securely only when you receive your order."
        },
        sell: {
          title: "Sell Your Books",
          desc: "Give your used books a second life by selling them on our platform."
        },
        local: {
          title: "Local Delivery",
          desc: "Fast and reliable delivery to your doorstep."
        }
      }
    }
  },
  fr: {
    OurServices: {
      title: "Nos Services",
      subtitle: "Découvrez tous les services que Riwaya propose aux passionnés de lecture",
      hero_title: "Améliorez Votre Expérience de Lecture",
      hero_desc: "De l'achat et l'échange aux packs spéciaux et la livraison locale, nous avons tout ce dont vous avez besoin.",
      services: {
        buy: {
          title: "Acheter des Livres",
          desc: "Explorez un large choix de livres populaires dans diverses catégories et genres."
        },
        exchange: {
          title: "Échange de Livres",
          desc: "Échangez des livres directement avec d'autres lecteurs ou gagnez des crédits pour votre prochaine lecture."
        },
        packs: {
          title: "Packs Avantageux",
          desc: "Économisez davantage en achetant des livres en packs de 2, 3 ou 4 livres."
        },
        cod: {
          title: "Paiement à la Livraison",
          desc: "Payez facilement et en toute sécurité uniquement à la réception de votre commande."
        },
        sell: {
          title: "Vendez Vos Livres",
          desc: "Donnez une seconde vie à vos livres d'occasion en les vendant sur notre plateforme."
        },
        local: {
          title: "Livraison Locale",
          desc: "Livraison rapide et fiable directement à votre porte."
        }
      }
    }
  },
  ar: {
    OurServices: {
      title: "خدماتنا",
      subtitle: "اكتشف جميع الخدمات التي تقدمها رواية لعشاق الكتب",
      hero_title: "ارتقِ بتجربة القراءة الخاصة بك",
      hero_desc: "من شراء وتبادل الكتب إلى الباقات الخاصة والتوصيل المحلي، لدينا كل ما تحتاجه.",
      services: {
        buy: {
          title: "شراء الكتب",
          desc: "استكشف مجموعة واسعة من الكتب الشهيرة في مختلف الفئات والأنواع."
        },
        exchange: {
          title: "تبادل الكتب",
          desc: "تبادل الكتب مباشرة مع قراء آخرين أو اكسب أرصدة لقراءتك القادمة."
        },
        packs: {
          title: "باقات توفيرية",
          desc: "وفر أكثر عند شراء الكتب في باقات من كتابين أو 3 أو 4 كتب."
        },
        cod: {
          title: "الدفع عند الاستلام",
          desc: "ادفع بسهولة وأمان فقط عند استلام طلبك."
        },
        sell: {
          title: "بيع كتبك",
          desc: "امنح كتبك المستعملة حياة ثانية ببيعها على منصتنا."
        },
        local: {
          title: "توصيل محلي",
          desc: "توصيل سريع وموثوق مباشرة إلى باب منزلك."
        }
      }
    }
  }
};

for (const locale of locales) {
  const filePath = path.join(messagesDir, `${locale}.json`);
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    data.OurServices = translations[locale].OurServices;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`Updated ${locale}.json`);
  }
}
