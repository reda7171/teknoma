'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import BubbleView from './BubbleView'

interface BubbleToggleProps {
    stats: Array<{ name: string; value: string | number; color: string }>
}

export default function BubbleToggle({ stats }: BubbleToggleProps) {
    const [open, setOpen] = useState(false)

    return (
        <>
            <button
                id="bubble-view-toggle"
                onClick={() => setOpen(true)}
                className="flex items-center gap-3 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 shadow-xl"
                style={{
                    background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
                    color: '#fff',
                    border: 'none',
                    boxShadow: '0 4px 24px rgba(37,99,235,0.3)',
                }}
            >
                <Sparkles className="w-4 h-4" />
                Vue Bulles
            </button>

            {open && (
                <BubbleView stats={stats} onClose={() => setOpen(false)} />
            )}
        </>
    )
}
