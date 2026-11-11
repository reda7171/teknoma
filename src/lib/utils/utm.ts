/**
 * Utilitaires partagés pour normaliser les URLs publicitaires avec paramètres UTM
 * (nettoyés ensuite côté client par UtmTracker.tsx pour préserver les URL canoniques SEO).
 */
export function slugifyCampaignName(name: string): string {
    return (
        String(name || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 60) || 'riwaya-promo'
    )
}

export function appendUtmParams(
    rawUrl: string,
    params: {
        source: string
        medium: string
        campaign: string
        content?: string
    }
): string {
    const fallback = 'https://riwaya.store/fr/books'
    const candidate = (rawUrl || fallback).trim()
    try {
        const parsed = candidate.startsWith('http')
            ? new URL(candidate)
            : new URL(candidate.startsWith('/') ? candidate : `/${candidate}`, 'https://riwaya.store')

        if (!parsed.searchParams.has('utm_source')) {
            parsed.searchParams.set('utm_source', params.source.trim().toLowerCase())
        }
        if (!parsed.searchParams.has('utm_medium')) {
            parsed.searchParams.set('utm_medium', params.medium.trim().toLowerCase())
        }
        if (!parsed.searchParams.has('utm_campaign')) {
            parsed.searchParams.set('utm_campaign', slugifyCampaignName(params.campaign))
        }
        if (params.content && !parsed.searchParams.has('utm_content')) {
            parsed.searchParams.set('utm_content', slugifyCampaignName(params.content))
        }
        return parsed.toString()
    } catch {
        return fallback
    }
}

/** Tronque proprement un texte publicitaire à la limite stricte (ex: 30 ou 90 caractères Google Ads). */
export function clampAdText(text: string, maxLength: number): string {
    const normalized = String(text || '').replace(/\s+/g, ' ').trim()
    if (normalized.length <= maxLength) return normalized
    const slice = normalized.slice(0, maxLength)
    const lastSpace = slice.lastIndexOf(' ')
    const cut = lastSpace >= Math.floor(maxLength * 0.6) ? slice.slice(0, lastSpace) : slice
    return cut.replace(/[,:;.\-]+$/, '').trim() || slice.trim()
}

