'use client'

import { useEffect, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { getWhatsAppAvailabilityPrompt } from '@/lib/actions/whatsapp-presence'

export default function WhatsAppStatusButton({ isCollapsed }: { isCollapsed?: boolean }) {
    const [statusText, setStatusText] = useState<string>('WhatsApp')
    const [isOnline, setIsOnline] = useState<boolean>(false)

    const checkStatus = () => {
        getWhatsAppAvailabilityPrompt()
            .then(res => {
                if (res?.agents && res.agents.length > 0) {
                    const onlineAgent = res.agents
                        .filter(a => a.online)
                        .sort((a, b) => a.priority - b.priority)[0]

                    if (onlineAgent) {
                        setIsOnline(true)
                        setStatusText(`WA: ${onlineAgent.name}`)
                    } else {
                        setIsOnline(false)
                        setStatusText('WA: Hors ligne')
                    }
                }
            })
            .catch(() => {})
    }

    useEffect(() => {
        checkStatus()
        const interval = setInterval(checkStatus, 15_000)
        return () => clearInterval(interval)
    }, [])

    const openPopup = () => {
        window.dispatchEvent(new CustomEvent('open-whatsapp-availability-popup'))
    }

    return (
        <button
            type="button"
            onClick={openPopup}
            className={`flex items-center justify-center w-full px-3 py-2 mb-2 text-xs font-bold rounded-xl border transition-all ${
                isOnline
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
            } ${isCollapsed ? 'px-0' : ''}`}
            title={isCollapsed ? `Disponibilité WhatsApp : ${isOnline ? 'En ligne' : 'Hors ligne'}` : undefined}
        >
            <span
                className={`inline-block w-2 h-2 rounded-full mr-2 shrink-0 ${
                    isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                }`}
            />
            <MessageCircle className="w-3.5 h-3.5 mr-1 text-[#128C7E] shrink-0" />
            {!isCollapsed && <span className="truncate">{statusText}</span>}
        </button>
    )
}
