'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowRight, X, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface SeoAlertBannerProps {
    totalBooks: number
    lowSeoBooks: number
    thresholdPercent?: number
    locale: string
}

const STORAGE_KEY = 'tekno_seo_alert_dismissed'

export default function SeoAlertBanner({
    totalBooks,
    lowSeoBooks,
    thresholdPercent = 50,
    locale,
}: SeoAlertBannerProps) {
    const t = useTranslations('SeoAlert')
    const [dismissed, setDismissed] = useState(false)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        try {
            const isDismissed = sessionStorage.getItem(STORAGE_KEY) === 'true'
            if (isDismissed) setDismissed(true)
        } catch {
            // ignore storage errors
        }
    }, [])

    if (totalBooks <= 0) return null

    const percent = Math.round((lowSeoBooks / totalBooks) * 1000) / 10

    // Afficher uniquement si le pourcentage dépasse le seuil défini
    if (percent <= thresholdPercent) return null
    if (dismissed && mounted) return null

    function handleDismiss() {
        setDismissed(true)
        try {
            sessionStorage.setItem(STORAGE_KEY, 'true')
        } catch {
            // ignore
        }
    }

    const isRtl = locale === 'ar'

    return (
        <div
            id="seo-alert-banner"
            role="alert"
            className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-amber-300/80 bg-gradient-to-r from-amber-50 via-orange-50/70 to-amber-50 p-4 sm:p-6 shadow-xl shadow-amber-950/5 transition-all"
        >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Icône + Contenu */}
                <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 min-w-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/25">
                        <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
                    </div>

                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-amber-200/80 text-amber-900 border border-amber-300/60">
                                <Sparkles className="w-2.5 h-2.5" />
                                {t('Badge')} • {percent}% &gt; {thresholdPercent}%
                            </span>
                        </div>
                        <h2 className="text-sm sm:text-base font-black text-amber-950 tracking-tight">
                            {t('Title')}
                        </h2>
                        <p className="text-xs sm:text-sm text-amber-900/80 font-medium mt-0.5">
                            {t('Description', {
                                count: lowSeoBooks,
                                total: totalBooks,
                                percent,
                                threshold: thresholdPercent,
                            })}
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 sm:gap-3 self-end md:self-center shrink-0 pt-2 md:pt-0">
                    <Link
                        href={`/${locale}/admin/products?seoScore=lte80`}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl sm:rounded-2xl bg-black text-white hover:bg-gray-900 transition-all font-black text-[10px] uppercase tracking-widest shadow-lg shadow-black/10 active:scale-95"
                    >
                        <span>{t('Action')} ({lowSeoBooks})</span>
                        <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
                    </Link>

                    <button
                        type="button"
                        onClick={handleDismiss}
                        title={t('Dismiss')}
                        className="p-2 text-amber-800/70 hover:text-black rounded-xl hover:bg-amber-100/60 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    )
}
