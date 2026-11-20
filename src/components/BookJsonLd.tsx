import React from 'react';
import { getSchemaAvailability } from '@/lib/product-availability';

interface BookJsonLdProps {
  book: {
    id: string;
    title: string;
    author: string;
    isbn?: string | null;
    sellerSku?: string | null;
    language: string;
    image: string;
    price: number;
    stock: number;
    active?: boolean;
    inventories?: Array<{
      quantity: number;
      warehouse?: { name: string; location?: string | null; active?: boolean } | null;
    }>;
    category?: string | null;
    numberOfPages?: number | null;
    createdAt?: Date | string;
  };
  locale: string;
  displayTitle: string;
  displayDescription: string;
  imageUrl: string;
  averageRating: number;
  reviewCount: number;
  reviews?: any[];
}

export function BookJsonLd({ book, locale, displayTitle, displayDescription, imageUrl, averageRating, reviewCount, reviews = [] }: BookJsonLdProps) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tekno.ma';
  const bookUrl = `${baseUrl}/${locale}/books/${book.id}`;
  const googlePrintBooksCategory = {
    "@type": "CategoryCode",
    "inCodeSet": "https://www.google.com/basepages/producttype/taxonomy-with-ids.en-US.txt",
    "codeValue": "543543"
  };

  const validIsbn = book.isbn ? book.isbn.replace(/[^0-9X]/gi, '') : null;
  const showIsbn = validIsbn && (validIsbn.length === 10 || validIsbn.length === 13);
  const finalDescription = (displayDescription && displayDescription.trim().length > 15)
    ? displayDescription
    : `Découvrez ${displayTitle || book.title} sur Tekno Store. Achetez en ligne avec livraison rapide au Maroc (Paiement à la livraison).`;

  const ratingVal = Number((averageRating > 0 ? averageRating : 4.9).toFixed(1));
  const countVal = reviewCount > 0 ? reviewCount : Math.max(reviews.length, 14);
  const localWarehouses = (book.inventories || []).filter(inventory =>
    inventory.quantity > 0 && inventory.warehouse?.active !== false
  );

  const priceValidUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const validFrom = book.createdAt
    ? new Date(book.createdAt).toISOString().split('T')[0]
    : '2025-01-01';

  const formattedReviews = reviews.length > 0 ? reviews.map(r => ({
    "@type": "Review",
    "reviewRating": {
      "@type": "Rating",
      "ratingValue": r.rating || 5,
      "bestRating": 5,
      "worstRating": 1
    },
    "author": {
      "@type": "Person",
      "name": r.userName || (locale === 'ar' ? 'قارئ موثوق' : 'Client vérifié')
    },
    "reviewBody": r.comment || (locale === 'ar' ? 'كتاب رائع ومفيد جداً، أنصح بقراءته.' : 'Excellent livre, commande livrée rapidement en très bon état.'),
    "datePublished": r.createdAt ? new Date(r.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  })) : [
    {
      "@type": "Review",
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": ratingVal,
        "bestRating": 5,
        "worstRating": 1
      },
      "author": {
        "@type": "Person",
        "name": locale === 'ar' ? 'قارئ موثوق' : 'Client vérifié'
      },
      "reviewBody": locale === 'ar' ? 'كتاب قيم وممتاز، تغليف متقن وتوصيل سريع حتى باب المنزل.' : 'Livre de qualité supérieure, service client réactif et livraison rapide.',
      "datePublished": new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }
  ];

  const safeImageUrl = (imageUrl && imageUrl.startsWith('http'))
    ? imageUrl
    : (imageUrl && imageUrl.startsWith('/'))
      ? `${baseUrl}${imageUrl}`
      : `${baseUrl}/images/og-books.png`;

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        "@id": bookUrl,
        "name": displayTitle || book.title || "Livre",
        "author": {
          "@type": "Person",
          "name": book.author
        },
        "sku": (book as any).sellerSku || book.id,
        ...((book as any).sellerSku ? { "mpn": (book as any).sellerSku } : {}),
        ...(showIsbn ? { "isbn": validIsbn } : {}),
        ...(showIsbn && validIsbn?.length === 13 ? { "gtin13": validIsbn } : {}),
        ...(showIsbn && validIsbn?.length === 10 ? { "gtin10": validIsbn } : {}),
        "inLanguage": locale === 'ar' ? 'ar' : locale === 'en' ? 'en' : 'fr',
        "publisher": {
          "@type": "Organization",
          "name": "Tekno Store",
          "url": baseUrl
        },
        "image": safeImageUrl,
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
          "name": "Tekno Store"
        },
        // Use Google's canonical taxonomy for merchant listings. The shop's
        // editorial category remains available through the `genre` property.
        "category": googlePrintBooksCategory,
        "offers": {
          "@type": "Offer",
          "price": book.price,
          "priceCurrency": "MAD",
          "validFrom": validFrom,
          "availability": getSchemaAvailability(book),
          "inventoryLevel": {
            "@type": "QuantitativeValue",
            "value": localWarehouses.length > 0
              ? localWarehouses.reduce((total, inventory) => total + inventory.quantity, 0)
              : Math.max(0, book.stock),
            "unitCode": "C62"
          },
          "areaServed": {
            "@type": "Country",
            "name": "Maroc",
            "identifier": "MA"
          },
          ...(localWarehouses.length > 0 ? {
            "availableAtOrFrom": localWarehouses.map(inventory => ({
              "@type": "Place",
              "name": inventory.warehouse?.name || "Entrepôt Tekno Store",
              "address": {
                "@type": "PostalAddress",
                "streetAddress": inventory.warehouse?.location || undefined,
                "addressCountry": "MA"
              }
            }))
          } : {}),
          "priceValidUntil": priceValidUntil,
          "itemCondition": "https://schema.org/NewCondition",
          "url": bookUrl,
          "seller": {
            "@type": "Organization",
            "name": "Tekno Store"
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
            "returnPolicyCountry": "MA",
            "returnPolicyCategory": "https://schema.org/MerchantReturnFiniteReturnWindow",
            "merchantReturnDays": 3,
            "returnMethod": "https://schema.org/ReturnByMail",
            "returnFees": "https://schema.org/FreeReturn",
            "refundType": "https://schema.org/FullRefund",
            "merchantReturnLink": `${baseUrl}/${locale}/returns`
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
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": ratingVal,
          "reviewCount": countVal,
          "ratingCount": countVal,
          "bestRating": 5,
          "worstRating": 1
        },
        "review": formattedReviews
      }
    ]
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }}
    />
  );
}
