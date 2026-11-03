import { ImageResponse } from 'next/og'

export const alt = 'Auteur sur Riwaya'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const revalidate = 86400

export default async function Image(props: {
  params: Promise<{ name: string; locale: string }>
}) {
  let authorName = 'Auteur'
  try {
    const { name } = await props.params
    if (name) {
      authorName = decodeURIComponent(name)
    }
  } catch {}

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f172a',
          color: '#ffffff',
          padding: '60px',
          fontFamily: 'sans-serif',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '26px', fontWeight: 'bold', color: '#10b981', marginBottom: '20px' }}>
          RIWAYA.STORE
        </div>
        <div style={{ fontSize: '56px', fontWeight: 'bold', marginBottom: '20px' }}>
          {authorName}
        </div>
        <div style={{ fontSize: '28px', color: '#94a3b8' }}>
          Découvrez tous les livres de cet auteur
        </div>
      </div>
    ),
    { ...size }
  )
}
