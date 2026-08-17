'use server'

import { prisma } from '@/lib/prisma'
import { getCommunityUser } from './community-auth'
import { generateRecommendations } from '@/lib/gemini'

export interface AIRecommendation {
    title: string;
    author: string;
    reason: string;
}

export async function getUserRecommendations(): Promise<AIRecommendation[]> {
    const user = await getCommunityUser()
    if (!user) return []

    try {
        // 1. Vérifier le cache en base de données
        const customer = await prisma.customer.findUnique({
            where: { id: user.id },
            select: { aiRecommendations: true }
        })

        if (customer?.aiRecommendations) {
            try {
                return JSON.parse(customer.aiRecommendations)
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
        const recommendations = await generateRecommendations(authors)

        if (recommendations && Array.isArray(recommendations) && recommendations.length > 0) {
            // 4. Mettre en cache dans la DB
            await prisma.customer.update({
                where: { id: user.id },
                data: { aiRecommendations: JSON.stringify(recommendations) }
            })
            return recommendations
        }

        return []
    } catch (error) {
        console.error("getUserRecommendations error:", error)
        return []
    }
}
