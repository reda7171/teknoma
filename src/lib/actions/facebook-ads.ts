'use server'

import fs from 'fs/promises'
import path from 'path'
import { createAuditLog } from '@/lib/server/audit'
import { appendUtmParams } from '@/lib/utils/utm'
import {
    META_GRAPH_API_BASE as FB_API_BASE,
    META_API_CONFIG_PATH as API_CONFIG_PATH,
    getMetaAdsCredentials,
    classifyMetaGraphError as classifyMetaError,
} from '@/lib/server/meta-ads-client'
import { verifyAdmin } from './auth'

export interface AdTargeting {
    cities?: { name: string }[]
    age_min?: number
    age_max?: number
}

export interface LaunchAdParams {
    name: string
    dailyBudgetMad: number
    primaryText: string
    headline: string
    linkUrl: string
    imageUrl: string
    objective?: string
    targeting: AdTargeting
}

export interface FacebookAdResult {
    success: boolean
    errorCode?: 'TOKEN_EXPIRED' | 'MISSING_CONFIG' | 'META_API_ERROR'
    configPath?: string
    error?: string
    campaignId?: string
    adSetId?: string
    adId?: string
    trackedLinkUrl?: string
    message?: string
}

/** Charge les octets de l'image depuis public/uploads (local) ou via HTTP encodé pour les noms arabes/UTF-8. */
async function loadAdImageBlob(imageUrl: string): Promise<Blob> {
    const cleanUrl = imageUrl.trim()
    if (cleanUrl.startsWith('/uploads/')) {
        const uploadsRoot = path.resolve(process.cwd(), 'public', 'uploads')
        let decodedRel = cleanUrl.slice('/uploads/'.length)
        try {
            decodedRel = decodeURIComponent(decodedRel)
        } catch {
            // Garder tel quel si non encodé
        }
        const resolvedPath = path.resolve(uploadsRoot, decodedRel)
        if (resolvedPath.startsWith(uploadsRoot + path.sep)) {
            try {
                const fileBuffer = await fs.readFile(resolvedPath)
                const ext = path.extname(resolvedPath).toLowerCase()
                const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg'
                return new Blob([new Uint8Array(fileBuffer)], { type: mime })
            } catch {
                // Repli HTTP ci-dessous si absent du disque local
            }
        }
    }

    const remoteUrl = cleanUrl.startsWith('/') ? encodeURI(`https://riwaya.store${cleanUrl}`) : encodeURI(cleanUrl)
    const imgDownloadRes = await fetch(remoteUrl)
    if (!imgDownloadRes.ok) {
        throw new Error("Impossible de télécharger l'image pour la publicité Meta")
    }
    return imgDownloadRes.blob()
}

/** Résout les identifiants Meta adgeolocation pour les villes marocaines sélectionnées. */
async function resolveMetaCityKeys(
    cityNames: string[],
    accessToken: string
): Promise<Array<{ key: string; name: string }>> {
    const resolved: Array<{ key: string; name: string }> = []
    for (const rawCity of cityNames.slice(0, 10)) {
        try {
            const url = `${FB_API_BASE}/search?type=adgeolocation&location_types=${encodeURIComponent(JSON.stringify(['city']))}&country_code=MA&q=${encodeURIComponent(rawCity)}&limit=1&access_token=${encodeURIComponent(accessToken)}`
            const res = await fetch(url)
            if (!res.ok) continue
            const json = await res.json()
            const match = Array.isArray(json?.data) ? json.data[0] : null
            if (match?.key) {
                resolved.push({ key: String(match.key), name: String(match.name || rawCity) })
            }
        } catch {
            // Ignorer la ville non résolue
        }
    }
    return resolved
}

/** Vérifie la validité du token Meta Ads API (sans créer de campagne). */
export async function testFacebookMarketingToken(overrideToken?: string, overrideAdAccountId?: string) {
    await verifyAdmin()
    const creds = await getMetaAdsCredentials(false)
    const token = (overrideToken ?? creds.accessToken).trim()
    const rawAccount = (overrideAdAccountId ?? creds.adAccountId).trim()
    const adAccountId = rawAccount ? (rawAccount.startsWith('act_') ? rawAccount : `act_${rawAccount}`) : ''

    if (!token) {
        return { success: false, error: 'Access Token Meta Marketing manquant.' }
    }

    try {
        const meRes = await fetch(`${FB_API_BASE}/me?fields=id,name&access_token=${encodeURIComponent(token)}`)
        const meJson = await meRes.json()
        if (meJson.error) {
            return classifyMetaError('Validation Token Meta', meJson.error)
        }

        if (adAccountId) {
            const accRes = await fetch(
                `${FB_API_BASE}/${encodeURIComponent(adAccountId)}?fields=name,account_status,currency&access_token=${encodeURIComponent(token)}`
            )
            const accJson = await accRes.json()
            if (accJson.error) {
                return classifyMetaError('Vérification Compte Pub', accJson.error)
            }
            return {
                success: true,
                message: `Token valide (${meJson.name || 'OK'}) — Compte "${accJson.name || adAccountId}" (${accJson.currency || 'MAD'}).`,
            }
        }

        return {
            success: true,
            message: `Token valide pour "${meJson.name || meJson.id}".`,
        }
    } catch {
        return { success: false, error: 'Impossible de joindre graph.facebook.com.' }
    }
}

export async function launchFacebookAd(params: LaunchAdParams): Promise<FacebookAdResult> {
    try {
        await verifyAdmin()
        const creds = await getMetaAdsCredentials(true)
        if (creds.missing) {
            return {
                success: false,
                errorCode: 'MISSING_CONFIG',
                configPath: API_CONFIG_PATH,
                error: 'Les identifiants API Facebook (Token, Ad Account ID, Page ID) ne sont pas configurés dans Config > API.',
            }
        }

        const { accessToken, adAccountId, pageId, igUserId, pixelId } = creds

        const campaignObjective = params.objective || 'OUTCOME_TRAFFIC'
        if (campaignObjective === 'OUTCOME_SALES' && !pixelId) {
            return {
                success: false,
                errorCode: 'MISSING_CONFIG',
                configPath: API_CONFIG_PATH,
                error: "L'objectif Ventes (OUTCOME_SALES) nécessite un Facebook Pixel ID configuré dans Config > API.",
            }
        }

        // Pré-valider le token et préparer l'image AVANT de créer la campagne pour éviter les campagnes orphelines
        const tokenCheck = await fetch(`${FB_API_BASE}/me?fields=id&access_token=${encodeURIComponent(accessToken)}`)
        const tokenJson = await tokenCheck.json()
        if (tokenJson.error) {
            return classifyMetaError('Validation Token Meta', tokenJson.error)
        }

        const imgBlob = await loadAdImageBlob(params.imageUrl)

        const trackedLinkUrl = appendUtmParams(params.linkUrl, {
            source: 'facebook',
            medium: 'paid_social',
            campaign: params.name,
        })

        // 1. Create Campaign (en pause par sécurité)
        const campaignPayload = {
            name: `[Riwaya] ${params.name}`,
            objective: campaignObjective,
            status: 'PAUSED',
            special_ad_categories: [],
            is_adset_budget_sharing_enabled: false,
            access_token: accessToken,
        }

        const campaignRes = await fetch(`${FB_API_BASE}/${adAccountId}/campaigns`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(campaignPayload),
        })
        const campaignData = await campaignRes.json()
        if (campaignData.error) {
            return classifyMetaError('Erreur Création Campagne', campaignData.error)
        }
        const campaignId = campaignData.id

        // 2. Upload Image
        const imageFormData = new FormData()
        imageFormData.append('filename', imgBlob, 'ad_image.jpg')
        imageFormData.append('access_token', accessToken)

        const imageRes = await fetch(`${FB_API_BASE}/${adAccountId}/adimages`, {
            method: 'POST',
            body: imageFormData,
        })
        const imageData = await imageRes.json()
        if (imageData.error) {
            return classifyMetaError('Erreur Upload Image', imageData.error)
        }
        const imageHash = imageData.images[Object.keys(imageData.images)[0]].hash

        // 3. Create Ad Set avec ciblage villes
        const requestedCities = (params.targeting.cities || []).map((c) => c.name).filter(Boolean)
        const resolvedCities = requestedCities.length > 0 ? await resolveMetaCityKeys(requestedCities, accessToken) : []

        const geoLocations: Record<string, any> =
            resolvedCities.length > 0
                ? { cities: resolvedCities.map((c) => ({ key: c.key })) }
                : { countries: ['MA'] }

        const targetingObj: Record<string, any> = {
            geo_locations: geoLocations,
            age_min: params.targeting.age_min || 18,
            age_max: params.targeting.age_max || 65,
            publisher_platforms: igUserId ? ['facebook', 'instagram'] : ['facebook'],
        }

        const adSetFormData = new URLSearchParams()
        adSetFormData.append('name', `AdSet - ${params.name}`)

        let optimizationGoal = 'LINK_CLICKS'
        if (campaignObjective === 'OUTCOME_SALES') optimizationGoal = 'OFFSITE_CONVERSIONS'
        else if (campaignObjective === 'OUTCOME_ENGAGEMENT') optimizationGoal = 'POST_ENGAGEMENT'

        adSetFormData.append('optimization_goal', optimizationGoal)
        if (campaignObjective === 'OUTCOME_SALES' && pixelId) {
            adSetFormData.append(
                'promoted_object',
                JSON.stringify({ pixel_id: pixelId, custom_event_type: 'PURCHASE' })
            )
        }
        adSetFormData.append('billing_event', 'IMPRESSIONS')
        adSetFormData.append('bid_strategy', 'LOWEST_COST_WITHOUT_CAP')
        adSetFormData.append('daily_budget', Math.round(params.dailyBudgetMad * 100).toString())
        adSetFormData.append('campaign_id', campaignId)
        adSetFormData.append('targeting', JSON.stringify(targetingObj))
        adSetFormData.append('status', 'PAUSED')
        adSetFormData.append('access_token', accessToken)

        const adSetRes = await fetch(`${FB_API_BASE}/${adAccountId}/adsets`, {
            method: 'POST',
            body: adSetFormData,
        })
        const adSetData = await adSetRes.json()
        if (adSetData.error) {
            return classifyMetaError('Erreur Création AdSet', adSetData.error)
        }
        const adSetId = adSetData.id

        // 4. Create Ad Creative avec URL traquée UTM
        const objectStorySpec: Record<string, any> = {
            page_id: pageId,
            link_data: {
                image_hash: imageHash,
                link: trackedLinkUrl,
                message: params.primaryText,
                name: params.headline,
                call_to_action: { type: 'SHOP_NOW', value: { link: trackedLinkUrl } },
            },
        }
        if (igUserId) {
            objectStorySpec.instagram_actor_id = igUserId
        }

        const creativeFormData = new URLSearchParams()
        creativeFormData.append('name', `Creative - ${params.name}`)
        creativeFormData.append('object_story_spec', JSON.stringify(objectStorySpec))
        creativeFormData.append('access_token', accessToken)

        const creativeRes = await fetch(`${FB_API_BASE}/${adAccountId}/adcreatives`, {
            method: 'POST',
            body: creativeFormData,
        })
        const creativeData = await creativeRes.json()
        if (creativeData.error) {
            return classifyMetaError('Erreur Création Creative', creativeData.error)
        }
        const creativeId = creativeData.id

        // 5. Create Ad
        const adFormData = new URLSearchParams()
        adFormData.append('name', `Ad - ${params.name}`)
        adFormData.append('adset_id', adSetId)
        adFormData.append('creative', JSON.stringify({ creative_id: creativeId }))
        adFormData.append('status', 'PAUSED')
        adFormData.append('access_token', accessToken)

        const adRes = await fetch(`${FB_API_BASE}/${adAccountId}/ads`, {
            method: 'POST',
            body: adFormData,
        })
        const adData = await adRes.json()
        if (adData.error) {
            return classifyMetaError('Erreur Création Ad', adData.error)
        }

        await createAuditLog({
            action: 'CREATE',
            entity: 'CAMPAIGN',
            entityId: campaignId,
            details: `Campagne Meta Ads créée (PAUSED, villes: ${resolvedCities.map((c) => c.name).join(', ') || 'MA'}) : ${params.name}`,
        })

        return {
            success: true,
            campaignId,
            adSetId,
            adId: adData.id,
            trackedLinkUrl,
            message: 'Publicité Meta créée avec succès (en pause pour contrôle final avant activation).',
        }
    } catch (error: any) {
        return { success: false, errorCode: 'META_API_ERROR', error: error.message || 'Erreur inconnue' }
    }
}
