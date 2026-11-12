/**
 * SEO Canonical URL Utility
 * Excludes all tracking, campaign, and ad query parameters (UTM, fbclid, gclid, ttclid, etc.)
 * from canonical URLs and headers to protect PageRank and eliminate duplicate content.
 */

export const TRACKING_PARAMS: ReadonlySet<string> = new Set([
    // Google Analytics / Urchin Tracking Module
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    'utm_id',
    'utm_source_platform',
    'utm_creative_format',
    'utm_marketing_tactic',

    // Facebook / Meta
    'fbclid',
    'fb_action_ids',
    'fb_action_types',
    'fb_source',
    'fbadid',

    // Google Ads / DoubleClick / Merchant
    'gclid',
    'gclsrc',
    'dclid',
    'wbraid',
    'gbraid',
    'srsltid',

    // TikTok
    'ttclid',

    // Microsoft / Bing
    'msclkid',

    // Twitter / X
    'twclid',

    // Instagram
    'igshid',

    // LinkedIn
    'li_fat_id',

    // Mailchimp
    'mc_cid',
    'mc_eid',

    // Pinterest
    'epik',

    // Yandex
    'yclid',
    'ym_debug',

    // Affiliate & Generic tracking
    '_openstat',
    'rb_clickid',
    'zanpid',
    'ref',
    'ref_src',
    'ref_url',
    'source',
    'campaign',
])

/**
 * Returns true if the query parameter key is a known tracking or campaign parameter.
 */
export function isTrackingParam(key: string): boolean {
    const lower = key.toLowerCase()
    return lower.startsWith('utm_') || TRACKING_PARAMS.has(lower)
}

/**
 * Strips all tracking parameters from a URLSearchParams object, query record, or query string.
 * Optionally allows only a specific list of functional query parameters.
 */
export function cleanSearchParams(
    params?: URLSearchParams | Record<string, string | string[] | undefined> | string,
    allowedParams?: string[]
): URLSearchParams {
    const cleaned = new URLSearchParams()
    if (!params) return cleaned

    const allowedSet = allowedParams !== undefined ? new Set(allowedParams.map((p) => p.toLowerCase())) : null

    const addIfValid = (key: string, val: string) => {
        const lowerKey = key.toLowerCase()
        if (isTrackingParam(lowerKey)) {
            return
        }
        if (allowedSet && !allowedSet.has(lowerKey)) {
            return
        }
        cleaned.append(key, val)
    }

    if (typeof params === 'string') {
        const source = new URLSearchParams(params.startsWith('?') ? params.slice(1) : params)
        source.forEach((val, key) => addIfValid(key, val))
    } else if (params instanceof URLSearchParams) {
        params.forEach((val, key) => addIfValid(key, val))
    } else {
        Object.entries(params).forEach(([key, val]) => {
            if (Array.isArray(val)) {
                val.forEach((v) => {
                    if (v !== undefined) addIfValid(key, String(v))
                })
            } else if (val !== undefined) {
                addIfValid(key, String(val))
            }
        })
    }

    return cleaned
}

/**
 * Returns the base URL of the site, normalized without trailing slash.
 */
export function getCanonicalBaseUrl(): string {
    const base = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://riwaya.store'
    return base.replace(/\/+$/, '')
}

function toAsciiCanonicalUrl(rawUrl: string): string {
    try {
        return new URL(rawUrl).toString()
    } catch {
        return encodeURI(rawUrl).replace(/[^\x20-\x7E]/g, '')
    }
}

/**
 * Generates an absolute canonical URL with all campaign and tracking parameters stripped.
 * If allowedParams is omitted, defaults to ['usedOnly'] on /books and [] on all other paths.
 */
export function getCanonicalUrl(
    pathname: string,
    searchParams?: URLSearchParams | Record<string, string | string[] | undefined> | string,
    allowedParams?: string[]
): string {
    const baseUrl = getCanonicalBaseUrl()
    const cleanPath = pathname.startsWith('/') ? pathname : `/${pathname}`
    const normalizedPath = cleanPath.length > 1 ? cleanPath.replace(/\/+$/, '') : cleanPath

    const effectiveAllowed =
        allowedParams !== undefined
            ? allowedParams
            : normalizedPath.endsWith('/books')
            ? ['usedOnly']
            : []

    const cleanedParams = cleanSearchParams(searchParams, effectiveAllowed)
    const queryString = cleanedParams.toString()

    const rawUrl = queryString ? `${baseUrl}${normalizedPath}?${queryString}` : `${baseUrl}${normalizedPath}`
    return toAsciiCanonicalUrl(rawUrl)
}

/**
 * Generates alternates metadata (canonical and hreflang languages) for Next.js Metadata.
 */
export function getCanonicalAlternates(
    pathname: string,
    currentLocale: string,
    searchParams?: URLSearchParams | Record<string, string | string[] | undefined> | string,
    allowedParams?: string[]
) {
    const cleanPath = pathname.startsWith('/') ? pathname : `/${pathname}`
    const normalizedPath = cleanPath.length > 1 ? cleanPath.replace(/\/+$/, '') : cleanPath

    const effectiveAllowed =
        allowedParams !== undefined
            ? allowedParams
            : normalizedPath.endsWith('/books')
            ? ['usedOnly']
            : []

    const cleanedParams = cleanSearchParams(searchParams, effectiveAllowed)
    const qs = cleanedParams.toString()
    const suffix = qs ? `?${qs}` : ''

    // Ensure path has current locale stripped to build alternates
    const pathWithoutLocale = normalizedPath.replace(/^\/(fr|ar|en)(\/|$)/, '$2')
    const normalized = pathWithoutLocale.startsWith('/') ? pathWithoutLocale : `/${pathWithoutLocale}`
    const leaf = normalized === '/' ? '' : normalized.replace(/\/+$/, '')

    const baseUrl = getCanonicalBaseUrl()

    return {
        canonical: `${baseUrl}/${currentLocale}${leaf}${suffix}`,
        languages: {
            'ar': `${baseUrl}/ar${leaf}${suffix}`,
            'fr': `${baseUrl}/fr${leaf}${suffix}`,
            'en': `${baseUrl}/en${leaf}${suffix}`,
            'x-default': `${baseUrl}/ar${leaf}${suffix}`,
        },
    }
}

/**
 * Builds RFC 5988 / RFC 6596 compliant Link header for canonical URLs.
 */
export function buildCanonicalLinkHeader(canonicalUrl: string): string {
    // Encodage ASCII obligatoire pour éviter le crash ByteString dans Headers.set() sur les slugs arabes
    return `<${toAsciiCanonicalUrl(canonicalUrl)}>; rel="canonical"`
}
