'use server'

import { prisma } from '@/lib/prisma'
import { verifyAdmin } from './auth'
import { executeWithModelFallback } from '@/lib/gemini'
import { getSetting } from '@/lib/server/site-settings'
import { createAuditLog } from '@/lib/server/audit'
import { STORE_POLICY } from '@/lib/constants/store-policy'
import { appendUtmParams, clampAdText } from '@/lib/utils/utm'

export type AdPlatformCampaignType = 'SEARCH' | 'PERFORMANCE_MAX' | 'META_ADS'
export type AdTargetLanguage = 'fr' | 'ar' | 'bilingual'

export interface GoogleAdsResponsiveAd {
    headlines: string[]
    descriptions: string[]
    finalUrl: string
    path1: string
    path2: string
}

export interface GoogleAdsAdGroup {
    name: string
    keywords: string[]
    negativeKeywords: string[]
    ad: GoogleAdsResponsiveAd
}

export interface GoogleAdsExtensionSitelink {
    text: string
    line1: string
    line2: string
    url: string
}

export interface MetaAdsCreativePlan {
    primaryText: string
    headline: string
    description: string
    callToAction: 'SHOP_NOW' | 'LEARN_MORE' | 'ORDER_NOW'
    objective: 'OUTCOME_SALES' | 'OUTCOME_TRAFFIC'
    destinationUrl: string
    imageUrl: string
    suggestedBookId?: string
    suggestedBookTitle?: string
    audienceInterests: string[]
    targetCities: string[]
}

export interface GoogleAdsCampaignPlan {
    campaignName: string
    campaignType: AdPlatformCampaignType
    targetLanguage?: AdTargetLanguage
    dailyBudgetMad: number
    strategySummary: string
    targetLocations: string[]
    adGroups: GoogleAdsAdGroup[]
    sitelinks: GoogleAdsExtensionSitelink[]
    callouts: string[]
    longHeadlines?: string[]
    businessName?: string
    merchantFeedUrl?: string
    audienceSignals?: string[]
    metaCreative?: MetaAdsCreativePlan
    googleAdsScript: string
    editorCsv: string
    generatedAt: string
}

function csvCell(value: unknown): string {
    return `"${String(value ?? '').replace(/"/g, '""')}"`
}

/**
 * Analyse les données du store (meilleures ventes, packs, catégories)
 */
export async function analyzeStoreMetrics() {
    await verifyAdmin()

    const [popularBooks, packs, categoryCounts, totalBooksCount] = await Promise.all([
        prisma.book.findMany({
            where: { active: true, stock: { gt: 0 } },
            orderBy: [{ views: 'desc' }, { cartAdditions: 'desc' }, { createdAt: 'desc' }],
            take: 8,
            select: {
                id: true,
                title: true,
                titleFr: true,
                author: true,
                price: true,
                category: true,
                stock: true,
                image: true,
            },
        }),
        prisma.pack.findMany({
            where: { active: true },
            take: 4,
            include: { books: { select: { book: { select: { title: true, price: true } } } } },
        }),
        prisma.book.groupBy({
            by: ['category'],
            where: { active: true },
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 6,
        }),
        prisma.book.count({ where: { active: true } }),
    ])

    return {
        totalBooksCount,
        popularBooks,
        packs: packs.map((p) => ({
            id: p.id,
            name: p.name,
            nameFr: p.nameFr,
            price: p.price,
            originalPrice: p.originalPrice,
            booksCount: p.books.length,
        })),
        topCategories: categoryCounts.map((c) => ({ category: c.category || 'Général', count: c._count.id })),
    }
}

function buildAdPrompt(params: {
    campaignType: AdPlatformCampaignType
    targetLanguage: AdTargetLanguage
    budget: number
    focus: string
    merchantFeedUrl: string
    storeData: Awaited<ReturnType<typeof analyzeStoreMetrics>>
}): string {
    const { campaignType, targetLanguage, budget, focus, merchantFeedUrl, storeData } = params
    const deliveryTerms = `Paiement à la livraison (Cash on Delivery / COD), livraison ${STORE_POLICY.deliveryMajorCitiesMinHours}-${STORE_POLICY.deliveryMajorCitiesMaxHours}h dans les grandes villes et ${STORE_POLICY.deliveryOtherRegionsHours} ailleurs au Maroc, tarif ${STORE_POLICY.shippingFeeMorocco} DH ou gratuit dès ${STORE_POLICY.freeShippingThreshold} DH`
    const langInstruction =
        targetLanguage === 'ar'
            ? 'Rédige les textes d\'annonces en arabe marocain/littéraire fluide orienté conversion.'
            : targetLanguage === 'bilingual'
                ? 'Propose des accroches et variantes bilingues français + arabe.'
                : 'Rédige les annonces en français naturel et orienté conversion.'

    const baseStoreBlock = `DONNÉES DU STORE RIWAYA (riwaya.store) :
- Total livres actifs : ${storeData.totalBooksCount}
- Top Livres populaires : ${JSON.stringify(storeData.popularBooks.map(({ image, ...rest }) => rest))}
- Top Packs promotionnels : ${JSON.stringify(storeData.packs)}
- Catégories leaders : ${JSON.stringify(storeData.topCategories)}
- Modalités de vente : ${deliveryTerms}
- Langue souhaitée : ${langInstruction}
- Budget quotidien cible : ${budget} MAD
- Orientation demandée : "${focus}"`

    if (campaignType === 'META_ADS') {
        return `Tu es un expert d'élite en acquisition Facebook & Instagram Ads (Meta Ads) e-commerce au Maroc.
${baseStoreBlock}

CONSIGNES STRICTES META ADS (FACEBOOK & INSTAGRAM FEED/REELS) :
1. Choisis le livre le plus vendeur dans Top Livres populaires ("suggestedBookId", "suggestedBookTitle") ou le catalogue si pertinent.
2. "primaryText" : accroche forte avec preuve sociale + offre COD (${STORE_POLICY.shippingFeeMorocco} DH / gratuit dès ${STORE_POLICY.freeShippingThreshold} DH), max 280 caractères.
3. "headline" : titre court percutant STRICT MAX 40 CARACTÈRES.
4. "description" : sous-titre court STRICT MAX 30 CARACTÈRES.
5. "audienceInterests" : 5 à 7 centres d'intérêt Meta ciblant les lecteurs marocains.
6. "targetCities" : 4 à 6 villes prioritaires au Maroc (ex: Casablanca, Rabat, Marrakech, Tanger, Fès).

RÉPONDS UNIQUEMENT AU FORMAT JSON STRICT (sans markdown) :
{
  "campaignName": "[Riwaya] Meta COD - Bestsellers Maroc",
  "dailyBudgetMad": ${budget},
  "strategySummary": "Campagne Meta Ads Feed/Stories optimisée achats COD avec ciblage lecteurs Maroc.",
  "targetLocations": ["Casablanca", "Rabat", "Marrakech", "Tanger"],
  "metaCreative": {
    "primaryText": "Texte principal accrocheur...",
    "headline": "Titre <= 40 car",
    "description": "Sous-titre <= 30 car",
    "callToAction": "SHOP_NOW",
    "objective": "OUTCOME_SALES",
    "destinationUrl": "https://riwaya.store/${targetLanguage === 'ar' ? 'ar' : 'fr'}/books",
    "suggestedBookId": "id_du_livre_si_applicable",
    "suggestedBookTitle": "Titre du livre",
    "audienceInterests": ["Lecture", "Romans", "Développement personnel", "Livres en ligne Maroc"],
    "targetCities": ["Casablanca", "Rabat", "Marrakech", "Tanger"]
  }
}`
    }

    if (campaignType === 'PERFORMANCE_MAX') {
        return `Tu es un expert d'élite en campagnes Google Ads Performance Max (PMax) e-commerce avec flux Google Merchant Center.
${baseStoreBlock}
- Flux Google Merchant Center actif : ${merchantFeedUrl}

CONSIGNES STRICTES GOOGLE ADS PERFORMANCE MAX :
1. 5 Titres courts : STRICT MAX 30 CARACTÈRES PAR TITRE.
2. 5 Titres longs : STRICT MAX 90 CARACTÈRES PAR TITRE LONG.
3. 5 Descriptions : 1 courte (<= 60 car.) et 4 longues (<= 90 car.).
4. Signaux d'audience ciblés au Maroc et script AdsApp JavaScript.

RÉPONDS UNIQUEMENT AU FORMAT JSON STRICT (sans markdown) :
{
  "campaignName": "[Riwaya] PMax - Catalogue Livres & Packs COD Maroc",
  "dailyBudgetMad": ${budget},
  "strategySummary": "Campagne Performance Max multi-canaux synchronisée avec le flux Google Merchant Center.",
  "targetLocations": ["Maroc", "Casablanca", "Rabat", "Marrakech", "Tanger", "Fès"],
  "businessName": "Riwaya",
  "audienceSignals": ["Acheteurs de livres Maroc", "Développement personnel", "Romans & Littérature"],
  "adGroups": [
    {
      "name": "Asset Group - Bestsellers & Packs",
      "keywords": ["livres maroc", "packs livres promo", "librairie en ligne maroc"],
      "negativeKeywords": ["[gratuit]", "[pdf gratuit]", "[telecharger]"],
      "ad": {
        "headlines": ["Riwaya Librairie Maroc", "Paiement à la Livraison", "Livraison 24-48h Maroc", "Packs Livres Promo", "Livres 100% Originaux"],
        "descriptions": ["Livres livrés partout au Maroc.", "Paiement à la livraison COD dès réception.", "Livraison gratuite dès 500 MAD au Maroc.", "Service client WhatsApp Mon-Sam 09h-19h."],
        "finalUrl": "https://riwaya.store/${targetLanguage === 'ar' ? 'ar' : 'fr'}/books",
        "path1": "Livres",
        "path2": "PMax-COD"
      }
    }
  ],
  "longHeadlines": ["La plus grande librairie en ligne au Maroc avec paiement à la livraison"],
  "sitelinks": [{ "text": "Catalogue Livres", "line1": "Des milliers de titres", "line2": "Paiement COD rapide", "url": "https://riwaya.store/fr/books" }],
  "callouts": ["Paiement à la livraison", "Livraison 24-48h Maroc", "Livres 100% neufs"],
  "googleAdsScript": "// Script PMax AdsApp..."
}`
    }

    return `Tu es un expert mondial en acquisition Google Ads Search (SEA) et e-commerce au Maroc.
${baseStoreBlock}

CONSIGNES STRICTES GOOGLE ADS SEARCH :
1. 2 ou 3 AdGroups ciblés sur l'intention d'achat COD au Maroc.
2. Par AdGroup : 12 à 15 "headlines" (STRICT MAX 30 CARACTÈRES), 4 "descriptions" (STRICT MAX 90 CARACTÈRES), mots-clés + négatifs ([pdf gratuit], [télécharger pdf]).
3. 4 Sitelinks (text <= 25 car., line1/line2 <= 35 car.) et 6 Callouts (<= 25 car.).
4. Script JavaScript AdsApp complet.

RÉPONDS UNIQUEMENT AU FORMAT JSON STRICT (sans markdown) :
{
  "campaignName": "[Riwaya] Search - Bestsellers & Packs COD Maroc",
  "dailyBudgetMad": ${budget},
  "strategySummary": "Campagne Search orientée conversions COD sur les titres phares et packs au Maroc.",
  "targetLocations": ["Maroc", "Casablanca", "Rabat", "Marrakech", "Tanger", "Fès"],
  "adGroups": [
    {
      "name": "Nom du groupe",
      "keywords": ["[livre maroc]", "\\"achat livre maroc\\"", "librairie en ligne maroc"],
      "negativeKeywords": ["[gratuit]", "[pdf gratuit]", "[telecharger]"],
      "ad": {
        "headlines": ["Riwaya Librairie Maroc", "Paiement à la Livraison"],
        "descriptions": ["Commandez vos livres favoris au Maroc. Paiement à la livraison sécurisé.", "Livraison 24-48h grandes villes. Gratuit dès 500 MAD d'achat."],
        "finalUrl": "https://riwaya.store/${targetLanguage === 'ar' ? 'ar' : 'fr'}/books",
        "path1": "Livres",
        "path2": "Paiement-COD"
      }
    }
  ],
  "sitelinks": [{ "text": "Packs Promo", "line1": "Packs livres à prix réduit", "line2": "Livraison 24-72h Maroc", "url": "https://riwaya.store/fr/packs" }],
  "callouts": ["Paiement à la livraison", "Livraison 24-48h Maroc", "Livres 100% originaux"],
  "googleAdsScript": "// Script JavaScript AdsApp..."
}`
}

/**
 * Analyse le store avec Gemini et génère une campagne Google Ads ou Meta Ads complète avec UTM automatiques
 */
export async function generateGoogleAdsCampaignWithGemini(params?: {
    customFocus?: string
    dailyBudgetMad?: number
    campaignType?: AdPlatformCampaignType
    targetLanguage?: AdTargetLanguage
}): Promise<{ success: boolean; data?: GoogleAdsCampaignPlan; error?: string }> {
    try {
        await verifyAdmin()
        const storeData = await analyzeStoreMetrics()

        const budget = Math.max(20, Math.min(5000, params?.dailyBudgetMad || 150))
        const focus = params?.customFocus || 'Bestsellers littéraires, packs de livres et développement personnel au Maroc'
        const campaignType: AdPlatformCampaignType = params?.campaignType || 'SEARCH'
        const targetLanguage: AdTargetLanguage = params?.targetLanguage || 'fr'
        const merchantFeedUrl = 'https://riwaya.store/api/feeds/google-merchant'

        const prompt = buildAdPrompt({
            campaignType,
            targetLanguage,
            budget,
            focus,
            merchantFeedUrl,
            storeData,
        })

        const responseText = await executeWithModelFallback(async (model) => {
            const result = await model.generateContent(prompt)
            return result.response.text()
        })

        const cleaned = responseText
            .trim()
            .replace(/^```json\s*/i, '')
            .replace(/^```\s*/i, '')
            .replace(/\s*```$/i, '')
            .trim()

        const firstBrace = cleaned.indexOf('{')
        const lastBrace = cleaned.lastIndexOf('}')
        const jsonSlice = firstBrace !== -1 && lastBrace > firstBrace ? cleaned.slice(firstBrace, lastBrace + 1) : cleaned
        const parsed = JSON.parse(jsonSlice)

        const campaignName =
            parsed.campaignName ||
            `[Riwaya] ${campaignType === 'META_ADS' ? 'Meta COD' : campaignType === 'PERFORMANCE_MAX' ? 'PMax' : 'Search'} Maroc`

        const utmSource = campaignType === 'META_ADS' ? 'facebook' : 'google'
        const utmMedium = campaignType === 'META_ADS' ? 'paid_social' : 'cpc'

        // Normalisation stricte des longueurs Google Ads et injection UTM automatique
        const normalizedAdGroups: GoogleAdsAdGroup[] = (parsed.adGroups || []).map((ag: any) => ({
            name: String(ag.name || 'Groupe Riwaya'),
            keywords: Array.isArray(ag.keywords) ? ag.keywords.map(String) : [],
            negativeKeywords: Array.isArray(ag.negativeKeywords) ? ag.negativeKeywords.map(String) : [],
            ad: {
                headlines: (ag.ad?.headlines || ['Riwaya Librairie Maroc', 'Paiement à la Livraison'])
                    .map((h: string) => clampAdText(h, 30))
                    .filter(Boolean),
                descriptions: (ag.ad?.descriptions || ['Commandez vos livres au Maroc. Paiement à la livraison sécurisé.'])
                    .map((d: string) => clampAdText(d, 90))
                    .filter(Boolean),
                finalUrl: appendUtmParams(ag.ad?.finalUrl || 'https://riwaya.store/fr/books', {
                    source: utmSource,
                    medium: utmMedium,
                    campaign: campaignName,
                    content: ag.name || 'adgroup',
                }),
                path1: clampAdText(ag.ad?.path1 || 'Livres', 15),
                path2: clampAdText(ag.ad?.path2 || 'Maroc-COD', 15),
            },
        }))

        const normalizedSitelinks: GoogleAdsExtensionSitelink[] = (parsed.sitelinks || []).map((sl: any) => ({
            text: clampAdText(sl.text || 'Catalogue Livres', 25),
            line1: clampAdText(sl.line1 || 'Large choix de livres', 35),
            line2: clampAdText(sl.line2 || `Livraison ${STORE_POLICY.deliveryMajorCitiesMinHours}-${STORE_POLICY.deliveryMajorCitiesMaxHours}h Maroc`, 35),
            url: appendUtmParams(sl.url || 'https://riwaya.store/fr/books', {
                source: utmSource,
                medium: utmMedium,
                campaign: campaignName,
                content: sl.text || 'sitelink',
            }),
        }))

        const normalizedLongHeadlines: string[] = (parsed.longHeadlines || [])
            .map((lh: string) => clampAdText(lh, 90))
            .filter(Boolean)

        const normalizedCallouts: string[] = (parsed.callouts || [])
            .map((c: string) => clampAdText(c, 25))
            .filter(Boolean)

        // Génération dédiée Meta Ads avec visuel catalogue réel + URL UTM
        let metaCreative: MetaAdsCreativePlan | undefined
        if (campaignType === 'META_ADS') {
            const rawMeta = parsed.metaCreative || {}
            const matchedBook =
                storeData.popularBooks.find((b) => b.id === rawMeta.suggestedBookId) ||
                storeData.popularBooks[0]

            const rawBookUrl = matchedBook
                ? `https://riwaya.store/${targetLanguage === 'ar' ? 'ar' : 'fr'}/books/${matchedBook.id}`
                : rawMeta.destinationUrl || 'https://riwaya.store/fr/books'

            metaCreative = {
                primaryText: String(
                    rawMeta.primaryText ||
                        `Découvrez ${matchedBook ? matchedBook.title : 'nos bestsellers'} sur Riwaya. Livraison ${STORE_POLICY.deliveryMajorCitiesMinHours}-${STORE_POLICY.deliveryMajorCitiesMaxHours}h partout au Maroc, paiement à la livraison.`
                ).trim(),
                headline: clampAdText(rawMeta.headline || (matchedBook ? matchedBook.title : 'Commandez votre livre (COD)'), 40),
                description: clampAdText(rawMeta.description || 'Paiement à la livraison Maroc', 30),
                callToAction: rawMeta.callToAction === 'LEARN_MORE' ? 'LEARN_MORE' : 'SHOP_NOW',
                objective: rawMeta.objective === 'OUTCOME_TRAFFIC' ? 'OUTCOME_TRAFFIC' : 'OUTCOME_SALES',
                destinationUrl: appendUtmParams(rawBookUrl, {
                    source: 'facebook',
                    medium: 'paid_social',
                    campaign: campaignName,
                    content: matchedBook?.id || 'meta-feed',
                }),
                imageUrl: matchedBook?.image || '/img/hero-books.webp',
                suggestedBookId: matchedBook?.id,
                suggestedBookTitle: matchedBook?.title || rawMeta.suggestedBookTitle,
                audienceInterests: Array.isArray(rawMeta.audienceInterests) ? rawMeta.audienceInterests.map(String) : ['Lecture', 'Romans'],
                targetCities: Array.isArray(rawMeta.targetCities) ? rawMeta.targetCities.map(String) : ['Casablanca', 'Rabat'],
            }
        }

        // Générer le CSV échappé proprement
        let csvLines: string[] = []
        if (campaignType === 'META_ADS' && metaCreative) {
            csvLines = [
                'Campaign,Objective,Headline,Primary Text,Description,Destination URL (UTM),Target Cities,Daily Budget MAD',
                [
                    csvCell(campaignName),
                    csvCell(metaCreative.objective),
                    csvCell(metaCreative.headline),
                    csvCell(metaCreative.primaryText),
                    csvCell(metaCreative.description),
                    csvCell(metaCreative.destinationUrl),
                    csvCell(metaCreative.targetCities.join(', ')),
                    csvCell(parsed.dailyBudgetMad || budget),
                ].join(','),
            ]
        } else if (campaignType === 'PERFORMANCE_MAX') {
            csvLines = [
                'Campaign,Campaign Type,Asset Group,Headline 1,Headline 2,Long Headline,Description 1,Description 2,Business Name,Final URL',
            ]
            for (const ag of normalizedAdGroups) {
                csvLines.push(
                    [
                        csvCell(campaignName),
                        csvCell('Performance Max'),
                        csvCell(ag.name),
                        csvCell(ag.ad.headlines[0] || 'Riwaya Librairie'),
                        csvCell(ag.ad.headlines[1] || 'Paiement à la livraison'),
                        csvCell(normalizedLongHeadlines[0] || 'Achetez vos livres au Maroc avec paiement à la livraison'),
                        csvCell(ag.ad.descriptions[0] || 'Livres et romans livrés partout au Maroc.'),
                        csvCell(ag.ad.descriptions[1] || 'Paiement à la livraison COD. Service client WhatsApp.'),
                        csvCell(parsed.businessName || 'Riwaya'),
                        csvCell(ag.ad.finalUrl),
                    ].join(',')
                )
            }
        } else {
            csvLines = [
                'Campaign,Ad Group,Keyword,Criterion Type,Headline 1,Headline 2,Headline 3,Description 1,Description 2,Final URL',
            ]
            for (const ag of normalizedAdGroups) {
                for (const kw of ag.keywords) {
                    let matchType = 'Broad'
                    let cleanKw = kw
                    if (kw.startsWith('[') && kw.endsWith(']')) {
                        matchType = 'Exact'
                        cleanKw = kw.slice(1, -1)
                    } else if (kw.startsWith('"') && kw.endsWith('"')) {
                        matchType = 'Phrase'
                        cleanKw = kw.slice(1, -1)
                    }
                    csvLines.push(
                        [
                            csvCell(campaignName),
                            csvCell(ag.name),
                            csvCell(cleanKw),
                            csvCell(matchType),
                            csvCell(ag.ad.headlines[0] || 'Riwaya Librairie Maroc'),
                            csvCell(ag.ad.headlines[1] || 'Paiement à la Livraison'),
                            csvCell(ag.ad.headlines[2] || `Livraison ${STORE_POLICY.deliveryMajorCitiesMinHours}-${STORE_POLICY.deliveryMajorCitiesMaxHours}h Maroc`),
                            csvCell(ag.ad.descriptions[0] || 'Commandez vos livres favoris au Maroc. Paiement à la livraison sécurisé.'),
                            csvCell(ag.ad.descriptions[1] || 'Large catalogue de romans et essais. Livraison offerte dès 500 MAD.'),
                            csvCell(ag.ad.finalUrl),
                        ].join(',')
                    )
                }
            }
        }

        const editorCsv = csvLines.join('\n')

        const plan: GoogleAdsCampaignPlan = {
            campaignName,
            campaignType,
            targetLanguage,
            dailyBudgetMad: parsed.dailyBudgetMad || budget,
            strategySummary: parsed.strategySummary || 'Campagne publicitaire optimisée pour le paiement à la livraison au Maroc.',
            targetLocations: parsed.targetLocations || ['Maroc'],
            adGroups: normalizedAdGroups,
            sitelinks: normalizedSitelinks,
            callouts: normalizedCallouts,
            longHeadlines: normalizedLongHeadlines,
            businessName: parsed.businessName || 'Riwaya',
            merchantFeedUrl,
            audienceSignals: parsed.audienceSignals || [],
            metaCreative,
            googleAdsScript: parsed.googleAdsScript || generateDefaultAdsScript({ ...parsed, campaignName }, campaignType, merchantFeedUrl),
            editorCsv,
            generatedAt: new Date().toISOString(),
        }

        await createAuditLog({
            action: 'CREATE',
            entity: 'CAMPAIGN',
            details: `Génération automatique campagne (${campaignType}) avec Gemini: ${plan.campaignName}`,
        })

        return { success: true, data: plan }
    } catch (error: any) {
        console.error('Error in generateGoogleAdsCampaignWithGemini:', error)
        return { success: false, error: error?.message || 'Erreur lors de l analyse IA Gemini' }
    }
}

function generateDefaultAdsScript(campaign: any, type: string, feedUrl: string): string {
    return `// ===================================================================
// Riwaya.store - Script de création Ads Automatisé (${type})
// Flux Merchant Center associé : ${feedUrl}
// ===================================================================

function main() {
  Logger.log("Campagne : ${campaign.campaignName || 'Riwaya'}");
  Logger.log("Budget quotidien recommandé : ${campaign.dailyBudgetMad || 150} MAD");
  Logger.log("Flux Google Merchant Center : ${feedUrl}");
}
`
}

/**
 * Lancement direct via Google Ads REST API (v17) avec échange OAuth réel si configuré
 */
export async function launchGoogleAdsApiCampaign(campaign: GoogleAdsCampaignPlan) {
    await verifyAdmin()

    const [customerId, developerToken, refreshToken, clientId, clientSecret] = await Promise.all([
        getSetting('google_ads_customer_id'),
        getSetting('google_ads_developer_token'),
        getSetting('google_ads_refresh_token'),
        getSetting('google_ads_client_id'),
        getSetting('google_ads_client_secret'),
    ])

    const missing: string[] = []
    if (!customerId) missing.push('Customer ID')
    if (!developerToken) missing.push('Developer Token')
    if (!refreshToken) missing.push('Refresh Token')
    if (!clientId) missing.push('OAuth Client ID')
    if (!clientSecret) missing.push('OAuth Client Secret')

    if (missing.length > 0) {
        return {
            success: false,
            mode: 'MANUAL_OR_SCRIPT',
            message: `Identifiants Google Ads API incomplets (${missing.join(', ')}). Utilisez le Script AdsApp en 1 clic ou l'export CSV Google Ads Editor.`,
            script: campaign.googleAdsScript,
            editorCsv: campaign.editorCsv,
        }
    }

    try {
        // 1. Échanger le refreshToken contre un access_token OAuth2 valide
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: clientId!,
                client_secret: clientSecret!,
                refresh_token: refreshToken!,
                grant_type: 'refresh_token',
            }),
        })
        const tokenJson = await tokenRes.json().catch(() => ({}))
        if (!tokenRes.ok || !tokenJson.access_token) {
            return {
                success: false,
                mode: 'OAUTH_ERROR',
                message: `Échec authentification OAuth2 Google Ads : ${tokenJson.error_description || tokenJson.error || tokenRes.status}.`,
            }
        }

        // 2. Créer le budget (en MAD * 1_000_000 micros) pour vérifier l'accès réel REST v17
        const cleanCustomerId = customerId!.replace(/-/g, '').trim()
        const budgetRes = await fetch(
            `https://googleads.googleapis.com/v17/customers/${encodeURIComponent(cleanCustomerId)}/campaignBudgets:mutate`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${tokenJson.access_token}`,
                    'developer-token': developerToken!.trim(),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    operations: [
                        {
                            create: {
                                name: `${campaign.campaignName} Budget #${Date.now()}`,
                                amountMicros: String(Math.round((campaign.dailyBudgetMad || 150) * 1_000_000)),
                                deliveryMethod: 'STANDARD',
                            },
                        },
                    ],
                }),
            }
        )

        const budgetData = await budgetRes.json().catch(() => ({}))
        if (!budgetRes.ok) {
            const apiMsg = budgetData?.error?.message || `HTTP ${budgetRes.status}`
            return {
                success: false,
                mode: 'API_ERROR',
                message: `Refus API Google Ads v17 : ${apiMsg}. Utilisez le CSV Editor ou le script AdsApp en attendant l'approbation.`,
            }
        }

        await createAuditLog({
            action: 'CREATE',
            entity: 'CAMPAIGN',
            details: `Budget Google Ads créé via REST v17 (${cleanCustomerId}) pour ${campaign.campaignName}`,
        })

        return {
            success: true,
            mode: 'API_CONNECTED',
            message: `Budget de ${campaign.dailyBudgetMad} MAD créé sur le compte Google Ads ${customerId}. Finalisez la mise en ligne via Ads Editor CSV ou Script.`,
        }
    } catch (err: any) {
        return {
            success: false,
            mode: 'ERROR',
            message: err?.message || 'Erreur lors de la communication avec l API Google Ads',
        }
    }
}

/**
 * Déclenchement manuel du rapport hebdomadaire Google Ads COD vers Telegram depuis le dashboard admin
 */
export async function triggerWeeklyGoogleAdsTelegramReportAction() {
    await verifyAdmin()
    const { sendWeeklyGoogleAdsCodReport } = await import('@/lib/server/google-ads-reporting')
    return sendWeeklyGoogleAdsCodReport(7)
}

/**
 * Teste la connectivité Google Ads REST v17 (Customer ID, OAuth2, Developer Token).
 */
export async function testGoogleAdsConnectionAction(overrides?: {
    customerId?: string
    loginCustomerId?: string
    developerToken?: string
    refreshToken?: string
    clientId?: string
    clientSecret?: string
}) {
    await verifyAdmin()
    const { testGoogleAdsConnection } = await import('@/lib/server/google-ads-insights')
    return testGoogleAdsConnection(overrides)
}
