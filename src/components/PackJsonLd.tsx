import React from 'react';

interface PackJsonLdProps {
  pack: {
    id: string;
    name: string;
    price: number;
    description?: string | null;
    image?: string | null;
    books?: Array<{ title: string; author: string }>;
  };
  locale: string;
  baseUrl?: string;
}

export function PackJsonLd({ pack, locale, baseUrl = 'https://riwaya.store' }: PackJsonLdProps) {
  const packUrl = `${baseUrl}/${locale}/packs/${pack.id}`;

  // Description auto si absente
  const description = pack.description ||
    (locale === 'ar'
      ? `باقة ${pack.name} تحتوي على ${pack.books?.length || 'عدة'} كتب من مكتبة رواية. الدفع عند الاستلام، توصيل في المغرب.`
      : locale === 'en'
        ? `Pack ${pack.name} includes ${pack.books?.length || 'several'} books from Riwaya bookstore. Cash on delivery, shipping across Morocco.`
        : `Le pack ${pack.name} contient ${pack.books?.length || 'plusieurs'} livres de la librairie Riwaya. Paiement à la livraison, livraison partout au Maroc.`
    );

  // FAQ dynamique sur le pack
  const faqQuestions = [
    {
      "@type": "Question",
      "name": locale === 'ar'
        ? `ما هي الكتب المتضمنة في باقة ${pack.name}؟`
        : locale === 'en'
          ? `What books are included in the ${pack.name} pack?`
          : `Quels livres sont inclus dans le pack ${pack.name} ?`,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": pack.books && pack.books.length > 0
          ? pack.books.map(b => `${b.title} (${b.author})`).join(', ')
          : description
      }
    },
    {
      "@type": "Question",
      "name": locale === 'ar'
        ? `ما هو سعر باقة ${pack.name}؟`
        : locale === 'en'
          ? `What is the price of the ${pack.name} pack?`
          : `Quel est le prix du pack ${pack.name} ?`,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": locale === 'ar'
          ? `سعر باقة ${pack.name} هو ${pack.price} درهم مغربي. الدفع عند الاستلام.`
          : locale === 'en'
            ? `The ${pack.name} pack costs ${pack.price} MAD. Payment on delivery.`
            : `Le pack ${pack.name} est à ${pack.price} MAD. Paiement à la livraison.`
      }
    },
    {
      "@type": "Question",
      "name": locale === 'ar'
        ? `هل يمكنني طلب باقة ${pack.name} مع الدفع عند التسليم؟`
        : locale === 'en'
          ? `Can I order the ${pack.name} pack with cash on delivery?`
          : `Puis-je commander le pack ${pack.name} avec paiement à la livraison ?`,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": locale === 'ar'
          ? "نعم، نقبل الدفع عند الاستلام لجميع الطلبات في المغرب."
          : locale === 'en'
            ? "Yes, we accept cash on delivery for all orders in Morocco."
            : "Oui, nous acceptons le paiement à la livraison pour toutes les commandes au Maroc."
      }
    }
  ];

  const schema = [
    // Product schema pour le pack
    {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": pack.name,
      "description": description,
      "url": packUrl,
      ...(pack.image ? { "image": pack.image } : {}),
      "brand": {
        "@type": "Brand",
        "name": "Riwaya"
      },
      "category": locale === 'ar' ? "باقات كتب" : locale === 'en' ? "Book Packs" : "Packs de livres",
      "offers": {
        "@type": "Offer",
        "price": pack.price,
        "priceCurrency": "MAD",
        "availability": "https://schema.org/InStock",
        "url": packUrl,
        "seller": {
          "@type": "Organization",
          "name": "Riwaya"
        },
        "deliveryLeadTime": {
          "@type": "QuantitativeValue",
          "minValue": 1,
          "maxValue": 4,
          "unitCode": "DAY"
        },
        "hasMerchantReturnPolicy": {
          "@type": "MerchantReturnPolicy",
          "applicableCountry": "MA",
          "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
          "merchantReturnDays": 7,
          "returnMethod": "https://schema.org/ReturnByMail",
          "returnFees": "https://schema.org/ReturnShippingFees",
          "returnShippingFeesAmount": {
            "@type": "MonetaryAmount",
            "value": 35,
            "currency": "MAD"
          }
        },
        "shippingDetails": {
          "@type": "OfferShippingDetails",
          "shippingRate": {
            "@type": "MonetaryAmount",
            "value": 35,
            "currency": "MAD"
          },
          "shippingDestination": {
            "@type": "DefinedRegion",
            "addressCountry": "MA"
          },
          "deliveryTime": {
            "@type": "ShippingDeliveryTime",
            "handlingTime": {
              "@type": "QuantitativeValue",
              "minValue": 0,
              "maxValue": 1,
              "unitCode": "DAY"
            },
            "transitTime": {
              "@type": "QuantitativeValue",
              "minValue": 1,
              "maxValue": 3,
              "unitCode": "DAY"
            }
          }
        }
      },
      // Contenu du pack comme ItemList
      ...(pack.books && pack.books.length > 0 ? {
        "isRelatedTo": pack.books.map(b => ({
          "@type": "Book",
          "name": b.title,
          "author": { "@type": "Person", "name": b.author }
        }))
      } : {})
    },
    // FAQPage pour répondre aux questions AEO
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqQuestions
    }
  ];

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
