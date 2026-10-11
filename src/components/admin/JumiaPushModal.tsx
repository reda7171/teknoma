'use client'

import { useState } from 'react'
import { X, Send, Loader2, Globe, Check } from 'lucide-react'
import { useTranslations } from 'next-intl'

export type JumiaPushLanguage = 'all' | 'fr' | 'ar' | 'en'

interface JumiaPushModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: (language: JumiaPushLanguage) => Promise<void> | void
    isLoading?: boolean
    title?: string
    subtitle?: string
}

export default function JumiaPushModal({
    isOpen,
    onClose,
    onConfirm,
    isLoading = false,
    title,
    subtitle
}: JumiaPushModalProps) {
    const [selectedLang, setSelectedLang] = useState<JumiaPushLanguage>('all')
    const t = useTranslations('JumiaPush')

    const modalTitle = title || t('Title')
    const modalSubtitle = subtitle || t('Subtitle')

    const languages: Array<{
        id: JumiaPushLanguage
        label: string
        sublabel: string
        flag: string
        badge?: string
    }> = [
        {
            id: 'all',
            label: t('All'),
            sublabel: t('AllDesc'),
            flag: '🌐',
            badge: t('Recommended')
        },
        {
            id: 'fr',
            label: t('Fr'),
            sublabel: t('FrDesc'),
            flag: '🇫🇷'
        },
        {
            id: 'ar',
            label: t('Ar'),
            sublabel: t('ArDesc'),
            flag: '🇲🇦'
        },
        {
            id: 'en',
            label: t('En'),
            sublabel: t('EnDesc'),
            flag: '🇬🇧'
        }
    ]

    if (!isOpen) return null

    const handleConfirm = () => {
        onConfirm(selectedLang)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-gradient-to-r from-orange-50/70 to-amber-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20">
                            <Globe className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-gray-900">{modalTitle}</h3>
                            <p className="text-xs text-gray-500">{modalSubtitle}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
                        aria-label="Fermer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body - Choices */}
                <div className="p-5 space-y-2.5">
                    {languages.map(lang => {
                        const isSelected = selectedLang === lang.id
                        return (
                            <button
                                key={lang.id}
                                type="button"
                                onClick={() => setSelectedLang(lang.id)}
                                disabled={isLoading}
                                className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                                    isSelected
                                        ? 'border-orange-500 bg-orange-50/50 shadow-sm ring-1 ring-orange-400'
                                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/70'
                                } disabled:opacity-50`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl select-none">{lang.flag}</span>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-gray-900">{lang.label}</span>
                                            {lang.badge && (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 uppercase tracking-wider">
                                                    {lang.badge}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-0.5">{lang.sublabel}</p>
                                    </div>
                                </div>
                                <div
                                    className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                        isSelected
                                            ? 'border-orange-500 bg-orange-500 text-white'
                                            : 'border-gray-300 bg-white'
                                    }`}
                                >
                                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </div>
                            </button>
                        )
                    })}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-4 bg-gray-50/80 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-200/60 rounded-xl transition-colors disabled:opacity-50"
                    >
                        {t('Cancel')}
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={isLoading}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>{t('Submitting')}</span>
                            </>
                        ) : (
                            <>
                                <Send className="w-4 h-4" />
                                <span>{t('Submit')}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
