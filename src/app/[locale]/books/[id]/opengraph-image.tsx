import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getBookById } from '@/lib/db/books'

export const alt = 'Livre sur Riwaya'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const revalidate = 3600

export default async function BookOpengraphImage(props: {
  params: Promise<{ id: string; locale: string }>
}) {
  const { id, locale } = await props.params
  const bookId = id.slice(0, 36)
  const book = await getBookById(bookId).catch(() => null)

  const fontData = await readFile(
    join(process.cwd(), 'public/fonts/NotoSansArabic-Bold.ttf')
  )

  const isAr = locale === 'ar'
  const isEn = locale === 'en'

  const title = book
    ? (isAr ? (book.title || book.titleFr || '') : isEn ? (book.titleEn || book.titleFr || book.title || '') : (book.titleFr || book.title || ''))
    : (isAr ? 'كتاب مميز' : 'Livre sélectionné')

  const author = book?.author || (isAr ? 'مكتبة رواية' : 'Riwaya')
  const price = book?.price ? Math.round(book.price) : 65
  const originalPrice = book?.originalPrice ? Math.round(book.originalPrice) : null
  const hasDiscount = originalPrice && originalPrice > price

  const currencyLabel = isAr ? 'درهم' : isEn ? 'MAD' : 'DH'
  const codBadge = isAr ? 'الدفع عند الاستلام' : isEn ? 'Cash on Delivery (COD)' : 'Paiement à la livraison (COD)'
  const shippingBadge = isAr ? 'توصيل سريع لكافة المدن' : isEn ? 'Fast 24-48h Delivery' : 'Livraison 24-48h partout au Maroc'
  const guaranteeBadge = isAr ? 'ضمان الجودة 100%' : 'Garantie Riwaya 100%'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0B1120',
          backgroundImage: 'linear-gradient(135deg, #090D16 0%, #172033 100%)',
          padding: '48px',
          justifyContent: 'space-between',
          fontFamily: '"Noto Sans Arabic"',
          position: 'relative',
        }}
      >
        {/* Cercles décoratifs d'arrière plan */}
        <div
          style={{
            position: 'absolute',
            top: '-120px',
            right: '-120px',
            width: '450px',
            height: '450px',
            borderRadius: '50%',
            backgroundColor: '#F59E0B',
            opacity: 0.08,
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-140px',
            left: '-140px',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            backgroundColor: '#3B82F6',
            opacity: 0.06,
          }}
        />

        {/* Barre supérieure : Marque et badges de réassurance */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#FFFFFF',
              color: '#0B1120',
              padding: '12px 28px',
              borderRadius: '999px',
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: '1px',
            }}
          >
            RIWAYA.STORE
          </div>

          <div style={{ display: 'flex', gap: '14px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                color: '#FBBF24',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                padding: '10px 22px',
                borderRadius: '999px',
                fontSize: 20,
                fontWeight: 700,
              }}
            >
              <span
                style={{
                  display: 'flex',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: '#FBBF24',
                  marginRight: '10px',
                }}
              />
              {codBadge}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: '#E2E8F0',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                padding: '10px 22px',
                borderRadius: '999px',
                fontSize: 20,
                fontWeight: 700,
              }}
            >
              {shippingBadge}
            </div>
          </div>
        </div>

        {/* Corps central : Titre du livre + Carte Prix WhatsApp/Facebook */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '40px',
            width: '100%',
            margin: '20px 0',
          }}
        >
          {/* Détails du livre */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              direction: isAr ? 'rtl' : 'ltr',
            }}
          >
            <span
              style={{
                color: '#94A3B8',
                fontSize: 26,
                fontWeight: 700,
                marginBottom: '12px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              {isAr ? 'الكاتب : ' : 'Auteur : '} {author}
            </span>

            <h1
              style={{
                color: '#FFFFFF',
                fontSize: title.length > 50 ? 44 : 54,
                fontWeight: 700,
                lineHeight: 1.25,
                margin: 0,
                maxWidth: '750px',
              }}
            >
              {title}
            </h1>
          </div>

          {/* Bloc Prix Prominent pour Partage Social */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#F59E0B',
              borderRadius: '32px',
              padding: '32px 42px',
              boxShadow: '0 20px 50px rgba(245, 158, 11, 0.3)',
              minWidth: '280px',
            }}
          >
            {hasDiscount && (
              <span
                style={{
                  color: 'rgba(11, 17, 32, 0.65)',
                  fontSize: 24,
                  textDecoration: 'line-through',
                  fontWeight: 700,
                  marginBottom: '4px',
                }}
              >
                {originalPrice} {currencyLabel}
              </span>
            )}
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '8px',
                color: '#0B1120',
              }}
            >
              <span style={{ fontSize: 68, fontWeight: 700, lineHeight: 1 }}>
                {price}
              </span>
              <span style={{ fontSize: 32, fontWeight: 700 }}>
                {currencyLabel}
              </span>
            </div>
            <span
              style={{
                color: '#0B1120',
                fontSize: 16,
                fontWeight: 700,
                marginTop: '10px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              {codBadge}
            </span>
          </div>
        </div>

        {/* Pied de carte : Réassurance et appel à l'action */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid rgba(255, 255, 255, 0.12)',
            paddingTop: '20px',
            width: '100%',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: '#CBD5E1',
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            <span>{guaranteeBadge}</span>
          </div>

          <span
            style={{
              color: '#94A3B8',
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: '0.5px',
            }}
          >
            Commandez en ligne sur Riwaya.store
          </span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: 'Noto Sans Arabic',
          data: fontData,
          style: 'normal',
          weight: 700,
        },
      ],
    }
  )
}
