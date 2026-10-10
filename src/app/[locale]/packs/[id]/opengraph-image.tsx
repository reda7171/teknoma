import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { getPackById } from '@/lib/db/packs'

export const alt = 'Pack de livres sur Riwaya'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const revalidate = 3600

export default async function PackOpengraphImage(props: {
  params: Promise<{ id: string; locale: string }>
}) {
  const { id, locale } = await props.params
  const pack = await getPackById(id).catch(() => null)

  const fontData = await readFile(
    join(process.cwd(), 'public/fonts/NotoSansArabic-Bold.ttf')
  )

  const isAr = locale === 'ar'
  const isEn = locale === 'en'

  const packName = pack?.name || (isAr ? 'باقة كتب مميزة' : 'Pack de livres sélectionné')
  const booksCount = pack?.books?.length || 2
  const price = pack?.price ? Math.round(pack.price) : 199
  const totalOriginalPrice = Math.round(
    pack?.originalPrice ||
      (pack?.books ? pack.books.reduce((sum, pb) => sum + pb.book.price, 0) : price * 1.3)
  )
  const savings = totalOriginalPrice - price
  const savingsPercent = totalOriginalPrice > 0 ? Math.round((savings / totalOriginalPrice) * 100) : 0
  const hasDiscount = savings > 0 && savingsPercent > 0

  const currencyLabel = isAr ? 'درهم' : isEn ? 'MAD' : 'DH'
  const packBadge = isAr ? `باقة من ${booksCount} كتب` : isEn ? `Bundle of ${booksCount} Books` : `Pack de ${booksCount} Livres`
  const codBadge = isAr ? 'الدفع عند الاستلام' : isEn ? 'Cash on Delivery (COD)' : 'Paiement à la livraison (COD)'
  const savingsBadge = isAr ? `وفر ${savingsPercent}%` : `-${savingsPercent}% d'économie`

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0F172A',
          backgroundImage: 'linear-gradient(135deg, #020617 0%, #1E293B 100%)',
          padding: '48px',
          justifyContent: 'space-between',
          fontFamily: '"Noto Sans Arabic"',
          position: 'relative',
        }}
      >
        {/* Cercles de fond */}
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            right: '-100px',
            width: '450px',
            height: '450px',
            borderRadius: '50%',
            backgroundColor: '#10B981',
            opacity: 0.1,
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-120px',
            left: '-120px',
            width: '500px',
            height: '500px',
            borderRadius: '50%',
            backgroundColor: '#F59E0B',
            opacity: 0.08,
          }}
        />

        {/* Barre supérieure */}
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
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                color: '#34D399',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                padding: '10px 22px',
                borderRadius: '999px',
                fontSize: 20,
                fontWeight: 700,
              }}
            >
              {packBadge}
            </div>
            {hasDiscount && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: '#EF4444',
                  color: '#FFFFFF',
                  padding: '10px 22px',
                  borderRadius: '999px',
                  fontSize: 20,
                  fontWeight: 700,
                }}
              >
                {savingsBadge}
              </div>
            )}
          </div>
        </div>

        {/* Corps central */}
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
                color: '#34D399',
                fontSize: 24,
                fontWeight: 700,
                marginBottom: '12px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              {isAr ? 'عرض خاص' : 'Offre Spéciale Pack'}
            </span>

            <h1
              style={{
                color: '#FFFFFF',
                fontSize: packName.length > 40 ? 44 : 56,
                fontWeight: 700,
                lineHeight: 1.25,
                margin: 0,
                maxWidth: '750px',
              }}
            >
              {packName}
            </h1>
          </div>

          {/* Bloc Prix Prominent */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#10B981',
              borderRadius: '32px',
              padding: '32px 42px',
              boxShadow: '0 20px 50px rgba(16, 185, 129, 0.3)',
              minWidth: '280px',
            }}
          >
            {hasDiscount && (
              <span
                style={{
                  color: 'rgba(255, 255, 255, 0.75)',
                  fontSize: 24,
                  textDecoration: 'line-through',
                  fontWeight: 700,
                  marginBottom: '4px',
                }}
              >
                {totalOriginalPrice} {currencyLabel}
              </span>
            )}
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '8px',
                color: '#FFFFFF',
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
                color: '#FFFFFF',
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

        {/* Pied de carte */}
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
            <span>Livraison 24-48h partout au Maroc (COD)</span>
          </div>

          <span
            style={{
              color: '#94A3B8',
              fontSize: 20,
              fontWeight: 700,
              letterSpacing: '0.5px',
            }}
          >
            Disponible sur Riwaya.store
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
