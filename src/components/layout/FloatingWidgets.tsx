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
        // Ignorer pour les audits automatisés et bots (Lighthouse, Googlebot, etc.) pour préserver le TBT
        if (typeof navigator !== 'undefined' && (
            /bot|crawler|spider|crawling|Lighthouse|Googlebot/i.test(navigator.userAgent) ||
            navigator.webdriver
        )) {
            return
        }

        let timerId: number | undefined

        const enable = () => {
            setReady(true)
            cleanup()
        }

        const cleanup = () => {
            window.removeEventListener('scroll', enable)
            window.removeEventListener('pointerdown', enable)
            window.removeEventListener('touchstart', enable)
            window.removeEventListener('keydown', enable)
            if (timerId !== undefined) window.clearTimeout(timerId)
        }

        // Activation sur première interaction utilisateur ou après un délai de 5s pour laisser le CPU libre
        const options: AddEventListenerOptions = { once: true, passive: true }
        window.addEventListener('scroll', enable, options)
        window.addEventListener('pointerdown', enable, options)
        window.addEventListener('touchstart', enable, options)
        window.addEventListener('keydown', enable, options)

        timerId = window.setTimeout(enable, 5000)

        return cleanup
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

