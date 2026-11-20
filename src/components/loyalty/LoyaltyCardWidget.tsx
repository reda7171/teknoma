'use client'

import React from 'react'
import { Crown, Sparkles, Gift, TrendingUp, ShieldCheck, ArrowRight } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { Link } from '@/i18n/routing'

interface LoyaltyCardWidgetProps {
    pointsBalance: number
    lifetimePoints: number
    pointsValueMAD: number
    tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM'
    multiplier: number
    perks: string[]
    nextTier?: {
        name: string
        minPoints: number
        pointsNeeded: number
        progress: number
    } | null
    compact?: boolean
}

export default function LoyaltyCardWidget({
    pointsBalance,
    lifetimePoints,
    pointsValueMAD,
    tier,
    multiplier,
    perks,
    nextTier,
    compact = false
}: LoyaltyCardWidgetProps) {
    const t = useTranslations('Loyalty')
    const locale = useLocale()

    // Configuration des styles de badges et fonds par niveau VIP (sans mauve/violet)
    const tierStyles = {
        BRONZE: {
            bg: 'bg-gradient-to-br from-[#2D2A26] to-[#1A1816] text-white',
            badge: 'bg-[#B08D57]/20 text-[#E5C185] border-[#B08D57]/40',
            accent: 'text-[#E5C185]',
            bar: 'bg-[#E5C185]'
        },
        SILVER: {
            bg: 'bg-gradient-to-br from-[#2C3437] to-[#171B1D] text-white',
            badge: 'bg-slate-300/20 text-slate-200 border-slate-400/40',
            accent: 'text-slate-200',
            bar: 'bg-slate-300'
        },
        GOLD: {
            bg: 'bg-gradient-to-br from-[#2A2312] to-[#141006] text-white',
            badge: 'bg-amber-400/20 text-amber-300 border-amber-400/50',
            accent: 'text-amber-300',
            bar: 'bg-amber-400'
        },
        PLATINUM: {
            bg: 'bg-gradient-to-br from-[#12161A] to-[#0A0D0F] text-white',
            badge: 'bg-cyan-400/20 text-cyan-300 border-cyan-400/50',
            accent: 'text-cyan-300',
            bar: 'bg-cyan-400'
        }
    }[tier] || {
        bg: 'bg-black text-white',
        badge: 'bg-gray-800 text-gray-200 border-gray-700',
        accent: 'text-white',
        bar: 'bg-white'
    }

    if (compact) {
        return (
            <div className={`p-4 rounded-2xl ${tierStyles.bg} shadow-lg border border-white/10 flex items-center justify-between`}>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                        <Crown className={`w-5 h-5 ${tierStyles.accent}`} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-black uppercase tracking-widest">{t('Member')} {tier}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/15 font-black">x{multiplier}</span>
                        </div>
                        <p className="text-lg font-black tracking-tight">{pointsBalance} <span className="text-xs font-medium text-gray-300">{t('Points')}</span></p>
                    </div>
                </div>
                <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">{t('DiscountValue')}</span>
                    <span className="text-base font-black text-emerald-400">{pointsValueMAD} {locale === 'ar' ? 'درهم' : 'MAD'}</span>
                </div>
            </div>
        )
    }

    return (
        <div className={`rounded-3xl p-6 sm:p-8 ${tierStyles.bg} shadow-2xl border border-white/10 relative overflow-hidden`}>
            {/* Décoration de fond subtile */}
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/5 blur-2xl pointer-events-none" />

            <div className="relative z-10">
                {/* Header Carte VIP */}
                <div className="flex items-start justify-between gap-4 mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] rounded-full border ${tierStyles.badge}`}>
                                VIP {tier}
                            </span>
                            <span className="px-2.5 py-1 text-[10px] font-black rounded-full bg-white/10 text-gray-200">
                                {t('Multiplier')}: x{multiplier}
                            </span>
                        </div>
                        <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">{t('ClubTitle')}</h3>
                    </div>

                    <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
                        <Crown className={`w-6 h-6 ${tierStyles.accent}`} />
                    </div>
                </div>

                {/* Solde de points */}
                <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 mb-6">
                    <div>
                        <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-400 block mb-1">
                            {t('AvailablePoints')}
                        </span>
                        <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                            {pointsBalance}
                        </div>
                    </div>
                    <div>
                        <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-gray-400 block mb-1">
                            {t('EstimatedValue')}
                        </span>
                        <div className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight">
                            {pointsValueMAD} <span className="text-xs font-bold text-gray-300">{locale === 'ar' ? 'درهم' : 'MAD'}</span>
                        </div>
                    </div>
                </div>

                {/* Barre de progression vers le niveau suivant */}
                {nextTier && (
                    <div className="mb-6 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-gray-300 font-bold">
                                {t('NextLevel')}: <strong className="text-white font-black">{nextTier.name}</strong>
                            </span>
                            <span className="text-gray-400 text-[11px] font-bold">
                                {nextTier.pointsNeeded} {t('PointsNeeded')}
                            </span>
                        </div>
                        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                            <div
                                className={`h-full ${tierStyles.bar} transition-all duration-1000 rounded-full`}
                                style={{ width: `${Math.max(5, nextTier.progress)}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Avantages du palier */}
                <div className="space-y-2 pt-2 border-t border-white/10">
                    <span className="text-[10px] uppercase font-black tracking-widest text-gray-400 block">
                        {t('TierBenefits')}
                    </span>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {perks.map((perk, idx) => (
                            <li key={idx} className="flex items-center gap-2 text-xs text-gray-200 font-medium">
                                <Sparkles className={`w-3.5 h-3.5 ${tierStyles.accent} shrink-0`} />
                                <span>{perk}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    )
}
