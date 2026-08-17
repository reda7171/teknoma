'use server'

import { getSetting } from './site-settings'
import { verifyAdmin } from './auth'

const FB_API_VERSION = 'v19.0'
const FB_API_BASE = `https://graph.facebook.com/${FB_API_VERSION}`

// Types
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

async function getFbCredentials() {
    const accessToken = await getSetting('fb_marketing_access_token')
    let adAccountId = await getSetting('fb_ad_account_id')
    const pageId = await getSetting('fb_page_id')
    const igUserId = await getSetting('ig_user_id')

    if (!accessToken || !adAccountId || !pageId) {
        throw new Error("Les identifiants API Facebook ne sont pas configurés.")
    }

    // Ensure adAccountId starts with 'act_'
    if (!adAccountId.startsWith('act_')) {
        adAccountId = `act_${adAccountId}`
    }

    return { accessToken, adAccountId, pageId, igUserId }
}

export async function launchFacebookAd(params: LaunchAdParams) {
    try {
        await verifyAdmin()
        const { accessToken, adAccountId, pageId, igUserId } = await getFbCredentials()

        // 1. Create Campaign
        const campaignObjective = params.objective || 'OUTCOME_TRAFFIC'
        const campaignPayload: any = {
            name: `[Riwaya] ${params.name}`,
            objective: campaignObjective,
            status: 'PAUSED',
            special_ad_categories: [],
            is_adset_budget_sharing_enabled: false,
            access_token: accessToken
        }

        const campaignRes = await fetch(`${FB_API_BASE}/${adAccountId}/campaigns`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(campaignPayload)
        })
        const campaignData = await campaignRes.json()
        if (campaignData.error) {
            console.error('FB API Campaign Error Details:', JSON.stringify(campaignData.error))
            throw new Error(`Erreur Création Campagne: ${campaignData.error.error_user_msg || campaignData.error.message}`)
        }
        const campaignId = campaignData.id

        // 2. Upload Image (from URL)
        let finalImageUrl = params.imageUrl
        if (finalImageUrl.startsWith('/')) {
            finalImageUrl = `https://riwaya.store${finalImageUrl}`
        }
        
        // Télécharger l'image pour l'envoyer en tant que fichier (bytes)
        const imgDownloadRes = await fetch(finalImageUrl)
        if (!imgDownloadRes.ok) {
            throw new Error("Impossible de télécharger l'image pour la publicité FB")
        }
        const imgBlob = await imgDownloadRes.blob()

        const imageFormData = new FormData()
        imageFormData.append('filename', imgBlob, 'ad_image.jpg')
        imageFormData.append('access_token', accessToken)

        const imageRes = await fetch(`${FB_API_BASE}/${adAccountId}/adimages`, {
            method: 'POST',
            body: imageFormData
        })
        const imageData = await imageRes.json()
        if (imageData.error) throw new Error(`Erreur Upload Image: ${imageData.error.message}`)
        const imageHash = imageData.images[Object.keys(imageData.images)[0]].hash

        // 3. Create Ad Set
        // Build targeting object
        const targetingObj: any = {
            geo_locations: {
                countries: ['MA'] // Maroc par défaut
            },
            age_min: params.targeting.age_min || 18,
            age_max: params.targeting.age_max || 65,
            publisher_platforms: igUserId ? ['facebook', 'instagram'] : ['facebook']
        }

        // Si des villes sont spécifiées, on ajoute au ciblage
        if (params.targeting.cities && params.targeting.cities.length > 0) {
            // Note: C'est complexe car il faut les IDs des villes Facebook.
            // Pour l'instant, si on veut cibler par ville sans les IDs exacts, 
            // il vaut mieux utiliser l'API Search de FB pour trouver les IDs des villes.
            // On va simplifier en gardant le pays entier par défaut si la résolution échoue.
            // (Voir fonction resolveCityIds plus bas - mockée pour l'instant)
        }

        const adSetFormData = new URLSearchParams()
        adSetFormData.append('name', `AdSet - ${params.name}`)
        
        // Map objective to optimization goal
        let optimizationGoal = 'LINK_CLICKS'
        if (campaignObjective === 'OUTCOME_SALES') optimizationGoal = 'OFFSITE_CONVERSIONS'
        else if (campaignObjective === 'OUTCOME_ENGAGEMENT') optimizationGoal = 'POST_ENGAGEMENT'
        
        adSetFormData.append('optimization_goal', optimizationGoal)
        
        adSetFormData.append('billing_event', 'IMPRESSIONS')
        adSetFormData.append('bid_strategy', 'LOWEST_COST_WITHOUT_CAP')
        // Convert daily budget from درهم to cents (FB expects lowest denomination)
        adSetFormData.append('daily_budget', (params.dailyBudgetMad * 100).toString()) 
        adSetFormData.append('campaign_id', campaignId)
        adSetFormData.append('targeting', JSON.stringify(targetingObj))
        adSetFormData.append('status', 'PAUSED')
        adSetFormData.append('access_token', accessToken)

        const adSetRes = await fetch(`${FB_API_BASE}/${adAccountId}/adsets`, {
            method: 'POST',
            body: adSetFormData
        })
        const adSetData = await adSetRes.json()
        if (adSetData.error) {
            console.error('AdSet Error details:', JSON.stringify(adSetData.error, null, 2))
            throw new Error(`Erreur Création AdSet: ${adSetData.error.error_user_msg || adSetData.error.message}`)
        }
        const adSetId = adSetData.id

        // 4. Create Ad Creative
        const creativeObj: any = {
            name: `Creative - ${params.name}`,
            object_story_spec: {
                page_id: pageId,
                link_data: {
                    image_hash: imageHash,
                    link: params.linkUrl,
                    message: params.primaryText,
                    name: params.headline
                }
            }
        }
        
        if (igUserId) {
            creativeObj.object_story_spec.instagram_actor_id = igUserId
        }

        const creativeFormData = new URLSearchParams()
        creativeFormData.append('name', `Creative - ${params.name}`)
        creativeFormData.append('object_story_spec', JSON.stringify(creativeObj.object_story_spec))
        creativeFormData.append('access_token', accessToken)

        const creativeRes = await fetch(`${FB_API_BASE}/${adAccountId}/adcreatives`, {
            method: 'POST',
            body: creativeFormData
        })
        const creativeData = await creativeRes.json()
        if (creativeData.error) {
            console.error('Creative Error details:', JSON.stringify(creativeData.error, null, 2))
            throw new Error(`Erreur Création Creative: ${creativeData.error.error_user_msg || creativeData.error.message}`)
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
            body: adFormData
        })
        const adData = await adRes.json()
        if (adData.error) {
            console.error('Ad Error details:', JSON.stringify(adData.error, null, 2))
            throw new Error(`Erreur Création Ad: ${adData.error.error_user_msg || adData.error.message}`)
        }

        return { 
            success: true, 
            campaignId, 
            adSetId, 
            adId: adData.id,
            message: "Publicité créée avec succès et mise en pause sur votre compte Facebook."
        }
    } catch (error: any) {
        console.error("Facebook Ads Error:", error)
        return { success: false, error: error.message || "Erreur inconnue" }
    }
}
