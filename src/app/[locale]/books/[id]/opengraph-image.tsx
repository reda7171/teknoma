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
    let category = ''
    let imageUrl = `${baseUrl}/og-image.jpg`
    let isArabic = false
    let codBadge = 'Paiement à la livraison au Maroc'
    let storeName = 'RIWAYA.STORE'

    try {
        const { id, locale } = await props.params
        isArabic = locale === 'ar'

        if (locale === 'ar') {
            codBadge = 'الدفع عند الاستلام بالمغرب'
            storeName = 'مكتبة رواية • RIWAYA'
        } else if (locale === 'en') {
            codBadge = 'Cash On Delivery in Morocco'
            storeName = 'RIWAYA.STORE'
        } else {
            codBadge = 'Paiement à la livraison au Maroc'
            storeName = 'RIWAYA.STORE'
        }

        const bookId = id.slice(0, 36)
        const book = await getBookById(bookId).catch(() => null)
        if (book) {
            title = (locale === 'ar' ? (book.title || book.titleFr) : locale === 'en' ? (book.titleEn || book.title || book.titleFr) : (book.titleFr || book.title)) || 'Riwaya'
            author = book.author || ''
            category = book.category || ''
            price = book.price ? (locale === 'ar' ? `${book.price} درهم` : locale === 'en' ? `${book.price} MAD` : `${book.price} DH`) : ''
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
                    flexDirection: isArabic ? 'row-reverse' : 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: '#022c22',
                    backgroundImage: 'radial-gradient(circle at 15% 15%, #064e3b 0%, #022c22 80%)',
                    color: '#ffffff',
                    padding: '50px 70px',
                    fontFamily: 'sans-serif',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        maxWidth: '680px',
                        direction: isArabic ? 'rtl' : 'ltr',
                        textAlign: isArabic ? 'right' : 'left',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                        <span
                            style={{
                                fontSize: '18px',
                                fontWeight: 'bold',
                                color: '#10b981',
                                letterSpacing: '0.1em',
                                textTransform: 'uppercase',
                            }}
                        >
                            {storeName}
                        </span>
                        {category ? (
                            <span
                                style={{
                                    fontSize: '14px',
                                    color: '#a7f3d0',
                                    backgroundColor: 'rgba(6, 78, 59, 0.8)',
                                    padding: '4px 12px',
                                    borderRadius: '999px',
                                    border: '1px solid rgba(16, 185, 129, 0.3)',
                                }}
                            >
                                {category}
                            </span>
                        ) : null}
                    </div>

                    <div
                        style={{
                            fontSize: '40px',
                            fontWeight: 'bold',
                            lineHeight: 1.25,
                            marginBottom: '16px',
                            color: '#ffffff',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            overflow: 'hidden',
                        }}
                    >
                        {title}
                    </div>

                    {author ? (
                        <div
                            style={{
                                fontSize: '24px',
                                color: '#93c5fd',
                                marginBottom: '28px',
                                fontWeight: 500,
                            }}
                        >
                            {author}
                        </div>
                    ) : null}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: 'auto' }}>
                        {price ? (
                            <div
                                style={{
                                    fontSize: '36px',
                                    fontWeight: 'bold',
                                    color: '#fbbf24',
                                    backgroundColor: 'rgba(251, 191, 36, 0.1)',
                                    padding: '8px 20px',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(251, 191, 36, 0.3)',
                                }}
                            >
                                {price}
                            </div>
                        ) : null}

                        <div
                            style={{
                                fontSize: '16px',
                                color: '#34d399',
                                display: 'flex',
                                alignItems: 'center',
                                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                                padding: '10px 18px',
                                borderRadius: '12px',
                                border: '1px solid rgba(16, 185, 129, 0.25)',
                            }}
                        >
                            {codBadge}
                        </div>
                    </div>
                </div>

                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '320px',
                        height: '460px',
                        borderRadius: '20px',
                        overflow: 'hidden',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.65)',
                        border: '3px solid rgba(255, 255, 255, 0.15)',
                        backgroundColor: '#0f172a',
                    }}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={imageUrl}
                        alt={title}
                        width="320"
                        height="460"
                        style={{ objectFit: 'cover' }}
                    />
                </div>
            </div>
        ),
        { ...size }
    )
}
