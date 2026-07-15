import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export const alt = 'Riwaya - Déposer liste scolaire'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  const fontData = await readFile(join(process.cwd(), 'public/fonts/NotoSansArabic-Bold.ttf'))

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
          backgroundColor: '#FFB800', // pixio-yellow
          backgroundImage: 'linear-gradient(135deg, #FFD700 0%, #FF9900 100%)',
          padding: '60px',
        }}
      >
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '40px',
          padding: '60px 80px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          width: '100%',
          height: '100%',
          border: '4px solid rgba(0,0,0,0.05)',
        }}>
            <h1 style={{ 
              fontFamily: '"Noto Sans Arabic"', 
              fontSize: 60, 
              fontWeight: 700, 
              color: '#0B1120', 
              textAlign: 'center', 
              marginBottom: '30px',
              lineHeight: 1.4,
              direction: 'rtl'
            }}>
              ضع قائمتك المدرسية : نحن نتكفل بالباقي !
            </h1>
            
            <p style={{ 
              fontFamily: '"Noto Sans Arabic"', 
              fontSize: 42, 
              color: '#334155', 
              marginBottom: '40px', 
              textAlign: 'center',
              direction: 'rtl'
            }}>
              قائمة كاملة مضمونة، بدون أي عناء 👌
            </p>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              backgroundColor: '#F8FAFC',
              padding: '30px',
              borderRadius: '24px',
              border: '2px dashed #CBD5E1'
            }}>
              <p style={{ 
                fontFamily: '"Noto Sans Arabic"', 
                fontSize: 34, 
                color: '#475569', 
                margin: 0, 
                textAlign: 'center', 
                lineHeight: 1.6,
                direction: 'rtl'
              }}>
                فريقنا سيتكفل بتحضير كل شيء،
              </p>
              <p style={{ 
                fontFamily: '"Noto Sans Arabic"', 
                fontSize: 34, 
                color: '#475569', 
                margin: 0, 
                textAlign: 'center', 
                lineHeight: 1.6,
                direction: 'rtl'
              }}>
                وداعا لمتاعب الدخول المدرسي!
              </p>
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
