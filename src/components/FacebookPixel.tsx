'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import Script from '@/components/CspScript'

interface QueuedPixelEvent {
    method: 'track' | 'trackCustom'
    eventName: string
    data?: Record<string, unknown>
    options?: { eventID?: string }
}

declare global {
    interface Window {
        fbq?: (...args: unknown[]) => void
        _fbq?: (...args: unknown[]) => void
        __riwayaFbqPending?: QueuedPixelEvent[]
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

function dispatchPixelEvent(entry: QueuedPixelEvent) {
    if (typeof window === 'undefined' || !window.fbq) return
    if (entry.method === 'track' && entry.options?.eventID) {
        window.fbq('track', entry.eventName, entry.data, { eventID: entry.options.eventID })
    } else {
        window.fbq(entry.method, entry.eventName, entry.data)
    }
}

function enqueueOrDispatchPixelEvent(entry: QueuedPixelEvent) {
    if (typeof window === 'undefined') return
    if (window.fbq) {
        dispatchPixelEvent(entry)
        return
    }
    // Mise en file avant le chargement différé du script Meta Pixel
    const pending = (window.__riwayaFbqPending = window.__riwayaFbqPending || [])
    if (entry.options?.eventID && pending.some(e => e.eventName === entry.eventName && e.options?.eventID === entry.options?.eventID)) {
        return
    }
    if (pending.length < 50) pending.push(entry)
}

export function flushPendingPixelEvents() {
    if (typeof window === 'undefined' || !window.fbq || !window.__riwayaFbqPending?.length) return
    const queued = window.__riwayaFbqPending.splice(0, window.__riwayaFbqPending.length)
    queued.forEach(dispatchPixelEvent)
}

export const trackEvent = (eventName: string, data?: Record<string, unknown>, options?: { eventID?: string }) => {
    enqueueOrDispatchPixelEvent({
        method: 'track',
        eventName,
        data: sanitizePixelData(data),
        options,
    })
}

export const trackCustomEvent = (eventName: string, data?: Record<string, unknown>) => {
    enqueueOrDispatchPixelEvent({
        method: 'trackCustom',
        eventName,
        data: sanitizePixelData(data),
    })
}

export default function FacebookPixel({ pixelId: propPixelId }: { pixelId?: string | null }) {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const pixelId = propPixelId || process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID
    const lastTrackedRouteRef = useRef<string | null>(null)

    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        window.addEventListener('riwaya:fbq-ready', flushPendingPixelEvents)
        setIsMounted(true)
        flushPendingPixelEvents()
        return () => window.removeEventListener('riwaya:fbq-ready', flushPendingPixelEvents)
    }, [])

    useEffect(() => {
        if (!pixelId || pathname?.includes('/admin')) return
        const routeKey = `${pathname || ''}?${searchParams?.toString() || ''}`
        if (lastTrackedRouteRef.current === null) {
            lastTrackedRouteRef.current = routeKey
            return
        }
        if (lastTrackedRouteRef.current === routeKey || !window.fbq) return

        lastTrackedRouteRef.current = routeKey
        window.fbq('track', 'PageView')
    }, [pathname, searchParams, pixelId])

    if (!isMounted || !pixelId || pathname?.includes('/admin')) {
        return null
    }

    return (
        <>
            <Script
                id="fb-pixel"
                strategy="afterInteractive"
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
            window.dispatchEvent(new Event('riwaya:fbq-ready'));
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
