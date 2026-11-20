import { prisma } from '@/lib/prisma'
import { getCached } from '@/lib/cache'

export interface AuthorData {
    name: string
    bio?: string | null
    image?: string | null
    bookCount: number
    sampleBookImage?: string | null
    hasAvailableBooks: boolean
}

/**
 * Récupère tous les auteurs avec leurs données associées (profil, compte de livres)
 */
export async function getAuthorsData(): Promise<AuthorData[]> {
    return getCached(
        'authors:all_data',
        async () => {
            // 1. Récupérer tous les auteurs uniques et leurs comptes de livres actifs
            const bookStats = await prisma.book.groupBy({
                by: ['author'],
                where: { active: true },
                _count: {
                    _all: true,
                    author: true // Ensuring author count is present if orderBy uses it, though we will sort in JS
                }
            })

            // Sort manually
            bookStats.sort((a, b) => b._count._all - a._count._all)

            // Récupérer les auteurs ayant au moins un livre en stock
            const authorsWithStock = await prisma.book.findMany({
                where: { active: true, stock: { gt: 0 } },
                select: { author: true },
                distinct: ['author']
            })
            const availableAuthorsSet = new Set(authorsWithStock.map(a => a.author))

            // 2. Récupérer tous les profils d'auteurs
            const profiles = await prisma.authorProfile.findMany()

            // 3. Récupérer une image de livre pour chaque auteur (fallback)
            const authorsWithNoProfileImage = bookStats.filter(s => 
                !profiles.find(p => p.name === s.author)?.image
            ).map(s => s.author)

            const sampleBooks = await prisma.book.findMany({
                where: {
                    active: true,
                    author: { in: authorsWithNoProfileImage }
                },
                select: {
                    author: true,
                    image: true
                },
                distinct: ['author']
            })

            // 4. Fusionner les données
            return bookStats.map(stat => {
                const profile = profiles.find(p => p.name === stat.author)
                const sampleBook = sampleBooks.find(b => b.author === stat.author)

                return {
                    name: stat.author,
                    bio: profile?.bio,
                    image: profile?.image,
                    bookCount: stat._count._all,
                    sampleBookImage: sampleBook?.image,
                    hasAvailableBooks: availableAuthorsSet.has(stat.author)
                }
            })
        },
        3600 // Cache 1 heure
    )
}

/**
 * Récupère le profil d'un auteur spécifique par son nom
 */
export async function getAuthorProfile(name: string) {
    return prisma.authorProfile.findUnique({
        where: { name }
    })
}

/**
 * Récupère des auteurs similaires
 */
export async function getSimilarAuthors(currentAuthorName: string, limit: number = 4) {
    const allAuthors = await getAuthorsData()
    const similar = allAuthors.filter(a => a.name !== currentAuthorName)
    
    // Sort by book count to get interesting authors
    similar.sort((a, b) => b.bookCount - a.bookCount)
    
    // Return objects that mimic the AuthorProfile but include fallback images
    return similar.slice(0, limit).map(a => ({
        id: a.name,
        name: a.name,
        bio: a.bio || null,
        image: a.image || null,
        sampleBookImage: a.sampleBookImage || null,
        nationality: null,
        birthYear: null,
        deathYear: null,
        influences: null,
        createdAt: new Date(),
        updatedAt: new Date(),
    }))
}

