'use client'

import { useState, useEffect } from 'react'
import { ShieldCheck, CheckCircle2, AlertTriangle, XCircle, RefreshCw, ExternalLink, Zap, FileCode2 } from 'lucide-react'
import { checkAdSenseEligibility, enableAdSenseAction, AdSenseEligibilityReport } from '@/lib/actions/adsense-checker'
import { useTranslations } from 'next-intl'
import { useUIStore } from '@/store/ui'

interface AdSenseEligibilityTesterProps {
    initialReport?: AdSenseEligibilityReport | null
}

export default function AdSenseEligibilityTester({ initialReport }: AdSenseEligibilityTesterProps) {
    const t = useTranslations('AdSenseChecker')
    const showNotification = useUIStore((state) => state.showNotification)
    const [report, setReport] = useState<AdSenseEligibilityReport | null>(initialReport || null)
    const [isLoading, setIsLoading] = useState(!initialReport)
    const [isEnabling, setIsEnabling] = useState(false)

    const runAudit = async () => {
        setIsLoading(true)
        try {
            const data = await checkAdSenseEligibility()
            setReport(data)
        } catch (err) {
            console.error('Erreur audit AdSense:', err)
        } finally {
            setIsLoading(false)
        }
    }

    const handleEnableAdSense = async () => {
        setIsEnabling(true)
        try {
            const res = await enableAdSenseAction(report?.publisherId || 'pub-6513929866629555')
            if (res.success) {
                showNotification('Google AdSense activé avec succès !', 'success')
                await runAudit()
            } else {
                showNotification(res.error || "Erreur lors de l'activation", 'error')
            }
        } catch (e) {
            showNotification('Erreur réseau', 'error')
        } finally {
            setIsEnabling(false)
        }
    }

    useEffect(() => {
        if (!initialReport) {
            runAudit()
        }
    }, [initialReport])

    const score = report?.score ?? 0
    const isEligible = report?.isEligible ?? false

    return (
        <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-black text-slate-900">{t('Title')}</h2>
                            {report && (
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                                    isEligible 
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                                }`}>
                                    {isEligible ? t('EligibleBadge') : t('PendingBadge')}
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-slate-500 mt-0.5">{t('Subtitle')}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={runAudit}
                        disabled={isLoading}
                        className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                        {isLoading ? t('Running') : t('RunAudit')}
                    </button>
                    {report?.publisherId && (
                        <a
                            href={`https://adsense.google.com/adsense/u/2/${report.publisherId}/sites/detail/url=riwaya.store`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold hover:bg-emerald-100 active:scale-95 transition-all flex items-center gap-1.5"
                        >
                            <span>Console AdSense</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                    )}
                </div>
            </div>

            {/* Score & Progress */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-black text-lg text-slate-900 shadow-sm">
                        {score}%
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('ScoreLabel')}</p>
                        <p className="text-sm font-black text-slate-900">
                            {isEligible ? t('ResubmitTip') : t('PendingBadge')}
                        </p>
                    </div>
                </div>
                <div className="w-full sm:w-48 bg-slate-200 h-2.5 rounded-full overflow-hidden">
                    <div 
                        className={`h-full transition-all duration-700 ${isEligible ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                        style={{ width: `${score}%` }} 
                    />
                </div>
            </div>

            {/* Checks Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {report?.checks.map((check) => {
                    const isSuccess = check.status === 'success'
                    const isWarning = check.status === 'warning'
                    
                    return (
                        <div 
                            key={check.id} 
                            className={`p-4 rounded-2xl border transition-all ${
                                isSuccess 
                                    ? 'bg-emerald-50/40 border-emerald-200/80' 
                                    : isWarning 
                                        ? 'bg-amber-50/40 border-amber-200/80' 
                                        : 'bg-red-50/40 border-red-200/80'
                            }`}
                        >
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 shrink-0">
                                    {isSuccess ? (
                                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                    ) : isWarning ? (
                                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                                    ) : (
                                        <XCircle className="w-5 h-5 text-red-600" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <h4 className="text-sm font-black text-slate-900 truncate">
                                            {t(check.titleKey as any)}
                                        </h4>
                                        {check.actionUrl && (
                                            <a 
                                                href={check.actionUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-0.5 shrink-0"
                                            >
                                                <span>Voir</span>
                                                <ExternalLink className="w-2.5 h-2.5" />
                                            </a>
                                        )}
                                    </div>
                                    <p className="text-xs font-bold text-slate-700 mt-1">{check.message}</p>
                                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{check.details}</p>
                                    {check.id === 'script' && !isSuccess && (
                                        <button
                                            type="button"
                                            onClick={handleEnableAdSense}
                                            disabled={isEnabling}
                                            className="mt-2.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                                        >
                                            {isEnabling ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                                            <span>{t('EnableNow')}</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

