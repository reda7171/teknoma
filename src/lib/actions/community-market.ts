'use server'

import { prisma } from '@/lib/prisma'
import { getCached } from '@/lib/cache'
import { getCommunityUser } from './community-auth'
import { calculateDistanceKm, getBookCoordinates } from '@/lib/utils/geo'

export type MarketFilters = {
    search?: string
    city?: string
    condition?: string
    lat?: number
    lng?: number
    radiusKm?: number
}

export async function getMarketBooks(filters: MarketFilters = {}) {
    const user = await getCommunityUser()
    const currentUserId = user?.id

    const where: any = {
        status: 'AVAILABLE',
        // Exclude own books
        ownerId: currentUserId ? { not: currentUserId } : undefined,
    }

    if (filters.search) {
        where.OR = [
            { title: { contains: filters.search } },
            { author: { contains: filters.search } },
        ]
    }

    if (filters.city) {
        where.owner = {
            city: { contains: filters.city }
        }
    }

    try {
        let books = await (prisma as any).exchangeBook.findMany({
            where,
            include: {
                owner: {
                    select: {
                        id: true,
                        fullName: true,
                        city: true,
                        rating: true,
                        image: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
        })

        // Calcul de distance et filtrage de proximité si coordonnées fournies
        if (typeof filters.lat === 'number' && typeof filters.lng === 'number' && !isNaN(filters.lat) && !isNaN(filters.lng)) {
            const userLat = filters.lat
            const userLng = filters.lng
            const radius = typeof filters.radiusKm === 'number' && filters.radiusKm > 0 ? filters.radiusKm : 50

            books = books
                .map((book: any) => {
                    const coords = getBookCoordinates(book)
                    if (!coords) return { ...book, distanceKm: undefined }
                    const dist = calculateDistanceKm(userLat, userLng, coords.lat, coords.lng)
                    return { ...book, distanceKm: dist }
                })
                .filter((book: any) => book.distanceKm !== undefined && book.distanceKm <= radius)
                .sort((a: any, b: any) => (a.distanceKm ?? 99999) - (b.distanceKm ?? 99999))
        } else if (filters.city) {
            // Calculer la distance indicative par rapport à la ville sélectionnée
            const cityCoords = getBookCoordinates({ owner: { city: filters.city } })
            if (cityCoords) {
                books = books.map((book: any) => {
                    const coords = getBookCoordinates(book)
                    if (!coords) return book
                    const dist = calculateDistanceKm(cityCoords.lat, cityCoords.lng, coords.lat, coords.lng)
                    return { ...book, distanceKm: dist }
                })
            }
        }

        return books.slice(0, 50)
    } catch (error) {
        return []
    }
}

export async function getExchangeBookDetails(bookId: string) {
    try {
        const book = await (prisma as any).exchangeBook.findUnique({
            where: { id: bookId },
            include: {
                owner: {
                    select: {
                        id: true,
                        fullName: true,
                        city: true,
                        rating: true,
                        image: true,
                        createdAt: true, // Member since
                    }
                }
            }
        })
        return book
    } catch (error) {
        return null
    }
}

// Fonction pour récupérer les livres d'échange récents pour la page d'accueil
export async function getRecentExchangeBooks(limit = 6) {
    return getCached(
        `community:recent-books:${limit}`,
        async () => {
            try {
                const books = await (prisma as any).exchangeBook.findMany({
                    where: {
                        status: 'AVAILABLE',
                    },
                    include: {
                        owner: {
                            select: {
                                id: true,
                                fullName: true,
                                city: true,
                                image: true,
                            }
                        }
                    },
                    orderBy: { createdAt: 'desc' },
                    take: limit,
                })

                return books
            } catch (error) {
                return []
            }
        },
        300
    )
}
// Smart matching logic: Find users who have what I want AND want what I have
export async function getSmartMatches() {
    const user = await getCommunityUser()
    if (!user) return []

    try {
        // 1. Ma wishlist
        const myWishlist = await (prisma as any).wishlist.findMany({
            where: { userId: user.id }
        })
        const wishlistTitles = myWishlist.map((w: any) => w.title.toLowerCase())

        // 2. Mes livres
        const myBooks = await (prisma as any).exchangeBook.findMany({
            where: { ownerId: user.id, status: 'AVAILABLE' }
        })
        const myTitles = myBooks.map((b: any) => b.title.toLowerCase())

        if (wishlistTitles.length === 0) return []

        // 3. Trouver des livres qui matchent ma wishlist
        const matchingBooks = await (prisma as any).exchangeBook.findMany({
            where: {
                status: 'AVAILABLE',
                ownerId: { not: user.id },
                OR: wishlistTitles.map((title: string) => ({
                    title: { contains: title }
                }))
            },
            include: {
                owner: true
            },
            take: 20
        })

        // Fetch wishlists for the owners separately to avoid Prisma include error (wishlist is not on Customer model)
        const ownerIds = matchingBooks.map((b: any) => b.ownerId)
        const ownerWishlists = await (prisma as any).wishlist.findMany({
            where: { userId: { in: ownerIds } }
        })

        // Map wishlists to owners
        const wishlistsByOwner = ownerWishlists.reduce((acc: any, w: any) => {
            if (!acc[w.userId]) acc[w.userId] = []
            acc[w.userId].push(w)
            return acc
        }, {})

        // 4. Filtrer pour ne garder que ceux où le propriétaire veut un de mes livres
        const smartMatches = matchingBooks.filter((book: any) => {
            const ownerWishlist = wishlistsByOwner[book.ownerId] || []
            return ownerWishlist.some((w: any) =>
                myTitles.some((myTitle: any) => myTitle.includes(w.title.toLowerCase()) || w.title.toLowerCase().includes(myTitle))
            )
        })

        return smartMatches
    } catch (error) {
        console.error('Error fetching smart matches:', error)
        return []
    }
}
