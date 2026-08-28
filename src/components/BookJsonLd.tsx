import React from 'react';

interface BookJsonLdProps {
  book: {
    id: string;
    title: string;
    author: string;
    isbn?: string | null;
    language: string;
    image: string;
    price: number;
    stock: number;
    category?: string | null;
    numberOfPages?: number | null;
  };
  locale: string;
  displayTitle: string;
  displayDescription: string;
  imageUrl: string;
  averageRating: number;
  reviewCount: number;
}

export function BookJsonLd({ book, locale, displayTitle, displayDescription, imageUrl, averageRating, reviewCount }: BookJsonLdProps) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.riwaya.store';
  const bookUrl = `${baseUrl}/${locale}/books/${book.id}`;

  const validIsbn = book.isbn ? book.isbn.replace(/[^0-9X]/gi, '') : null;
  const showIsbn = validIsbn && (validIsbn.length === 10 || validIsbn.length === 13);
  const finalDescription = (displayDescription && displayDescription.trim().length > 15) 
    ? displayDescription 
    : `Découvrez ${displayTitle || book.title} sur Riwaya. Achetez en ligne avec livraison rapide au Maroc (Paiement à la livraison).`;

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["Book", "Product"],
        "@id": bookUrl,
        "name": displayTitle || book.title || "Livre",
        "author": {
          "@type": "Person",
          "name": book.author
        },
        "sku": book.id,
        ...(showIsbn ? { "isbn": validIsbn } : {}),
        "inLanguage": locale === 'ar' ? 'ar' : locale === 'en' ? 'en' : 'fr',
        "publisher": {
          "@type": "Organization",
          "name": "Riwaya",
          "url": baseUrl
        },
        "image": imageUrl,
        "url": bookUrl,
        ...(book.category ? { "genre": book.category } : {}),
        ...(book.numberOfPages ? { "numberOfPages": book.numberOfPages } : {}),
        "description": finalDescription,
        "speakable": {
          "@type": "SpeakableSpecification",
          "cssSelector": ["h1", ".book-description", ".book-price"]
        },
        "brand": {
          "@type": "Brand",
          "name": "Riwaya"
        },
        "category": book.category || "Livres",
        "offers": {
          "@type": "Offer",
          "price": book.price,
          "priceCurrency": "MAD",
          "availability": book.stock > 0
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
          "url": bookUrl,
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
            "merchantReturnDays": 3,
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
        "potentialAction": {
          "@type": "BuyAction",
          "target": bookUrl
        },
        ...(reviewCount > 0 ? {
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": averageRating,
            "reviewCount": reviewCount,
            "bestRating": 5,
            "worstRating": 1
          },
          "review": {
            "@type": "Review",
            "reviewRating": {
              "@type": "Rating",
              "ratingValue": averageRating,
              "bestRating": "5"
            },
            "author": {
              "@type": "Person",
              "name": "Client vérifié"
            }
          }
        } : {})
      }
    ]
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
