import { ImageResponse } from 'next/og'
import { getBookById } from '@/lib/db/books'

export const alt = 'Livre sur Riwaya'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const revalidate = 86400

export default async function BookOpengraphImage(props: {
  params: Promise<{ id: string; locale: string }>
}) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://riwaya.store'
  let title = 'Riwaya'
  let author = ''
  let price = ''
  let imageUrl = `${baseUrl}/og-image.jpg`

  try {
    const { id } = await props.params
    const bookId = id.slice(0, 36)
    const book = await getBookById(bookId).catch(() => null)
    if (book) {
      title = book.title || 'Riwaya'
      author = book.author || ''
      price = book.price ? `${book.price} DH` : ''
      if (book.image) {
        imageUrl = book.image.startsWith('http') ? book.image : `${baseUrl}${book.image}`
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
            RIWAYA.STORE
          </div>
          <div style={{ fontSize: '42px', fontWeight: 'bold', lineHeight: 1.2, marginBottom: '20px' }}>
            {title}
          </div>
          {author ? (
            <div style={{ fontSize: '26px', color: '#94a3b8', marginBottom: '20px' }}>
              {author}
            </div>
          ) : null}
          {price ? (
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#fbbf24' }}>
              {price}
            </div>
          ) : null}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={title}
          width="360"
          height="500"
          style={{ objectFit: 'cover', borderRadius: '16px' }}
        />
      </div>
    ),
    { ...size }
  )
}
