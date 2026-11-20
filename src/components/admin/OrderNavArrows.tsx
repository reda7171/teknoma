'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface OrderNavArrowsProps {
    prevOrder: { id: string; fullName: string; total: number } | null
    nextOrder: { id: string; fullName: string; total: number } | null
    locale: string
}

export default function OrderNavArrows({ prevOrder, nextOrder, locale }: OrderNavArrowsProps) {
    const router = useRouter()

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
                return
            }
            if (e.key === 'ArrowLeft' && prevOrder) {
                router.push(`/${locale}/admin/orders/${prevOrder.id}`)
            } else if (e.key === 'ArrowRight' && nextOrder) {
                router.push(`/${locale}/admin/orders/${nextOrder.id}`)
            }
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [prevOrder, nextOrder, locale, router])

    return (
        <>
            {/* Flèche fixe gauche : Commande précédente */}
            {prevOrder ? (
                <Link
                    href={`/${locale}/admin/orders/${prevOrder.id}`}
                    className="fixed left-3 md:left-6 top-1/2 -translate-y-1/2 z-50 flex items-center group cursor-pointer"
                    title={`Commande précédente : ${prevOrder.fullName}`}
                >
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/95 hover:bg-black text-gray-700 hover:text-white shadow-2xl border border-gray-200/90 backdrop-blur-md flex items-center justify-center transition-all duration-200 group-hover:scale-110 group-active:scale-95 group-hover:shadow-indigo-500/20">
                        <ChevronLeft className="w-6 h-6 md:w-7 md:h-7 transition-transform group-hover:-translate-x-0.5" />
                    </div>
                    {/* Infobulle nom & détails au survol */}
                    <div className="hidden lg:group-hover:flex flex-col absolute left-full ml-3 px-3.5 py-2.5 bg-gray-950 text-white text-xs rounded-xl shadow-2xl whitespace-nowrap max-w-[260px] pointer-events-none animate-in fade-in zoom-in-95 border border-white/10">
                        <div className="flex items-center gap-1.5 text-[10px] uppercase font-black text-amber-400">
                            <ChevronLeft className="w-3 h-3" />
                            <span>Commande précédente</span>
                        </div>
                        <span className="font-semibold text-gray-100 truncate mt-0.5">{prevOrder.fullName || 'Client'}</span>
                        <span className="text-[11px] text-gray-400 mt-0.5">#{prevOrder.id.slice(0, 8)} • {prevOrder.total} DH</span>
                    </div>
                </Link>
            ) : (
                <div
                    className="fixed left-3 md:left-6 top-1/2 -translate-y-1/2 z-50 opacity-25 cursor-not-allowed select-none"
                    title="Première commande"
                >
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/60 text-gray-400 shadow-md border border-gray-200 flex items-center justify-center">
                        <ChevronLeft className="w-6 h-6 md:w-7 md:h-7" />
                    </div>
                </div>
            )}

            {/* Flèche fixe droite : Commande suivante */}
            {nextOrder ? (
                <Link
                    href={`/${locale}/admin/orders/${nextOrder.id}`}
                    className="fixed right-3 md:right-6 top-1/2 -translate-y-1/2 z-50 flex items-center justify-end group cursor-pointer"
                    title={`Commande suivante : ${nextOrder.fullName}`}
                >
                    {/* Infobulle nom & détails au survol */}
                    <div className="hidden lg:group-hover:flex flex-col absolute right-full mr-3 px-3.5 py-2.5 bg-gray-950 text-white text-xs rounded-xl shadow-2xl whitespace-nowrap max-w-[260px] pointer-events-none animate-in fade-in zoom-in-95 border border-white/10 text-right">
                        <div className="flex items-center justify-end gap-1.5 text-[10px] uppercase font-black text-amber-400">
                            <span>Commande suivante</span>
                            <ChevronRight className="w-3 h-3" />
                        </div>
                        <span className="font-semibold text-gray-100 truncate mt-0.5">{nextOrder.fullName || 'Client'}</span>
                        <span className="text-[11px] text-gray-400 mt-0.5">#{nextOrder.id.slice(0, 8)} • {nextOrder.total} DH</span>
                    </div>
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/95 hover:bg-black text-gray-700 hover:text-white shadow-2xl border border-gray-200/90 backdrop-blur-md flex items-center justify-center transition-all duration-200 group-hover:scale-110 group-active:scale-95 group-hover:shadow-indigo-500/20">
                        <ChevronRight className="w-6 h-6 md:w-7 md:h-7 transition-transform group-hover:translate-x-0.5" />
                    </div>
                </Link>
            ) : (
                <div
                    className="fixed right-3 md:right-6 top-1/2 -translate-y-1/2 z-50 opacity-25 cursor-not-allowed select-none"
                    title="Dernière commande"
                >
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/60 text-gray-400 shadow-md border border-gray-200 flex items-center justify-center">
                        <ChevronRight className="w-6 h-6 md:w-7 md:h-7" />
                    </div>
                </div>
            )}
        </>
    )
}
