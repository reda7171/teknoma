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

  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Book",
        "@id": `${baseUrl}/${locale}/books/${book.id}`,
        "name": displayTitle,
        "author": {
          "@type": "Person",
          "name": book.author
        },
        "isbn": book.isbn || `RIWAYA-${book.id}`,
        "inLanguage": locale === 'ar' ? 'ar' : locale === 'en' ? 'en' : 'fr',
        "publisher": {
          "@type": "Organization",
          "name": "Riwaya"
        },
        "image": imageUrl,
        "url": `${baseUrl}/${locale}/books/${book.id}`
      },
      {
        "@type": "Product",
        "name": displayTitle,
        "image": imageUrl,
        "description": displayDescription,
        "brand": {
          "@type": "Brand",
          "name": "Riwaya"
        },
        "offers": {
          "@type": "Offer",
          "price": book.price,
          "priceCurrency": "MAD",
          "availability": book.stock > 0
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
          "seller": {
            "@type": "Organization",
            "name": "Riwaya"
          }
        },
        ...(reviewCount > 0 ? {
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": averageRating,
            "reviewCount": reviewCount
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
