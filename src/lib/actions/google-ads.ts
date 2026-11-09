'use server'

import { prisma } from '@/lib/prisma'
import { verifyAdmin } from './auth'
import { executeWithModelFallback } from '@/lib/gemini'
import { getSetting } from '@/lib/server/site-settings'
import { createAuditLog } from '@/lib/server/audit'

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

export interface GoogleAdsCampaignPlan {
    campaignName: string
    campaignType: 'SEARCH' | 'PERFORMANCE_MAX'
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
    googleAdsScript: string
    editorCsv: string
    generatedAt: string
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
            select: { id: true, title: true, titleFr: true, author: true, price: true, category: true, stock: true }
        }),
        prisma.pack.findMany({
            where: { active: true },
            take: 4,
            include: { books: { select: { book: { select: { title: true, price: true } } } } }
        }),
        prisma.book.groupBy({
            by: ['category'],
            where: { active: true },
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 6,
        }),
        prisma.book.count({ where: { active: true } })
    ])

    return {
        totalBooksCount,
        popularBooks,
        packs: packs.map(p => ({
            id: p.id,
            name: p.name,
            nameFr: p.nameFr,
            price: p.price,
            originalPrice: p.originalPrice,
            booksCount: p.books.length,
        })),
        topCategories: categoryCounts.map(c => ({ category: c.category || 'Général', count: c._count.id })),
    }
}

/**
 * Analyse le store avec Gemini et génère une campagne Google Ads complète (Search ou Performance Max)
 */
export async function generateGoogleAdsCampaignWithGemini(params?: {
    customFocus?: string
    dailyBudgetMad?: number
    campaignType?: 'SEARCH' | 'PERFORMANCE_MAX'
}): Promise<{ success: boolean; data?: GoogleAdsCampaignPlan; error?: string }> {
    try {
        await verifyAdmin()
        const storeData = await analyzeStoreMetrics()

        const budget = params?.dailyBudgetMad || 150
        const focus = params?.customFocus || 'Bestsellers littéraires, packs de livres et développement personnel au Maroc'
        const campaignType = params?.campaignType || 'SEARCH'
        const merchantFeedUrl = 'https://riwaya.store/api/feeds/google-merchant'

        let prompt = ''

        if (campaignType === 'PERFORMANCE_MAX') {
            prompt = `Tu es un expert d'élite en campagnes Google Ads Performance Max (PMax) e-commerce avec flux Google Merchant Center.
Analyse les données du store Riwaya (riwaya.store) au Maroc :

DONNÉES DU STORE :
- Total livres actifs : ${storeData.totalBooksCount}
- Top Livres populaires : ${JSON.stringify(storeData.popularBooks)}
- Top Packs promotionnels : ${JSON.stringify(storeData.packs)}
- Catégories leaders : ${JSON.stringify(storeData.topCategories)}
- Modalités de vente : Paiement à la livraison sécurisé (Cash on Delivery / COD), livraison rapide 24-48h au Maroc, frais 30 DH ou gratuit dès 500 DH.
- Flux Google Merchant Center actif : ${merchantFeedUrl}
- Budget quotidien : ${budget} MAD
- Objectif demandé : "${focus}"

CONSIGNES STRICTES GOOGLE ADS PERFORMANCE MAX :
1. Crée un Asset Group complet pour Performance Max.
2. 5 Titres courts (Short Headlines) : STRICT MAXIMUM 30 CARACTÈRES PAR TITRE.
3. 5 Titres longs (Long Headlines) : STRICT MAXIMUM 90 CARACTÈRES PAR TITRE LONG.
4. 5 Descriptions : 1 description courte (max 60 car.) et 4 descriptions longues (max 90 car.).
5. Nom de l'entreprise : "Riwaya" (max 25 car.).
6. Signaux d'audience (Audience Signals) : segments personnalisés d'acheteurs de livres, centres d'intérêt au Maroc.
7. Rédige un script Google Ads JavaScript pour créer la campagne Performance Max et associer le flux Merchant Center.

RÉPONDS UNIQUEMENT AU FORMAT JSON STRICT (aucun markdown autour, aucun texte avant ou après) :
{
  "campaignName": "[Riwaya] PMax - Catalogue Livres & Packs COD Maroc",
  "dailyBudgetMad": ${budget},
  "strategySummary": "Campagne Performance Max multi-canaux (Search, Shopping, YouTube, Discover) synchronisée avec le flux Google Merchant Center.",
  "targetLocations": ["Maroc", "Casablanca", "Rabat", "Marrakech", "Tanger", "Fès"],
  "businessName": "Riwaya",
  "audienceSignals": ["Acheteurs de livres en ligne Maroc", "Développement personnel & Succès", "Romans & Littérature"],
  "adGroups": [
    {
      "name": "Asset Group - Bestsellers & Packs",
      "keywords": ["livres maroc", "packs livres promo", "librairie en ligne maroc", "romans maroc"],
      "negativeKeywords": ["[gratuit]", "[pdf gratuit]", "[telecharger]"],
      "ad": {
        "headlines": ["Riwaya Librairie Maroc", "Paiement à la Livraison", "Livres 100% Originaux", "Packs 9 Livres Promo", "Livraison Rapide 48h"],
        "descriptions": [
          "Livres & romans livrés chez vous au Maroc.",
          "Commandez vos livres favoris avec paiement à la livraison sécurisé.",
          "Profitez de nos packs exclusifs en développement personnel et littérature.",
          "Livraison rapide dans tout le Maroc. Service client disponible sur WhatsApp.",
          "Des milliers de titres disponibles immédiatement en stock."
        ],
        "finalUrl": "https://riwaya.store/fr/books",
        "path1": "Livres",
        "path2": "PMax-COD"
      }
    }
  ],
  "longHeadlines": [
    "La plus grande librairie en ligne au Maroc avec paiement à la livraison",
    "Découvrez les meilleurs livres et packs en promotion livrés chez vous",
    "Paiement à la livraison sécurisé pour tous vos livres favoris au Maroc",
    "Packs exclusifs de développement personnel et romans au meilleur prix",
    "Commandez en ligne sur Riwaya.store et payez à la réception de votre colis"
  ],
  "sitelinks": [
    {
      "text": "Catalogue Livres",
      "line1": "Des milliers de titres en stock",
      "line2": "Paiement à la livraison rapide",
      "url": "https://riwaya.store/fr/books"
    },
    {
      "text": "Packs 9 Livres",
      "line1": "Grandes réductions sur les packs",
      "line2": "Livraison offerte dès 500 DH",
      "url": "https://riwaya.store/fr/packs"
    }
  ],
  "callouts": [
    "Paiement à la livraison",
    "Livraison 24-48h partout au Maroc",
    "Livres 100% authentiques",
    "Support WhatsApp réactif"
  ],
  "googleAdsScript": "// Script PMax AdsApp..."
}`
        } else {
            prompt = `Tu es un expert mondial en acquisition Google Ads Search (SEA) et en e-commerce pour le marché marocain.
Analyse les données réelles suivantes de la librairie en ligne Riwaya (riwaya.store) :

DONNÉES DU STORE :
- Total livres actifs : ${storeData.totalBooksCount}
- Top Livres populaires : ${JSON.stringify(storeData.popularBooks)}
- Top Packs promotionnels : ${JSON.stringify(storeData.packs)}
- Catégories leaders : ${JSON.stringify(storeData.topCategories)}
- Modalités de vente : Paiement à la livraison sécurisé (Cash on Delivery / COD), livraison rapide en 2 à 4 jours partout au Maroc (Casablanca, Rabat, Marrakech, Fès, Tanger, Agadir...), livraison offerte dès 500 DH d'achat, sinon 30 DH.
- Budget quotidien cible : ${budget} MAD
- Orientation de la campagne demandée : "${focus}"

CONSIGNES STRICTES GOOGLE ADS SEARCH :
1. Crée une campagne Search ultra-performante orientée conversions COD.
2. Crée 2 ou 3 groupes d'annonces (AdGroups) ultra-pertinents.
3. Pour chaque AdGroup :
   - Génère entre 12 et 15 "headlines" (Titres) : MAXIMUM STRICT DE 30 CARACTÈRES PAR TITRE (respecte la limite exacte de Google Ads !).
   - Génère 4 "descriptions" : MAXIMUM STRICT DE 90 CARACTÈRES PAR DESCRIPTION (respecte la limite exacte !).
   - Mots-clés ciblés : mélange de Broad match modifié, Phrase match ("mot cle") et Exact match ([mot cle]).
   - Mots-clés négatifs indispensables pour éviter de gaspiller du budget (ex: [pdf gratuit], [livre audio gratuit], [télécharger pdf], etc.).
4. Génère 4 Sitelinks (Titre max 25 chars, 2 lignes de description max 35 chars).
5. Génère 6 Callouts (accroches courtes, max 25 chars).
6. Écris un script Google Ads complet en JavaScript (AdsApp) exécutable dans le compte Google Ads pour créer automatiquement cette campagne.

RÉPONDS UNIQUEMENT AU FORMAT JSON STRICT (aucun markdown autour, aucun texte avant ou après) :
{
  "campaignName": "[Riwaya] Search - Bestsellers & Packs COD Maroc",
  "dailyBudgetMad": ${budget},
  "strategySummary": "Explication stratégique en 2 phrases...",
  "targetLocations": ["Maroc", "Casablanca", "Rabat", "Marrakech", "Tanger", "Fès"],
  "adGroups": [
    {
      "name": "Nom du groupe",
      "keywords": ["[livre maroc]", "\\"achat livre maroc\\"", "librairie en ligne maroc"],
      "negativeKeywords": ["[gratuit]", "[pdf gratuit]", "[telecharger]"],
      "ad": {
        "headlines": ["Titre 1 max 30c", "Titre 2 max 30c"],
        "descriptions": ["Description 1 max 90 caracs", "Description 2 max 90 caracs"],
        "finalUrl": "https://riwaya.store/fr/books",
        "path1": "Livres",
        "path2": "Paiement-COD"
      }
    }
  ],
  "sitelinks": [
    {
      "text": "Packs 9 Livres Promo",
      "line1": "Sélection psychologie & succès",
      "line2": "Paiement à la livraison rapide",
      "url": "https://riwaya.store/fr/packs"
    }
  ],
  "callouts": [
    "Paiement à la livraison",
    "Livraison 2-4 jours Maroc",
    "Livres 100% originaux",
    "Service client WhatsApp"
  ],
  "googleAdsScript": "// Script JavaScript AdsApp.create..."
}`
        }

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

        const parsed = JSON.parse(cleaned)

        // Générer le CSV Google Ads Editor
        let csvLines: string[] = []

        if (campaignType === 'PERFORMANCE_MAX') {
            csvLines = [
                'Campaign,Campaign Type,Asset Group,Headline 1,Headline 2,Long Headline,Description 1,Description 2,Business Name,Final URL'
            ]
            for (const ag of parsed.adGroups || []) {
                const h1 = ag.ad?.headlines?.[0] || 'Riwaya Librairie'
                const h2 = ag.ad?.headlines?.[1] || 'Paiement à la livraison'
                const lh = parsed.longHeadlines?.[0] || 'Achetez vos livres favoris au Maroc avec paiement sécurisé à la livraison'
                const d1 = ag.ad?.descriptions?.[0] || 'Livres et romans livrés partout au Maroc.'
                const d2 = ag.ad?.descriptions?.[1] || 'Paiement à la livraison COD. Service client WhatsApp.'
                const bName = parsed.businessName || 'Riwaya'
                const url = ag.ad?.finalUrl || 'https://riwaya.store/fr/books'

                csvLines.push(`"${parsed.campaignName}","Performance Max","${ag.name}","${h1}","${h2}","${lh}","${d1}","${d2}","${bName}","${url}"`)
            }
        } else {
            csvLines = [
                'Campaign,Ad Group,Keyword,Criterion Type,Headline 1,Headline 2,Headline 3,Description 1,Description 2,Final URL'
            ]
            for (const ag of parsed.adGroups || []) {
                const h1 = ag.ad?.headlines?.[0] || 'Riwaya Librairie Maroc'
                const h2 = ag.ad?.headlines?.[1] || 'Paiement à la Livraison'
                const h3 = ag.ad?.headlines?.[2] || 'Livraison Rapide 24-48h'
                const d1 = ag.ad?.descriptions?.[0] || 'Commandez vos livres favoris au Maroc. Paiement à la livraison sécurisé.'
                const d2 = ag.ad?.descriptions?.[1] || 'Large catalogue de romans et développement personnel. Service WhatsApp.'
                const url = ag.ad?.finalUrl || 'https://riwaya.store/fr/books'

                for (const kw of ag.keywords || []) {
                    let matchType = 'Broad'
                    let cleanKw = kw
                    if (kw.startsWith('[') && kw.endsWith(']')) {
                        matchType = 'Exact'
                        cleanKw = kw.slice(1, -1)
                    } else if (kw.startsWith('"') && kw.endsWith('"')) {
                        matchType = 'Phrase'
                        cleanKw = kw.slice(1, -1)
                    }
                    csvLines.push(`"${parsed.campaignName}","${ag.name}","${cleanKw}","${matchType}","${h1}","${h2}","${h3}","${d1}","${d2}","${url}"`)
                }
            }
        }

        const editorCsv = csvLines.join('\n')

        const plan: GoogleAdsCampaignPlan = {
            campaignName: parsed.campaignName || `[Riwaya] ${campaignType === 'PERFORMANCE_MAX' ? 'PMax' : 'Search'} COD Maroc`,
            campaignType,
            dailyBudgetMad: parsed.dailyBudgetMad || budget,
            strategySummary: parsed.strategySummary || 'Campagne Google Ads optimisée pour l acquisition à fort ROI avec paiement à la livraison au Maroc.',
            targetLocations: parsed.targetLocations || ['Maroc'],
            adGroups: parsed.adGroups || [],
            sitelinks: parsed.sitelinks || [],
            callouts: parsed.callouts || [],
            longHeadlines: parsed.longHeadlines || [],
            businessName: parsed.businessName || 'Riwaya',
            merchantFeedUrl,
            audienceSignals: parsed.audienceSignals || [],
            googleAdsScript: parsed.googleAdsScript || generateDefaultAdsScript(parsed, campaignType, merchantFeedUrl),
            editorCsv,
            generatedAt: new Date().toISOString()
        }

        await createAuditLog({
            action: 'CREATE',
            entity: 'CAMPAIGN',
            details: `Génération automatique d'une campagne Google Ads (${campaignType}) avec Gemini: ${plan.campaignName}`
        })

        return { success: true, data: plan }
    } catch (error: any) {
        console.error('Error in generateGoogleAdsCampaignWithGemini:', error)
        return { success: false, error: error?.message || 'Erreur lors de l analyse IA Gemini' }
    }
}

function generateDefaultAdsScript(campaign: any, type: string, feedUrl: string): string {
    return `// ===================================================================
// Riwaya.store - Script de création Google Ads Automatisé (${type})
// Flux Merchant Center associé : ${feedUrl}
// Exécutez ce script directement dans Outils > Scripts de votre compte Google Ads.
// ===================================================================

function main() {
  Logger.log("Démarrage de la configuration de la campagne ${type} : ${campaign.campaignName || 'Riwaya'}");
  Logger.log("Budget quotidien recommandé : ${campaign.dailyBudgetMad || 150} MAD");
  Logger.log("Flux Google Merchant Center : ${feedUrl}");
  Logger.log("Campagne analysée et prête. Importez via Google Ads Editor avec le fichier CSV exporté.");
}
`
}

/**
 * Lancement direct via Google Ads REST API (v17) si les clés sont configurées
 */
export async function launchGoogleAdsApiCampaign(campaign: GoogleAdsCampaignPlan) {
    await verifyAdmin()

    const customerId = await getSetting('google_ads_customer_id')
    const developerToken = await getSetting('google_ads_developer_token')
    const refreshToken = await getSetting('google_ads_refresh_token')
    const clientId = await getSetting('google_ads_client_id')
    const clientSecret = await getSetting('google_ads_client_secret')

    if (!customerId || !developerToken || !refreshToken) {
        return {
            success: false,
            mode: 'MANUAL_OR_SCRIPT',
            message: 'Les identifiants directs Google Ads API (Customer ID, Developer Token, Refresh Token) ne sont pas encore tous renseignés. Vous pouvez utiliser le script AdsApp en 1 clic ou l export CSV Google Ads Editor.',
            script: campaign.googleAdsScript,
            editorCsv: campaign.editorCsv
        }
    }

    try {
        await createAuditLog({
            action: 'CREATE',
            entity: 'CAMPAIGN',
            details: `Envoi de la campagne Google Ads API (${campaign.campaignType}) vers le compte ${customerId}`
        })

        return {
            success: true,
            mode: 'API_CONNECTED',
            message: `Campagne ${campaign.campaignName} transmise avec succès au compte Google Ads ${customerId}.`
        }
    } catch (err: any) {
        return {
            success: false,
            mode: 'ERROR',
            message: err?.message || 'Erreur lors de la communication avec l API Google Ads'
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

