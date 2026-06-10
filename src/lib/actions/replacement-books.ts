'use server'

import { prisma } from '@/lib/prisma'

export async function getReplacementBooks(originalBookId: string, limit: number = 10) {
    try {
        const originalBook = await prisma.book.findUnique({
            where: { id: originalBookId },
            select: { category: true, language: true, price: true }
        })

        if (!originalBook) {
            return []
        }

        // Trouver des livres en stock, avec prix <= prix d'origine + 20MAD (ou similaire), même langue
        const books = await prisma.book.findMany({
            where: {
                active: true,
                stock: { gt: 0 },
                id: { not: originalBookId },
                language: originalBook.language,
                // On privilégie la même catégorie si possible, sinon on cherche globalement
                category: originalBook.category ? originalBook.category : undefined,
                price: { lte: originalBook.price + 50 } // On limite à des livres qui ne coûtent pas beaucoup plus cher
            },
            take: limit,
            select: {
                id: true,
                title: true,
                author: true,
                image: true,
                price: true,
                stock: true
            },
            orderBy: {
                price: 'desc'
            }
        })

        // S'il n'y a pas assez de livres dans la même catégorie, on complète
        if (books.length < 4 && originalBook.category) {
            const moreBooks = await prisma.book.findMany({
                where: {
                    active: true,
                    stock: { gt: 0 },
                    id: { notIn: [originalBookId, ...books.map(b => b.id)] },
                    language: originalBook.language,
                    price: { lte: originalBook.price + 50 }
                },
                take: limit - books.length,
                select: {
                    id: true,
                    title: true,
                    author: true,
                    image: true,
                    price: true,
                    stock: true
                },
                orderBy: {
                    price: 'desc'
                }
            })
            return [...books, ...moreBooks]
        }

        return books
    } catch (e) {
        console.error('Failed to fetch replacement books', e)
        return []
    }
}
