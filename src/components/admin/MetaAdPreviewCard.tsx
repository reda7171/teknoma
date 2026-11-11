'use client'

import Image from 'next/image'
import { Globe, ShoppingBag } from 'lucide-react'

interface MetaAdPreviewCardProps {
    headline: string
    primaryText: string
    description?: string
    imageUrl?: string
    linkUrl: string
    ctaLabel?: string
}

export default function MetaAdPreviewCard({
    headline,
    primaryText,
    description,
    imageUrl,
    linkUrl,
    ctaLabel = 'Acheter',
}: MetaAdPreviewCardProps) {
    const cleanHost = (() => {
        try {
            return new URL(linkUrl).hostname.toUpperCase()
        } catch {
            return 'RIWAYA.STORE'
        }
    })()

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden max-w-md mx-auto">
            {/* En-tête Page Meta */}
            <div className="p-3.5 flex items-center gap-3 border-b border-slate-100">
                <div className="w-9 h-9 rounded-full bg-black text-white flex items-center justify-center font-black italic text-sm shrink-0">
                    R
                </div>
                <div className="min-w-0">
                    <p className="text-xs font-black text-slate-900 truncate">Riwaya.store</p>
                    <p className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                        <span>Sponsorisé</span>
                        <span>·</span>
                        <Globe className="w-2.5 h-2.5" />
                    </p>
                </div>
            </div>

            {/* Texte principal */}
            <div className="px-3.5 py-2.5 text-xs text-slate-800 whitespace-pre-line leading-relaxed">
                {primaryText || 'Commandez vos livres favoris au Maroc avec paiement à la livraison.'}
            </div>

            {/* Visuel */}
            <div className="relative aspect-[1.91/1] w-full bg-slate-100 flex items-center justify-center overflow-hidden">
                {imageUrl ? (
                    <Image
                        src={imageUrl}
                        alt={headline || 'Visuel publicitaire Riwaya'}
                        fill
                        className="object-cover"
                        unoptimized
                    />
                ) : (
                    <div className="flex flex-col items-center gap-1.5 text-slate-400">
                        <ShoppingBag className="w-8 h-8" />
                        <span className="text-[11px] font-bold">Aperçu visuel produit</span>
                    </div>
                )}
            </div>

            {/* Pied de carte avec CTA */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate">
                        {cleanHost}
                    </p>
                    <p className="text-xs font-black text-slate-900 truncate">
                        {headline || 'Commandez maintenant'}
                    </p>
                    {description && (
                        <p className="text-[11px] text-slate-600 truncate">{description}</p>
                    )}
                </div>
                <span className="px-3.5 py-2 rounded-lg bg-slate-200 text-slate-900 text-[11px] font-black shrink-0">
                    {ctaLabel}
                </span>
            </div>

            {/* URL UTM */}
            <div className="px-3.5 py-2 bg-emerald-50/70 border-t border-emerald-100 text-[10px] font-mono text-emerald-900 break-all">
                UTM : {linkUrl}
            </div>
        </div>
    )
}

