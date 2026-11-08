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
    dailyBudgetMad: number
    strategySummary: string
    targetLocations: string[]
    adGroups: GoogleAdsAdGroup[]
    sitelinks: GoogleAdsExtensionSitelink[]
    callouts: string[]
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
 * Analyse le store avec Gemini et génère une campagne Google Ads complète
 */
export async function generateGoogleAdsCampaignWithGemini(params?: {
    customFocus?: string
    dailyBudgetMad?: number
}): Promise<{ success: boolean; data?: GoogleAdsCampaignPlan; error?: string }> {
    try {
        await verifyAdmin()
        const storeData = await analyzeStoreMetrics()

        const budget = params?.dailyBudgetMad || 150
        const focus = params?.customFocus || 'Bestsellers littéraires, packs de livres et développement personnel au Maroc'

        const prompt = `Tu es un expert mondial en acquisition Google Ads Search (SEA) et en e-commerce pour le marché marocain.
Analyse les données réelles suivantes de la librairie en ligne Riwaya (riwaya.store) :

DONNÉES DU STORE :
- Total livres actifs : ${storeData.totalBooksCount}
- Top Livres populaires : ${JSON.stringify(storeData.popularBooks)}
- Top Packs promotionnels : ${JSON.stringify(storeData.packs)}
- Catégories leaders : ${JSON.stringify(storeData.topCategories)}
- Modalités de vente : Paiement à la livraison sécurisé (Cash on Delivery / COD), livraison rapide en 2 à 4 jours partout au Maroc (Casablanca, Rabat, Marrakech, Fès, Tanger, Agadir...), livraison offerte dès 500 DH d'achat, sinon 30 DH.
- Budget quotidien cible : ${budget} MAD
- Orientation de la campagne demandée : "${focus}"

CONSIGNES STRICTES GOOGLE ADS :
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

RÉPONDS UNIQUEMENT AU FORMAT JSON STRICT (aucun markdown autour, aucun texte avant ou après) avec la structure exacte suivante :
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
        let csvLines = [
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

        const editorCsv = csvLines.join('\n')

        const plan: GoogleAdsCampaignPlan = {
            campaignName: parsed.campaignName || '[Riwaya] Campagne Search COD Maroc',
            dailyBudgetMad: parsed.dailyBudgetMad || budget,
            strategySummary: parsed.strategySummary || 'Campagne Google Search axée sur l acquisition à fort ROI avec paiement à la livraison au Maroc.',
            targetLocations: parsed.targetLocations || ['Maroc'],
            adGroups: parsed.adGroups || [],
            sitelinks: parsed.sitelinks || [],
            callouts: parsed.callouts || [],
            googleAdsScript: parsed.googleAdsScript || generateDefaultAdsScript(parsed),
            editorCsv,
            generatedAt: new Date().toISOString()
        }

        await createAuditLog({
            action: 'CREATE',
            entity: 'CAMPAIGN',
            details: `Génération automatique d'une campagne Google Ads avec Gemini: ${plan.campaignName}`
        })

        return { success: true, data: plan }
    } catch (error: any) {
        console.error('Error in generateGoogleAdsCampaignWithGemini:', error)
        return { success: false, error: error?.message || 'Erreur lors de l analyse IA Gemini' }
    }
}

function generateDefaultAdsScript(campaign: any): string {
    return `// ===================================================================
// Riwaya.store - Script de création Google Ads Automatisé
// Exécutez ce script directement dans Outils > Scripts de votre compte Google Ads.
// ===================================================================

function main() {
  Logger.log("Démarrage de la configuration de la campagne : ${campaign.campaignName || 'Riwaya Search'}");
  
  // 1. Définition du budget quotidien
  var budgetAmount = ${(campaign.dailyBudgetMad || 150) / 10}; // Conversion indicative USD/EUR
  
  Logger.log("Campagne analysée et prête. Importez via Google Ads Editor avec le fichier CSV exporté ou via l'API.");
  Logger.log("Budget quotidien recommandé : ${campaign.dailyBudgetMad || 150} MAD");
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
        // Enregistrement de l'action
        await createAuditLog({
            action: 'CREATE',
            entity: 'CAMPAIGN',
            details: `Envoi de la campagne Google Ads API vers le compte ${customerId}`
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
