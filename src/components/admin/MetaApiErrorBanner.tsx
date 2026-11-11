'use client'

import Link from 'next/link'
import { AlertTriangle, Settings } from 'lucide-react'

export interface MetaApiErrorState {
    error: string
    errorCode?: 'TOKEN_EXPIRED' | 'MISSING_CONFIG' | 'META_API_ERROR' | string
    configPath?: string
}

interface MetaApiErrorBannerProps {
    banner: MetaApiErrorState | null
    onNavigate?: () => void
}

/**
 * Bandeau d'alerte actionnable lorsque le lancement Meta Ads échoue (ex. token expiré OAuth 190).
 */
export default function MetaApiErrorBanner({ banner, onNavigate }: MetaApiErrorBannerProps) {
    if (!banner) return null

    const title =
        banner.errorCode === 'TOKEN_EXPIRED'
            ? 'Token Meta Marketing expiré ou invalide'
            : banner.errorCode === 'MISSING_CONFIG'
              ? 'Configuration Meta Ads incomplète'
              : 'Échec de la requête Meta Ads'

    return (
        <div
            role="alert"
            className="p-4 rounded-2xl bg-red-50 border border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
            <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <p className="text-xs font-black text-red-900">{title}</p>
                    <p className="text-xs text-red-700 leading-relaxed">{banner.error}</p>
                </div>
            </div>
            {banner.configPath && (
                <Link
                    href={banner.configPath}
                    onClick={onNavigate}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shrink-0 transition-colors"
                >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Configurer le token Meta</span>
                </Link>
            )}
        </div>
    )
}

