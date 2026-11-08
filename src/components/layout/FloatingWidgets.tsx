'use client'

import dynamic from 'next/dynamic'

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
