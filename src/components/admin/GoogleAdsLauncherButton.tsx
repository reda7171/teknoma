'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import GoogleAdsGeneratorModal from './GoogleAdsGeneratorModal'

export default function GoogleAdsLauncherButton() {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2.5 px-6 py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl active:scale-95 w-fit"
            >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Campagne Google Ads (IA)</span>
            </button>

            <GoogleAdsGeneratorModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
            />
        </>
    )
}
