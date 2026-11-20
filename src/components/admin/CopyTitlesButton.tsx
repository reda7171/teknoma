'use client'

import { Copy } from 'lucide-react'
import { useUIStore } from '@/store/ui'

export default function CopyTitlesButton({ titles }: { titles: string[] }) {
    const { showNotification } = useUIStore()

    if (titles.length === 0) return null

    const handleCopy = () => {
        const text = titles.join('\n')
        navigator.clipboard.writeText(text)
        showNotification(`${titles.length} titres copiés !`, 'success')
    }

    return (
        <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-full text-[10px] font-black uppercase tracking-wider hover:bg-emerald-700 transition-all shadow-md"
        >
            <Copy className="w-3 h-3" /> Copier Titres (Bulk)
        </button>
    )
}
