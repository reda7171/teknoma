'use server'

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import Fuse from 'fuse.js'
import { expandQueryWithSynonyms } from '@/lib/utils/synonyms'
import { parsePriceFilter } from '@/lib/utils/search'
import { matchWithLevenshtein, findBestSuggestion } from '@/lib/utils/levenshtein'
import { getSetting } from '@/lib/server/site-settings'

// Cache mémoire des résultats de recherche prédictive (TTL: 60s)
const predictiveCache = new Map<string, { data: { results: any[]; suggestion: string | null }; timestamp: number }>()
const CACHE_TTL = 60 * 1000

export async function searchBooksPredictive(query: string): Promise<{ results: any[]; suggestion: string | null }> {
    if (!query || query.length < 2) return { results: [], suggestion: null }

    const cacheKey = query.toLowerCase().trim()
    const cached = predictiveCache.get(cacheKey)
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        return cached.data
    }

    // Parser le prix dans la requête
    const priceFilter = parsePriceFilter(query);
    const expandedQuery = expandQueryWithSynonyms(priceFilter.cleanQuery || '');

    try {
        const bookWhere: Prisma.BookWhereInput = { active: true };
        const packWhere: Prisma.PackWhereInput = { active: true };

        if (priceFilter.minPrice !== undefined || priceFilter.maxPrice !== undefined) {
            bookWhere.price = {};
            packWhere.price = {};
            if (priceFilter.minPrice !== undefined) {
                bookWhere.price.gte = priceFilter.minPrice;
                packWhere.price.gte = priceFilter.minPrice;
            }
            if (priceFilter.maxPrice !== undefined) {
                bookWhere.price.lte = priceFilter.maxPrice;
                packWhere.price.lte = priceFilter.maxPrice;
            }
        }

        const [filteredBooks, filteredPacks] = await Promise.all([
            prisma.book.findMany({
                where: bookWhere,
                select: {
                    id: true,
                    title: true,
                    titleFr: true,
                    titleEn: true,
                    language: true,
                    author: true,
                    description: true,
                    image: true,
                    price: true,
                    category: true
                }
            }),
            prisma.pack.findMany({
                where: packWhere,
                select: {
                    id: true,
                    name: true,
                    nameFr: true,
                    nameEn: true,
                    language: true,
                    description: true,
                    image: true,
                    price: true,
                    books: {
                        select: {
                            book: {
                                select: {
                                    title: true,
                                    titleFr: true,
                                    titleEn: true,
                                    author: true,
                                    image: true
                                }
                            }
                        }
                    }
                }
            })
        ]);

        const formattedBooks = filteredBooks.map((b) => ({
            ...b,
            type: 'BOOK' as const,
            name: b.title,
            nameFr: b.titleFr,
            nameEn: b.titleEn,
        }));

        const formattedPacks = filteredPacks.map((p) => {
            const includedBooks = p.books
                .map((pb) => `${pb.book.title} ${pb.book.titleFr || ''} ${pb.book.titleEn || ''} ${pb.book.author || ''}`)
                .join(' ');
            return {
                id: p.id,
                type: 'PACK' as const,
                title: p.name,
                titleFr: p.nameFr || p.name,
                titleEn: p.nameEn || p.name,
                name: p.name,
                nameFr: p.nameFr,
                nameEn: p.nameEn,
                language: p.language || 'fr',
                author: 'Pack',
                booksCount: p.books.length,
                includedBooks,
                description: p.description,
                image: p.image || p.books[0]?.book?.image || '',
                price: p.price,
                category: 'Pack',
                categoryAr: 'حزمة باقة',
                categoryFr: 'Pack Lot Coffret',
                books: p.books,
            };
        });

        const allItems = [...formattedPacks, ...formattedBooks];

        // Si on a filtré par prix mais qu'il n'y a pas de texte de recherche restant
        if (!priceFilter.cleanQuery) {
            const data = { results: allItems.slice(0, 6), suggestion: null };
            predictiveCache.set(cacheKey, { data, timestamp: Date.now() });
            return data;
        }

        const fuseOptions = {
            keys: [
                { name: 'title', weight: 1.0 },
                { name: 'name', weight: 1.0 },
                { name: 'titleFr', weight: 1.0 },
                { name: 'titleEn', weight: 1.0 },
                { name: 'nameFr', weight: 1.0 },
                { name: 'nameEn', weight: 1.0 },
                { name: 'author', weight: 0.8 },
                { name: 'includedBooks', weight: 0.7 },
                { name: 'category', weight: 0.5 },
                { name: 'categoryAr', weight: 0.5 },
                { name: 'categoryFr', weight: 0.5 },
                { name: 'description', weight: 0.3 }
            ],
            threshold: 0.35,
            distance: 100,
            ignoreLocation: true
        }

        const fuse = new Fuse(allItems, fuseOptions)
        const fuseResults = fuse.search(expandedQuery).map(result => result.item)

        // Tolérance aux fautes de frappe via la distance de Levenshtein (auteurs et titres)
        const rawTargetQuery = (priceFilter.cleanQuery || query).trim()
        const levenshteinRanked = allItems
            .map((item) => {
                const authorCheck = matchWithLevenshtein(rawTargetQuery, item.author)
                const titleCheck = matchWithLevenshtein(rawTargetQuery, item.title)
                const titleFrCheck = matchWithLevenshtein(rawTargetQuery, item.titleFr)
                const titleEnCheck = matchWithLevenshtein(rawTargetQuery, item.titleEn)
                const nameCheck = matchWithLevenshtein(rawTargetQuery, item.name)

                const maxScore = Math.max(
                    authorCheck.matches ? authorCheck.score * 1.15 : 0,
                    titleCheck.matches ? titleCheck.score : 0,
                    titleFrCheck.matches ? titleFrCheck.score : 0,
                    titleEnCheck.matches ? titleEnCheck.score : 0,
                    nameCheck.matches ? nameCheck.score : 0
                )

                return { item, score: maxScore }
            })
            .filter((entry) => entry.score >= 0.7)
            .sort((a, b) => b.score - a.score)
            .map((entry) => entry.item)

        // Combiner les résultats Levenshtein et Fuse sans doublons
        const combinedMap = new Map<string, typeof allItems[0]>()
        for (const item of levenshteinRanked) {
            combinedMap.set(`${item.type}-${item.id}`, item)
        }
        for (const item of fuseResults) {
            const key = `${item.type}-${item.id}`
            if (!combinedMap.has(key)) {
                combinedMap.set(key, item)
            }
        }

        const topResults = Array.from(combinedMap.values()).slice(0, 6)

        // Log de la recherche pour les tendances
        if (query.trim().length >= 3) {
            const bestCat = topResults.length > 0 ? topResults[0].category : null;
            prisma.searchLog.create({
                data: {
                    query: query.toLowerCase().trim(),
                    category: bestCat
                }
            }).catch(() => { })
        }

        // Détection de suggestion "Vouliez-vous dire" si une faute de frappe a été corrigée
        const candidates: { text: string | null | undefined; isAuthor?: boolean }[] = []
        for (const item of allItems) {
            if (item.author && item.author !== 'Pack') candidates.push({ text: item.author, isAuthor: true })
            if (item.title) candidates.push({ text: item.title })
            if (item.titleFr) candidates.push({ text: item.titleFr })
            if (item.titleEn) candidates.push({ text: item.titleEn })
        }

        const suggestion = findBestSuggestion(rawTargetQuery, candidates)
        const data = { results: topResults, suggestion }

        predictiveCache.set(cacheKey, { data, timestamp: Date.now() })
        return data
    } catch (error) {
        console.error('Erreur recherche fuzzy:', error)
        return { results: [], suggestion: null }
    }
}

/**
 * Récupère les recherches les plus populaires
 */
export async function getPopularSearches(limit = 5) {
    try {
        const stats = await prisma.searchLog.groupBy({
            by: ['query'],
            _count: {
                query: true
            },
            orderBy: {
                _count: {
                    query: 'desc'
                }
            },
            take: limit
        });

        return stats.map(s => s.query);
    } catch (error) {
        console.error('Erreur stats recherches:', error);
        return [];
    }
}

import {
    getCachedCover,
    setCachedCover,
    recordCacheHit
} from '@/lib/actions/gemini-cache'

/**
 * Reconnaissance visuelle de couverture de livre (Recherche par image)
 * Avec mise en cache par empreinte cryptographique SHA-256
 */
export async function recognizeBookCover(formData: FormData): Promise<{
    success: boolean
    title?: string
    author?: string
    results?: any[]
    fromCache?: boolean
    error?: string
}> {
    try {
        const file = formData.get('image') as File | null
        if (!file || file.size === 0) {
            return { success: false, error: 'Aucune image fournie' }
        }

        if (file.size > 6 * 1024 * 1024) {
            return { success: false, error: 'L\'image dépasse 6 Mo' }
        }

        const buffer = await file.arrayBuffer()

        // 1. Calcul de l'empreinte cryptographique SHA-256 de l'image
        const { createHash } = await import('crypto')
        const imageFingerprint = createHash('sha256').update(Buffer.from(buffer)).digest('hex')

        // 2. Vérification dans le cache d'empreintes
        const cachedDetection = await getCachedCover(imageFingerprint)
        if (cachedDetection && cachedDetection.title) {
            await recordCacheHit(imageFingerprint)
            const searchRes = await searchBooksPredictive(cachedDetection.title)
            return {
                success: true,
                title: cachedDetection.title,
                author: cachedDetection.author,
                results: searchRes.results || [],
                fromCache: true
            }
        }

        const base64 = Buffer.from(buffer).toString('base64')
        const mimeType = file.type || 'image/jpeg'

        const apiKey = (await getSetting('gemini_api_key')) || process.env.GEMINI_API_KEY || ''
        if (!apiKey) {
            return { success: false, error: 'Service de reconnaissance visuelle non configuré' }
        }

        const { GoogleGenerativeAI } = await import('@google/generative-ai')
        const genAI = new GoogleGenerativeAI(apiKey)

        const candidateModels = [
            process.env.GEMINI_MODEL,
            'gemini-3.7-flash',
            'gemini-3.5-flash',
            'gemini-flash-latest',
            'gemini-3.8-flash'
        ].filter(Boolean) as string[]

        let detectedData: { title?: string; author?: string } | null = null

        for (const modelName of Array.from(new Set(candidateModels))) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName })
                const prompt = `Tu es un expert en livres. Analyse cette couverture de livre.
Extrais uniquement:
1. title: Le titre exact du livre (dans sa langue originale visible sur la couverture)
2. author: Le nom de l'auteur si visible
Réponds STRICTEMENT sous forme de JSON valide: {"title": "...", "author": "..."}.
Ne mets aucun texte avant ou après.`

                const res = await model.generateContent([
                    prompt,
                    {
                        inlineData: {
                            data: base64,
                            mimeType: mimeType
                        }
                    }
                ])

                const text = res.response.text().trim()
                const cleanJson = text.replace(/```json/gi, '').replace(/```/g, '').trim()
                const parsed = JSON.parse(cleanJson)
                if (parsed.title) {
                    detectedData = {
                        title: String(parsed.title).trim(),
                        author: parsed.author ? String(parsed.author).trim() : undefined
                    }
                    break
                }
            } catch (err: any) {
                console.warn(`Modèle ${modelName} échec vision:`, err?.message || err)
            }
        }

        if (!detectedData || !detectedData.title) {
            return { success: false, error: 'Impossible de reconnaître le titre sur cette couverture' }
        }

        // 3. Sauvegarde dans le cache d'empreintes (mémoire + fichier persistant)
        const cacheEntry = {
            title: detectedData.title,
            author: detectedData.author,
            timestamp: Date.now(),
            hitCount: 0
        }
        await setCachedCover(imageFingerprint, cacheEntry)

        const searchRes = await searchBooksPredictive(detectedData.title)

        return {
            success: true,
            title: detectedData.title,
            author: detectedData.author,
            results: searchRes.results || []
        }
    } catch (error: any) {
        console.error('Erreur reconnaissance couverture:', error)
        return { success: false, error: error?.message || 'Erreur lors de la reconnaissance de couverture' }
    }
}
