'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { trackPageView } from '@/lib/actions/tracking'
import { useCartStore } from '@/store/cart'

export default function PixelTracker({ userId }: { userId?: string }) {
    const pathname = usePathname()
    const searchParams = useSearchParams()

    useEffect(() => {
        if (pathname.includes('/admin')) return

        // Debounce or just fire? Fire for now.
        const url = `${window.location.host}${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
        const referrer = document.referrer || null

        // Sync session ID across tabs and analytics
        let sessionId = sessionStorage.getItem('riwaya_session_id')
        const cartSessionId = useCartStore.getState().sessionId

        if (cartSessionId && !sessionId) {
            sessionId = cartSessionId
            sessionStorage.setItem('riwaya_session_id', sessionId)
        } else if (!sessionId) {
            sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36)
            sessionStorage.setItem('riwaya_session_id', sessionId)
            useCartStore.getState().setSessionId(sessionId)
        } else if (sessionId && !cartSessionId) {
            useCartStore.getState().setSessionId(sessionId)
        } else if (sessionId !== cartSessionId) {
            // Priority to cartSessionId as it is stored in localStorage and persists better across tabs
            sessionId = cartSessionId!
            sessionStorage.setItem('riwaya_session_id', sessionId)
        }

        // Call Server Action
        trackPageView({
            url,
            referrer,
            userId,
            sessionId
        })

    }, [pathname, searchParams, userId])

    return null
}
