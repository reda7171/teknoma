'use client'

import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'

export default function ScrollDownIndicator() {
    const [visible, setVisible] = useState(true)

    useEffect(() => {
        const onScroll = () => {
            // Masquer dès que l utilisateur descend de plus de 80px
            setVisible(window.scrollY < 80)
        }
        window.addEventListener('scroll', onScroll, { passive: true })
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    if (!visible) return null

    return (
        <div
            aria-hidden="true"
            className="fixed bottom-[calc(9.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-[105] flex flex-col items-center gap-0.5 pointer-events-none md:hidden"
        >
            {/* Trois chevrons en cascade avec délai d animation croissant */}
            {[0, 150, 300].map((delay, i) => (
                <ChevronDown
                    key={i}
                    className="w-5 h-5 text-gray-400 animate-bounce"
                    style={{ animationDelay: `${delay}ms`, opacity: 1 - i * 0.25 }}
                />
            ))}
        </div>
    )
}
