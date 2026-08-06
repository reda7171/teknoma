import React from 'react'
import InboxClient from './InboxClient'
import { MessageCircle } from 'lucide-react'

export const metadata = {
    title: 'Messagerie (Inbox) - Admin RIWAYA',
    description: 'Centralisation des messages Instagram, Facebook et WhatsApp'
}

export default function InboxPage() {
    return (
        <div className="h-[calc(100vh-80px)] md:h-[calc(100vh-2rem)] flex flex-col -mx-4 md:mx-0 md:-mt-8 relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 bg-white border-b border-gray-100 shrink-0">
                <div className="w-10 h-10 bg-black text-white rounded-xl flex items-center justify-center shrink-0">
                    <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                    <h1 className="text-xl font-black text-gray-900 tracking-tight">Boîte de Réception</h1>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Instagram & Omnicanal</p>
                </div>
            </div>

            {/* Chat App */}
            <div className="flex-1 min-h-0 bg-white">
                <InboxClient />
            </div>
        </div>
    )
}
