import 'server-only'

import { prisma } from '@/lib/prisma'
import { META_API_CONFIG_PATH } from '@/lib/server/meta-ads-client'

export const GOOGLE_ADS_API_VERSION = 'v17'
export const GOOGLE_ADS_API_BASE = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`

export interface GoogleAdsCredentials {
    missing: boolean
    customerId: string
    loginCustomerId: string
    developerToken: string
    refreshToken: string
    clientId: string
    clientSecret: string
}

const GOOGLE_ADS_SETTING_KEYS = [
    'google_ads_customer_id',
    'google_ads_login_customer_id',
    'google_ads_developer_token',
    'google_ads_refresh_token',
    'google_ads_client_id',
    'google_ads_client_secret',
] as const

export async function getGoogleAdsCredentials(
    overrides?: Partial<Omit<GoogleAdsCredentials, 'missing'>>
): Promise<GoogleAdsCredentials> {
    const rows = await prisma.siteSettings.findMany({
        where: { key: { in: [...GOOGLE_ADS_SETTING_KEYS] } },
    })
    const map = new Map(rows.map((r) => [r.key, (r.value || '').trim()]))

    const rawCustomerId = overrides?.customerId ?? map.get('google_ads_customer_id') ?? ''
    const rawLoginId = overrides?.loginCustomerId ?? map.get('google_ads_login_customer_id') ?? ''
    const customerId = rawCustomerId.replace(/-/g, '').trim()
    const loginCustomerId = rawLoginId.replace(/-/g, '').trim()
    const developerToken = (overrides?.developerToken ?? map.get('google_ads_developer_token') ?? '').trim()
    const refreshToken = (overrides?.refreshToken ?? map.get('google_ads_refresh_token') ?? '').trim()
    const clientId = (overrides?.clientId ?? map.get('google_ads_client_id') ?? '').trim()
    const clientSecret = (overrides?.clientSecret ?? map.get('google_ads_client_secret') ?? '').trim()

    const missing = !customerId || !developerToken || !refreshToken || !clientId || !clientSecret

    return {
        missing,
        customerId,
        loginCustomerId,
        developerToken,
        refreshToken,
        clientId,
        clientSecret,
    }
}

export async function exchangeGoogleAdsAccessToken(
    creds: GoogleAdsCredentials
): Promise<
    | { ok: true; accessToken: string }
    | { ok: false; errorCode: 'MISSING_CONFIG' | 'TOKEN_EXPIRED' | 'GOOGLE_API_ERROR'; configPath?: string; error: string }
> {
    if (creds.missing) {
        return {
            ok: false,
            errorCode: 'MISSING_CONFIG',
            configPath: META_API_CONFIG_PATH,
            error:
                'Identifiants Google Ads API incomplets (Customer ID, Developer Token, OAuth Client/Secret, Refresh Token) dans Config > API — ou utilisez le Script AdsApp.',
        }
    }

    try {
        const res = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: creds.clientId,
                client_secret: creds.clientSecret,
                refresh_token: creds.refreshToken,
                grant_type: 'refresh_token',
            }),
            signal: AbortSignal.timeout(12000),
        })
        const json = (await res.json().catch(() => ({}))) as {
            access_token?: string
            error?: string
            error_description?: string
        }

        if (!res.ok || !json.access_token) {
            const isRevoked = json.error === 'invalid_grant' || json.error === 'invalid_client'
            return {
                ok: false,
                errorCode: isRevoked ? 'TOKEN_EXPIRED' : 'GOOGLE_API_ERROR',
                configPath: META_API_CONFIG_PATH,
                error: `Échec OAuth2 Google Ads : ${json.error_description || json.error || `HTTP ${res.status}`}.`,
            }
        }

        return { ok: true, accessToken: json.access_token }
    } catch {
        return {
            ok: false,
            errorCode: 'GOOGLE_API_ERROR',
            error: 'Impossible de joindre oauth2.googleapis.com.',
        }
    }
}

