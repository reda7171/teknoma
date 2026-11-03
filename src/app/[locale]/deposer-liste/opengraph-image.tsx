import { ImageResponse } from 'next/og'

export const alt = 'Riwaya - Déposer liste scolaire'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const revalidate = 86400

export default async function Image() {
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
        <div style={{ fontSize: '52px', fontWeight: 'bold', marginBottom: '20px' }}>
          Déposez votre liste scolaire
        </div>
        <div style={{ fontSize: '26px', color: '#94a3b8' }}>
          Nous préparons tous vos livres et fournitures scolaires au meilleur prix
        </div>
      </div>
    ),
    { ...size }
  )
}
