'use client'

import { useEffect, useRef } from 'react'
import { fbPixelEvents } from '@/lib/facebook-pixel'
import { useCartStore } from '@/store/cart'
import { incrementBookViews } from '@/lib/actions/books'

interface SetPixelViewProps {
    id: string
    title: string
    price: number
    category?: string
}

export default function SetPixelView({ id, title, price, category }: SetPixelViewProps) {
    const sessionId = useCartStore(state => state.sessionId)
    const setSessionId = useCartStore(state => state.setSessionId)
    const hasTracked = useRef(false)

    useEffect(() => {
        if (hasTracked.current) return
        hasTracked.current = true

        fbPixelEvents.viewContent({
            id,
            title,
            price,
            category
        })

        const currentSessionId = sessionId || `c_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`
        if (!sessionId) {
            setSessionId(currentSessionId)
        }

        if (category !== 'Pack') {
            incrementBookViews(id, currentSessionId).catch(() => {})
        }
    }, [id, title, price, category, sessionId, setSessionId])

    return null
}
