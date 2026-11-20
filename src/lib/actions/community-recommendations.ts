'use server'

import { prisma } from '@/lib/prisma'
import { getCommunityUser } from './community-auth'
import { generateRecommendations } from '@/lib/gemini'

export interface AIRecommendation {
    title: string;
    author: string;
    reason: string;
}

export async function getUserRecommendations(locale: string = 'fr'): Promise<AIRecommendation[]> {
    const user = await getCommunityUser()
    if (!user) return []
    const recommendationLocale = ['ar', 'en', 'fr'].includes(locale) ? locale : 'fr'

    try {
        // 1. Vérifier le cache en base de données
        const customer = await prisma.customer.findUnique({
            where: { id: user.id },
            select: { aiRecommendations: true }
        })

        if (customer?.aiRecommendations) {
            try {
                const cached = JSON.parse(customer.aiRecommendations)
                if (Array.isArray(cached) && recommendationLocale === 'fr') return cached
                if (cached && !Array.isArray(cached) && Array.isArray(cached[recommendationLocale])) {
                    return cached[recommendationLocale]
                }
            } catch (e) {
                console.error("Erreur parsing aiRecommendations:", e)
            }
        }

        // 2. Récupérer les auteurs de la wishlist
        const wishlist = await (prisma as any).wishlist.findMany({
            where: { userId: user.id },
            select: { author: true }
        })

        if (!wishlist || wishlist.length === 0) {
            return [] // Pas assez de données pour recommander
        }

        const authorsSet = new Set<string>()
        wishlist.forEach((w: any) => {
            if (w.author) authorsSet.add(w.author)
        })

        const authors = Array.from(authorsSet)
        if (authors.length === 0) return []

        // 3. Demander à Gemini
        const recommendations = await generateRecommendations(authors, recommendationLocale)

        if (recommendations && Array.isArray(recommendations) && recommendations.length > 0) {
            // 4. Mettre en cache dans la DB si le client existe
            if (customer) {
                let cachedByLocale: Record<string, AIRecommendation[]> = {}
                try {
                    const previous = customer.aiRecommendations ? JSON.parse(customer.aiRecommendations) : null
                    cachedByLocale = Array.isArray(previous) ? { fr: previous } : (previous || {})
                } catch {}
                cachedByLocale[recommendationLocale] = recommendations
                await prisma.customer.update({
                    where: { id: user.id },
                    data: { aiRecommendations: JSON.stringify(cachedByLocale) }
                }).catch(() => null)
            }
            return recommendations
        }

        // Fallback intelligent depuis le catalogue si l'IA est indisponible
        const fallbackBooks = await prisma.book.findMany({
            where: {
                active: true,
                OR: [
                    { author: { in: authors } },
                    { isPromoted: true }
                ]
            },
            take: 4,
            select: { title: true, author: true }
        })

        if (fallbackBooks.length > 0) {
            const fallbackReason = recommendationLocale === 'ar'
                ? 'اقتراح مبني على الكتّاب المفضلين لديك.'
                : recommendationLocale === 'en'
                    ? 'A suggestion based on your favorite authors.'
                    : 'Sélection recommandée basée sur vos auteurs favoris.'
            return fallbackBooks.map(b => ({
                title: b.title,
                author: b.author,
                reason: fallbackReason
            }))
        }

        return []
    } catch (error) {
        console.error("getUserRecommendations error:", error)
        return []
    }
}
