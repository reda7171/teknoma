'use client'

import { Plus, Minus, Type } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'

export default function FontSizeRegulator() {
    const [scale, setScale] = useState(1)
    const t = useTranslations('Common') // fallback if we need translation, or we can just use icons

    useEffect(() => {
        const article = document.getElementById('article-content')
        if (article) {
            article.style.transformOrigin = 'top center'
            // Using fontSize works well if the article uses em/rem for most things
            // For prose tailwind, modifying fontSize on the container works perfectly
            article.style.fontSize = `${scale}rem`
        }
    }, [scale])

    return (
        <div className="
            flex items-center gap-2 w-fit
            bg-white/95 backdrop-blur-xl border border-slate-200 rounded-full shadow-sm
            px-3 py-1.5 relative z-10
            transition-all duration-300
        ">
            <Type className="w-4 h-4 md:w-4 md:h-4 text-slate-400 hidden md:block" />
            <button 
                onClick={() => setScale(s => Math.max(0.8, Number((s - 0.1).toFixed(1))))}
                className="w-8 h-8 md:w-7 md:h-7 flex items-center justify-center bg-slate-50 md:bg-white rounded-full text-slate-700 shadow-sm hover:bg-slate-100 transition-colors border border-slate-200 md:border-slate-100 active:scale-95"
                aria-label="Decrease font size"
            >
                <Minus className="w-4 h-4 md:w-3.5 md:h-3.5" />
            </button>
            <span className="text-xs md:text-xs font-black text-slate-600 md:text-slate-500 w-12 md:w-10 text-center tracking-widest">{Math.round(scale * 100)}%</span>
            <button 
                onClick={() => setScale(s => Math.min(1.5, Number((s + 0.1).toFixed(1))))}
                className="w-8 h-8 md:w-7 md:h-7 flex items-center justify-center bg-slate-50 md:bg-white rounded-full text-slate-700 shadow-sm hover:bg-slate-100 transition-colors border border-slate-200 md:border-slate-100 active:scale-95"
                aria-label="Increase font size"
            >
                <Plus className="w-4 h-4 md:w-3.5 md:h-3.5" />
            </button>
        </div>
    )
}
