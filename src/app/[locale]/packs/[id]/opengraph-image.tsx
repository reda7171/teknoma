import { ImageResponse } from 'next/og'
import { getPackById } from '@/lib/db/packs'

export const alt = 'Pack de livres sur Riwaya'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const revalidate = 86400

export default async function PackOpengraphImage(props: {
  params: Promise<{ id: string; locale: string }>
}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://riwaya.store'
  let packTitle = 'Pack de Livres'
  let price = ''
  let imageUrl = `${baseUrl}/og-image.jpg`

  try {
    const { id } = await props.params
    const pack = await getPackById(id).catch(() => null)
    if (pack) {
      packTitle = pack.name || packTitle
      price = pack.price ? `${pack.price} DH` : ''
      if (pack.image) {
        imageUrl = pack.image.startsWith('http') ? pack.image : `${baseUrl}${pack.image}`
      }
    }
  } catch {
    // fallback
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#0f172a',
          color: '#ffffff',
          padding: '60px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '650px' }}>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981', marginBottom: '16px' }}>
            PACK RIWAYA
          </div>
          <div style={{ fontSize: '46px', fontWeight: 'bold', lineHeight: 1.2, marginBottom: '20px' }}>
            {packTitle}
          </div>
          {price ? (
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#fbbf24' }}>
              {price}
            </div>
          ) : null}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={packTitle}
          width="400"
          height="450"
          style={{ objectFit: 'cover', borderRadius: '16px' }}
        />
      </div>
    ),
    { ...size }
  )
}
