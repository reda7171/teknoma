'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, HelpCircle, RotateCcw, Truck, CreditCard, Search, X } from 'lucide-react'
import { useLocale } from 'next-intl'

export interface FaqItem {
    question: string
    answer: string
    category?: 'RETURN' | 'SHIPPING' | 'PAYMENT' | 'GENERAL'
}

interface ContactFaqProps {
    items: FaqItem[]
    title: string
    subtitle: string
}

export default function ContactFaq({ items, title, subtitle }: ContactFaqProps) {
    const [openIndex, setOpenIndex] = useState<number | null>(0)
    const [searchQuery, setSearchQuery] = useState('')
    const locale = useLocale()

    const isAr = locale === 'ar'
    const isEn = locale === 'en'

    const labels = {
        placeholder: isAr
            ? 'ابحث عن سؤال (الإرجاع، التوصيل، الدفع...)'
            : isEn
            ? 'Search a question (returns, shipping, payment...)'
            : 'Rechercher une question (retours, livraison, paiement...)',
        noResults: isAr
            ? 'لم يتم العثور على أي سؤال يطابق بحثك'
            : isEn
            ? 'No questions match your search'
            : 'Aucune question ne correspond à votre recherche',
        clear: isAr ? 'إعادة التعيين' : isEn ? 'Clear search' : 'Effacer la recherche',
        answersCount: isAr ? 'إجابات متاحة' : isEn ? 'answers available' : 'réponses disponibles',
    }

    const filteredItems = useMemo(() => {
        const query = searchQuery.trim().toLowerCase()
        if (!query) return items
        return items.filter(
            (item) =>
                item.question.toLowerCase().includes(query) ||
                item.answer.toLowerCase().includes(query)
        )
    }, [items, searchQuery])

    const isSearching = searchQuery.trim().length > 0

    const toggle = (idx: number) => {
        setOpenIndex(openIndex === idx ? null : idx)
    }

    const getCategoryIcon = (category?: string) => {
        switch (category) {
            case 'RETURN':
                return <RotateCcw className="w-3.5 h-3.5 text-black" />
            case 'SHIPPING':
                return <Truck className="w-3.5 h-3.5 text-black" />
            case 'PAYMENT':
                return <CreditCard className="w-3.5 h-3.5 text-black" />
            default:
                return <HelpCircle className="w-3.5 h-3.5 text-black" />
        }
    }

    return (
        <div className="pt-6 sm:pt-8 border-t border-gray-100">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-pixio-yellow/30 rounded-2xl flex items-center justify-center shrink-0 text-black">
                    <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                    <h2 className="text-lg sm:text-xl font-black text-black tracking-tight leading-tight">
                        {title}
                    </h2>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        {subtitle}
                    </p>
                </div>
            </div>

            {/* Champ de recherche instantanée */}
            <div className="relative mb-4">
                <div className="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 pl-3.5 rtl:pl-0 rtl:pr-3.5 flex items-center pointer-events-none text-gray-400">
                    <Search className="w-4 h-4" />
                </div>
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={labels.placeholder}
                    className="w-full bg-white border border-gray-200 focus:border-black rounded-2xl pl-10 pr-10 rtl:pl-10 rtl:pr-10 py-2.5 sm:py-3 text-xs sm:text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-black/5 transition-all shadow-sm"
                />
                {searchQuery && (
                    <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        aria-label={labels.clear}
                        className="absolute inset-y-0 right-0 rtl:right-auto rtl:left-0 pr-3.5 rtl:pr-0 rtl:pl-3.5 flex items-center text-gray-400 hover:text-black transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Liste des questions accordéon */}
            <div className="space-y-3">
                {filteredItems.length === 0 ? (
                    <div className="bg-white rounded-2xl p-6 text-center border border-gray-100 shadow-sm animate-in fade-in duration-200">
                        <p className="text-xs sm:text-sm text-gray-500 font-medium mb-3">{labels.noResults}</p>
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="px-4 py-2 bg-gray-100 hover:bg-black hover:text-white text-gray-800 text-xs font-bold rounded-xl transition-all"
                        >
                            {labels.clear}
                        </button>
                    </div>
                ) : (
                    filteredItems.map((item, idx) => {
                        // Lorsque l'utilisateur recherche un mot-clé, on ouvre automatiquement toutes les réponses correspondantes
                        const isOpen = isSearching || openIndex === idx
                        return (
                            <div
                                key={idx}
                                className={`bg-white rounded-2xl border transition-all duration-300 overflow-hidden ${
                                    isOpen
                                        ? 'border-black shadow-md'
                                        : 'border-gray-100 hover:border-gray-300 shadow-sm'
                                }`}
                            >
                                <button
                                    type="button"
                                    onClick={() => !isSearching && toggle(idx)}
                                    aria-expanded={isOpen}
                                    className="w-full p-4 sm:p-5 text-left rtl:text-right flex items-center justify-between gap-3 font-black text-xs sm:text-sm text-black transition-colors"
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center shrink-0">
                                            {getCategoryIcon(item.category)}
                                        </div>
                                        <span className="truncate">{item.question}</span>
                                    </div>
                                    <div
                                        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-transform duration-300 ${
                                            isOpen ? 'bg-black text-white rotate-180' : 'bg-gray-100 text-gray-600'
                                        }`}
                                    >
                                        <ChevronDown className="w-3.5 h-3.5" />
                                    </div>
                                </button>

                                {isOpen && (
                                    <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs sm:text-sm font-medium text-gray-600 leading-relaxed border-t border-gray-100 pt-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                        {item.answer}
                                    </div>
                                )}
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
