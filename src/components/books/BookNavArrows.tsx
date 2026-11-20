'use client'

import { useEffect } from 'react'
import { useRouter, Link } from '@/i18n/routing'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import { generateBookUrl, getLocalizedTitle } from '@/lib/i18n-utils'
import type { AdjacentBookItem } from '@/lib/db/books'

interface BookNavArrowsProps {
    prevBook: AdjacentBookItem | null
    nextBook: AdjacentBookItem | null
    locale: string
    category: string | null
    currentIndex: number
    totalInCategory: number
}

export default function BookNavArrows({
    prevBook,
    nextBook,
    locale,
    category,
    currentIndex,
    totalInCategory
}: BookNavArrowsProps) {
    const router = useRouter()
    const isRtl = locale === 'ar'

    // En RTL (Arabe), le sens de lecture est inversé :
    // - Bouton droit = Livre Précédent (سابق)
    // - Bouton gauche = Livre Suivant (التالي)
    // En LTR (Français / Anglais) :
    // - Bouton gauche = Livre Précédent
    // - Bouton droit = Livre Suivant
    const leftBook = isRtl ? nextBook : prevBook
    const rightBook = isRtl ? prevBook : nextBook

    const leftLabel = isRtl ? 'التالي' : locale === 'en' ? 'Next' : 'Suivant'
    const rightLabel = isRtl ? 'السابق' : locale === 'en' ? 'Previous' : 'Précédent'

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement
            if (
                target &&
                (target.tagName === 'INPUT' ||
                    target.tagName === 'TEXTAREA' ||
                    target.tagName === 'SELECT' ||
                    target.isContentEditable)
            ) {
                return
            }

            if (e.key === 'ArrowLeft' && leftBook) {
                router.push(generateBookUrl(leftBook, locale))
            } else if (e.key === 'ArrowRight' && rightBook) {
                router.push(generateBookUrl(rightBook, locale))
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [leftBook, rightBook, locale, router])

    if (!prevBook && !nextBook) {
        return null
    }

    return (
        <aside aria-label="Navigation livres même catégorie" className="pointer-events-none">
            {/* Bouton GAUCHE */}
            {leftBook ? (
                <Link
                    href={generateBookUrl(leftBook, locale)}
                    className="fixed left-2 sm:left-4 md:left-6 top-1/2 -translate-y-1/2 z-40 flex items-center group cursor-pointer pointer-events-auto"
                    title={`${leftLabel} : ${getLocalizedTitle(leftBook, locale)}`}
                >
                    <div className="w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-2xl bg-white/95 hover:bg-black text-gray-800 hover:text-white shadow-2xl border border-gray-200/90 backdrop-blur-md flex items-center justify-center transition-all duration-200 group-hover:scale-110 group-active:scale-95">
                        <ChevronLeft className="w-6 h-6 md:w-7 md:h-7 transition-transform group-hover:-translate-x-0.5" />
                    </div>

                    {/* Infobulle avec aperçu de couverture au survol */}
                    <div className="hidden lg:group-hover:flex items-center gap-3 absolute left-full ml-3 px-3.5 py-3 bg-gray-950/95 text-white rounded-2xl shadow-2xl whitespace-nowrap max-w-[320px] pointer-events-none animate-in fade-in zoom-in-95 border border-white/10 backdrop-blur-md">
                        {leftBook.image && (
                            <div className="relative w-11 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gray-800 border border-white/10">
                                <Image
                                    src={leftBook.image}
                                    alt={getLocalizedTitle(leftBook, locale)}
                                    fill
                                    sizes="44px"
                                    className="object-cover"
                                />
                            </div>
                        )}
                        <div className="flex flex-col min-w-0 text-left">
                            <div className="flex items-center gap-1.5 text-[10px] uppercase font-black text-amber-400">
                                <ChevronLeft className="w-3 h-3" />
                                <span>{leftLabel}</span>
                                {category && (
                                    <span className="text-gray-400 font-medium lowercase">
                                        • {category}
                                    </span>
                                )}
                            </div>
                            <span className="font-bold text-xs text-gray-100 truncate mt-0.5 max-w-[200px]">
                                {getLocalizedTitle(leftBook, locale)}
                            </span>
                            <span className="text-[11px] text-gray-400 mt-0.5 truncate">
                                {leftBook.author} • <strong className="text-white">{leftBook.price} DH</strong>
                            </span>
                        </div>
                    </div>
                </Link>
            ) : null}

            {/* Bouton DROIT */}
            {rightBook ? (
                <Link
                    href={generateBookUrl(rightBook, locale)}
                    className="fixed right-2 sm:right-4 md:right-6 top-1/2 -translate-y-1/2 z-40 flex items-center justify-end group cursor-pointer pointer-events-auto"
                    title={`${rightLabel} : ${getLocalizedTitle(rightBook, locale)}`}
                >
                    {/* Infobulle avec aperçu de couverture au survol */}
                    <div className="hidden lg:group-hover:flex items-center gap-3 absolute right-full mr-3 px-3.5 py-3 bg-gray-950/95 text-white rounded-2xl shadow-2xl whitespace-nowrap max-w-[320px] pointer-events-none animate-in fade-in zoom-in-95 border border-white/10 backdrop-blur-md text-right">
                        <div className="flex flex-col min-w-0">
                            <div className="flex items-center justify-end gap-1.5 text-[10px] uppercase font-black text-amber-400">
                                {category && (
                                    <span className="text-gray-400 font-medium lowercase">
                                        {category} •
                                    </span>
                                )}
                                <span>{rightLabel}</span>
                                <ChevronRight className="w-3 h-3" />
                            </div>
                            <span className="font-bold text-xs text-gray-100 truncate mt-0.5 max-w-[200px]">
                                {getLocalizedTitle(rightBook, locale)}
                            </span>
                            <span className="text-[11px] text-gray-400 mt-0.5 truncate">
                                {rightBook.author} • <strong className="text-white">{rightBook.price} DH</strong>
                            </span>
                        </div>
                        {rightBook.image && (
                            <div className="relative w-11 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gray-800 border border-white/10">
                                <Image
                                    src={rightBook.image}
                                    alt={getLocalizedTitle(rightBook, locale)}
                                    fill
                                    sizes="44px"
                                    className="object-cover"
                                />
                            </div>
                        )}
                    </div>

                    <div className="w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-2xl bg-white/95 hover:bg-black text-gray-800 hover:text-white shadow-2xl border border-gray-200/90 backdrop-blur-md flex items-center justify-center transition-all duration-200 group-hover:scale-110 group-active:scale-95">
                        <ChevronRight className="w-6 h-6 md:w-7 md:h-7 transition-transform group-hover:translate-x-0.5" />
                    </div>
                </Link>
            ) : null}
        </aside>
    )
}
