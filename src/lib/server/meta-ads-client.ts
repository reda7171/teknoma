import 'server-only'

import { getSetting } from '@/lib/server/site-settings'

export const META_GRAPH_API_VERSION = 'v19.0'
export const META_GRAPH_API_BASE = `https://graph.facebook.com/${META_GRAPH_API_VERSION}`
export const META_API_CONFIG_PATH = '/fr/admin/config/api'

export type MetaApiErrorCode = 'TOKEN_EXPIRED' | 'MISSING_CONFIG' | 'META_API_ERROR'

export interface MetaAdsCredentials {
    missing: boolean
    accessToken: string
    adAccountId: string
    pageId: string
    igUserId: string | null
    pixelId: string | null
}

/** Normalise l'identifiant du compte publicitaire Meta avec le préfixe `act_`. */
export function normalizeMetaAdAccountId(rawAdAccountId?: string | null): string {
    const cleaned = (rawAdAccountId || '').trim()
    if (!cleaned) return ''
    return cleaned.startsWith('act_') ? cleaned : `act_${cleaned}`
}

/** Charge les identifiants Meta Marketing API depuis `SiteSettings`. */
export async function getMetaAdsCredentials(requirePageId = true): Promise<MetaAdsCredentials> {
    const [accessToken, rawAdAccountId, pageId, igUserId, pixelId] = await Promise.all([
        getSetting('fb_marketing_access_token'),
        getSetting('fb_ad_account_id'),
        getSetting('fb_page_id'),
        getSetting('ig_user_id'),
        getSetting('facebook_pixel_id'),
    ])

    const adAccountId = normalizeMetaAdAccountId(rawAdAccountId)
    const missingPage = requirePageId && !pageId?.trim()

    if (!accessToken?.trim() || !adAccountId || missingPage) {
        return {
            missing: true,
            accessToken: '',
            adAccountId,
            pageId: pageId?.trim() || '',
            igUserId: null,
            pixelId: null,
        }
    }

    return {
        missing: false,
        accessToken: accessToken.trim(),
        adAccountId,
        pageId: pageId?.trim() || '',
        igUserId: igUserId?.trim() || null,
        pixelId: (pixelId || process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID || '').trim() || null,
    }
}

export interface MetaGraphErrorPayload {
    code?: number | string
    error_subcode?: number | string
    message?: string
    error_user_msg?: string
}

/** Classifie les erreurs Graph API (notamment OAuthException 190 pour token expiré). */
export function classifyMetaGraphError(step: string, fbError: MetaGraphErrorPayload | null | undefined): {
    success: false
    errorCode: MetaApiErrorCode
    configPath?: string
    error: string
} {
    const code = Number(fbError?.code)
    if (code === 190) {
        return {
            success: false,
            errorCode: 'TOKEN_EXPIRED',
            configPath: META_API_CONFIG_PATH,
            error:
                'Token Facebook Ads expiré ou invalide : générez un jeton permanent (Utilisateurs système > ads_management) dans Meta Business Manager puis mettez-le à jour dans Config > API.',
        }
    }
    const detail = fbError?.error_user_msg || fbError?.message || 'Erreur inconnue Graph API'
    return {
        success: false,
        errorCode: 'META_API_ERROR',
        error: `${step} : ${detail}`,
    }
}
