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

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["Book", "Product"],
        "@id": bookUrl,
        "name": displayTitle,
        "author": {
          "@type": "Person",
          "name": book.author
        },
        "sku": book.id,
        ...(book.isbn ? { "isbn": book.isbn } : {}),
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
        "description": displayDescription,
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
          "priceCurrency": "درهم",
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
              "currency": "درهم"
            }
          },
          "shippingDetails": {
            "@type": "OfferShippingDetails",
            "shippingRate": {
              "@type": "MonetaryAmount",
              "value": 35,
              "currency": "درهم"
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
          "target": bookUrl,
          "price": book.price,
          "priceCurrency": "درهم"
        },
        ...(reviewCount > 0 ? {
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": averageRating,
            "reviewCount": reviewCount,
            "bestRating": 5,
            "worstRating": 1
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
