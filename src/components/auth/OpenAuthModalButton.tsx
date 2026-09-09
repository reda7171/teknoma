'use client'

import { useUIStore } from '@/store/ui'
import { ChevronRight } from 'lucide-react'

interface Props {
    label: string
    sub: string
}

export default function OpenAuthModalButton({ label, sub }: Props) {
    const { openAuthModal } = useUIStore()

    return (
        <div className="flex flex-col gap-3">
            <button
                onClick={openAuthModal}
                className="group inline-flex items-center gap-3 px-7 py-4 bg-slate-900 text-white font-black text-sm uppercase tracking-widest rounded-full hover:bg-black transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
            >
                {label}
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <p className="text-slate-400 text-xs font-medium">{sub}</p>
        </div>
    )
}
