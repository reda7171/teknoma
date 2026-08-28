'use client'

import { useEffect, useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'

export default function MobileSectionNavigation({ language = 'fr' }: { language?: string }) {
    const [headings, setHeadings] = useState<HTMLElement[]>([])
    const [currentIndex, setCurrentIndex] = useState<number>(-1)

    useEffect(() => {
        // Collecter tous les titres h2 et h3 de l'article
        const elements = Array.from(document.querySelectorAll('#article-content h2, #article-content h3')) as HTMLElement[]
        setHeadings(elements)

        if (elements.length === 0) return

        const handleScroll = () => {
            let activeIdx = -1
            const isAtBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 50

            for (let i = 0; i < elements.length; i++) {
                const rect = elements[i].getBoundingClientRect()
                // Si l'élément est au-dessus ou proche du haut de l'écran
                if (rect.top <= 150) {
                    activeIdx = i
                }
            }
            
            if (isAtBottom && elements.length > 0) {
                activeIdx = elements.length - 1
            }
            
            setCurrentIndex(activeIdx)
        }

        window.addEventListener('scroll', handleScroll, { passive: true })
        handleScroll() // Initial check

        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    if (headings.length === 0) return null

    const scrollToHeading = (index: number) => {
        if (index >= 0 && index < headings.length) {
            const element = headings[index]
            const y = element.getBoundingClientRect().top + window.scrollY - 100 // -100 pour laisser de la marge (navbar, etc)
            window.scrollTo({ top: y, behavior: 'smooth' })
        } else if (index === -1) {
            // Revenir tout en haut si on remonte avant le premier titre
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }

    const handlePrev = () => {
        for (let i = headings.length - 1; i >= 0; i--) {
            // Un titre qui est au-dessus de la ligne de vue (50px)
            if (headings[i].getBoundingClientRect().top < 50) {
                scrollToHeading(i)
                return
            }
        }
        scrollToHeading(-1)
    }

    const handleNext = () => {
        for (let i = 0; i < headings.length; i++) {
            // Le premier titre qui est en dessous de la ligne de vue (150px)
            if (headings[i].getBoundingClientRect().top > 150) {
                scrollToHeading(i)
                return
            }
        }
        // Fallback si on est tout en bas mais qu'on veut forcer le défilement
        if (currentIndex < headings.length - 1) {
            scrollToHeading(currentIndex + 1)
        }
    }

    const isRtl = language === 'ar'

    return (
        <div className={`md:hidden fixed bottom-36 ${isRtl ? 'left-4' : 'right-4'} z-40 flex flex-col gap-2 pointer-events-auto`}>
            <button
                onClick={handlePrev}
                disabled={currentIndex === -1}
                className={`p-3 rounded-full bg-white shadow-lg border border-gray-100 flex items-center justify-center transition-all ${
                    currentIndex === -1 ? 'opacity-50 cursor-not-allowed' : 'active:scale-95 text-slate-700 hover:text-black hover:bg-slate-50'
                }`}
                aria-label="Section précédente"
            >
                <ChevronUp className="w-5 h-5" />
            </button>
            <button
                onClick={handleNext}
                disabled={currentIndex >= headings.length - 1}
                className={`p-3 rounded-full bg-white shadow-lg border border-gray-100 flex items-center justify-center transition-all ${
                    currentIndex >= headings.length - 1 ? 'opacity-50 cursor-not-allowed' : 'active:scale-95 text-slate-700 hover:text-black hover:bg-slate-50'
                }`}
                aria-label="Section suivante"
            >
                <ChevronDown className="w-5 h-5" />
            </button>
        </div>
    )
}
