'use client'

import { useEffect, useState } from 'react'
import { useLocale } from 'next-intl'

export default function AppLoader() {
    const [loading, setLoading] = useState(true)
    const [fadeOut, setFadeOut] = useState(false)
    const locale = useLocale()

    useEffect(() => {
        // Disparaît dès que la page est prête (max 400ms)
        const hide = () => {
            setFadeOut(true)
            setTimeout(() => setLoading(false), 250)
        }

        if (document.readyState === 'complete') {
            hide()
        } else {
            window.addEventListener('load', hide, { once: true })
            // Fallback si load tarde : 600ms max
            const fallback = setTimeout(hide, 600)
            return () => {
                window.removeEventListener('load', hide)
                clearTimeout(fallback)
            }
        }
    }, [])

    if (!loading) return null

    return (
        <div
            className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-pixio-cream"
            style={{
                opacity: fadeOut ? 0 : 1,
                transition: 'opacity 250ms ease-out',
                pointerEvents: fadeOut ? 'none' : 'auto',
            }}
        >
            {/* Logo simple et rapide */}
            <div className="flex flex-col items-center gap-4">
                <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center shadow-xl">
                    <span className="text-white text-2xl font-black italic">R</span>
                </div>
                <span
                    className={`text-2xl font-black text-black tracking-tighter ${locale === 'ar' ? 'font-[family-name:var(--font-cairo)]' : ''}`}
                >
                    {locale === 'ar' ? 'رواية' : 'riwaya'}
                    <span className="text-emerald-500">.</span>
                </span>
            </div>
        </div>
    )
}
