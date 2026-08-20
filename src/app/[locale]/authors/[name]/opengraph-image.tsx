import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'


export const alt = 'Auteur sur Riwaya'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image(props: { params: Promise<{ name: string, locale: string }> }) {
  const params = await props.params;
  const authorName = decodeURIComponent(params.name);

  const fontData = await readFile(join(process.cwd(), 'public/fonts/NotoSansArabic-Bold.ttf'))

  const label = params.locale === 'ar' 
    ? 'مؤلف متوفر على مكتبة رواية' 
    : params.locale === 'en' 
      ? 'Author on Riwaya Library' 
      : 'Auteur sur la librairie Riwaya';

  const booksLabel = params.locale === 'ar'
    ? 'اكتشف جميع الكتب'
    : params.locale === 'en'
      ? 'Discover all books'
      : 'Découvrir tous les livres';

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
          backgroundColor: '#0F172A', // slate-900
          backgroundImage: 'linear-gradient(135deg, #020617 0%, #1e293b 100%)',
          padding: '40px',
        }}
      >
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '40px',
          padding: '60px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          width: '100%',
          height: '100%',
          border: '8px solid rgba(255,255,255,0.05)',
          position: 'relative',
          overflow: 'hidden',
        }}>
            
            {/* Décoration en fond */}
            <div style={{
                position: 'absolute',
                top: '-50px',
                right: '-50px',
                width: '300px',
                height: '300px',
                backgroundColor: '#FFFBEB', // amber-50
                borderRadius: '50%',
                opacity: 0.5,
                zIndex: 0,
            }} />
            
            <div style={{
                position: 'absolute',
                bottom: '-80px',
                left: '-80px',
                width: '400px',
                height: '400px',
                backgroundColor: '#F8FAFC', // slate-50
                borderRadius: '50%',
                opacity: 0.8,
                zIndex: 0,
            }} />

            <div style={{
              display: 'flex',
              padding: '12px 30px',
              backgroundColor: '#000000',
              borderRadius: '100px',
              color: '#ffffff',
              fontSize: 24,
              fontFamily: '"Noto Sans Arabic"',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '2px',
              marginBottom: '30px',
              zIndex: 1,
            }}>
              Riwaya.store
            </div>

            <h1 style={{ 
              fontFamily: '"Noto Sans Arabic"', 
              fontSize: 72, 
              fontWeight: 700, 
              color: '#0F172A', 
              textAlign: 'center', 
              marginBottom: '20px',
              lineHeight: 1.2,
              zIndex: 1,
              maxWidth: '900px',
            }}>
              {authorName}
            </h1>
            
            <p style={{ 
              fontFamily: '"Noto Sans Arabic"', 
              fontSize: 32, 
              color: '#64748B', 
              marginBottom: '40px', 
              textAlign: 'center',
              zIndex: 1,
            }}>
              {label}
            </p>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#FEF3C7', // amber-100
              color: '#D97706', // amber-600
              padding: '16px 40px',
              borderRadius: '20px',
              border: '2px solid #FDE68A', // amber-200
              fontSize: 28,
              fontFamily: '"Noto Sans Arabic"',
              fontWeight: 700,
              zIndex: 1,
            }}>
              📚 {booksLabel}
            </div>

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
