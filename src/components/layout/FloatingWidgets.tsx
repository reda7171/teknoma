'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'

const WhatsAppButton = dynamic(() => import('@/components/WhatsAppButton'), { ssr: false })
const WhatsAppChannelButton = dynamic(() => import('@/components/WhatsAppChannelButton'), { ssr: false })
const ChatBot = dynamic(() => import('@/components/ChatBot'), { ssr: false })
const CartPromoLeadPopup = dynamic(() => import('@/components/cart/CartPromoLeadPopup'), { ssr: false })
const WelcomeOfferPopup = dynamic(() => import('@/components/community/WelcomeOfferPopup'), { ssr: false })

interface FloatingWidgetsProps {
    isWhatsAppEnabled: boolean
    whatsappPhone?: string | null
    activeWhatsAppAgent?: {
        name?: string
        phone?: string
    } | null
    whatsappChannelUrl?: string | null
    isChatBotEnabled: boolean
}

export default function FloatingWidgets({
    isWhatsAppEnabled,
    whatsappPhone,
    activeWhatsAppAgent,
    whatsappChannelUrl,
    isChatBotEnabled,
}: FloatingWidgetsProps) {
    const [ready, setReady] = useState(false)

    useEffect(() => {
        let idleId: number | undefined
        let timerId: number | undefined
        const schedule = () => {
            // Separate chunks still compete with the page when rendered during
            // hydration. Wait for initial resources, then use an idle slot.
            if ('requestIdleCallback' in window) {
                idleId = window.requestIdleCallback(() => setReady(true), { timeout: 2000 })
            } else {
                timerId = window.setTimeout(() => setReady(true), 0)
            }
        }

        if (document.readyState === 'complete') schedule()
        else window.addEventListener('load', schedule, { once: true })

        return () => {
            window.removeEventListener('load', schedule)
            if (idleId !== undefined) window.cancelIdleCallback(idleId)
            if (timerId !== undefined) window.clearTimeout(timerId)
        }
    }, [])

    if (!ready) return null

    return (
        <>
            {isWhatsAppEnabled && (
                <WhatsAppButton
                    phone={activeWhatsAppAgent?.phone || whatsappPhone || undefined}
                    agentName={activeWhatsAppAgent?.name}
                />
            )}
            {whatsappChannelUrl && <WhatsAppChannelButton url={whatsappChannelUrl} />}
            {isChatBotEnabled && <ChatBot />}
            <CartPromoLeadPopup />
            <WelcomeOfferPopup />
        </>
    )
}
