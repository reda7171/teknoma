'use client'

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import Script from 'next/script'

declare global {
    interface Window {
        fbq?: (...args: unknown[]) => void
        _fbq?: (...args: unknown[]) => void
    }
}

function sanitizePixelData(data?: Record<string, unknown>) {
    if (!data) return undefined

    const sanitized = { ...data }
    if ('currency' in sanitized) {
        const rawCurrency = String(sanitized.currency || '').trim().toUpperCase()
        sanitized.currency = ['DH', 'DHS', 'درهم'].includes(rawCurrency)
            ? 'MAD'
            : /^[A-Z]{3}$/.test(rawCurrency) ? rawCurrency : 'MAD'
    }
    if ('value' in sanitized) {
        const numericValue = Number(sanitized.value)
        if (Number.isFinite(numericValue)) sanitized.value = numericValue
        else delete sanitized.value
    }
    return sanitized
}

export const trackEvent = (eventName: string, data?: Record<string, unknown>) => {
    if (typeof window !== 'undefined' && window.fbq) {
        window.fbq('track', eventName, sanitizePixelData(data))
    }
}

export const trackCustomEvent = (eventName: string, data?: Record<string, unknown>) => {
    if (typeof window !== 'undefined' && window.fbq) {
        window.fbq('trackCustom', eventName, sanitizePixelData(data))
    }
}

export default function FacebookPixel({ pixelId: propPixelId }: { pixelId?: string | null }) {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const pixelId = propPixelId || process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID

    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    useEffect(() => {
        if (!pixelId || !window.fbq) return
        if (pathname?.includes('/admin')) return

        window.fbq('track', 'PageView')
    }, [pathname, searchParams, pixelId])

    if (!isMounted || !pixelId || pathname?.includes('/admin')) {
        return null
    }

    return (
        <>
            <Script
                id="fb-pixel"
                strategy="lazyOnload"
                dangerouslySetInnerHTML={{
                    __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${pixelId}');
            fbq('track', 'PageView');
          `,
                }}
            />
            <noscript suppressHydrationWarning>
                <img
                    height="1"
                    width="1"
                    style={{ display: 'none' }}
                    src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
                    alt=""
                />
            </noscript>
        </>
    )
}
