'use server'

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import Fuse from 'fuse.js'
import { expandQueryWithSynonyms } from '@/lib/utils/synonyms'
import { parsePriceFilter } from '@/lib/utils/search'
import { matchWithLevenshtein, findBestSuggestion } from '@/lib/utils/levenshtein'

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
