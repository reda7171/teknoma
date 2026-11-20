'use server'

import { prisma } from '@/lib/prisma'
import { getCommunityUser, checkExchangeEligibility } from '@/lib/actions/community-auth'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const BookSchema = z.object({
    title: z.string().min(1, 'Le titre est requis'),
    author: z.string().min(1, 'L\'auteur est requis'),
    condition: z.enum(['NEW', 'GOOD', 'USED']),
    description: z.string().optional(),
    isbn: z.string().optional(),
    image: z.string().optional(),
})

export type BookResult =
    | { success: true; bookId: string }
    | { success: false; error: string }

export async function addExchangeBook(formData: FormData): Promise<BookResult> {
    const user = await getCommunityUser()
    if (!user) return { success: false, error: "Vous devez être connecté" }

    // Vérifier l'éligibilité
    const isEligible = await checkExchangeEligibility(user)
    if (!isEligible) {
        return { success: false, error: "Vous devez avoir effectué au moins une commande sur PetsUnivers pour accéder au système d'échange." }
    }

    const rawData = {
        title: formData.get('title'),
        author: formData.get('author'),
        condition: formData.get('condition'),
        description: formData.get('description'),
        isbn: formData.get('isbn'),
        image: formData.get('image'),
    }

    try {
        const data = BookSchema.parse(rawData)

        // Vérifier doublon (même titre/auteur pour cet utilisateur)
        const existing = await prisma.exchangeBook.findFirst({
            where: {
                ownerId: user.id,
                title: data.title,
                author: data.author,
                status: 'AVAILABLE'
            }
        })

        if (existing) {
            return { success: false, error: "Vous avez déjà ce livre listé comme disponible." }
        }

        let seoDescription = null;
        let seoKeywords = null;
        try {
            const { generateSeoTagsForBook } = await import('@/lib/gemini');
            const seo = await generateSeoTagsForBook(data.title, data.author, data.description);
            if (seo) {
                seoDescription = seo.seoDescription;
                seoKeywords = seo.seoKeywords;
            }
        } catch (e) {
            console.error("SEO generation failed", e);
        }

        // S'assurer que le Customer existe pour satisfaire la clé étrangère ownerId
        await prisma.customer.upsert({
            where: { phone: user.phone || `temp_${user.id.slice(0, 10)}` },
            update: {
                id: user.id,
                fullName: user.fullName || 'Lecteur',
                email: user.email,
                city: user.city || undefined,
            },
            create: {
                id: user.id,
                fullName: user.fullName || 'Lecteur',
                email: user.email,
                phone: user.phone || `06000000${user.id.slice(0, 2)}`,
                city: user.city || 'Casablanca',
            }
        }).catch(() => null)

        const book = await prisma.exchangeBook.create({
            data: {
                ownerId: user.id,
                title: data.title,
                author: data.author,
                condition: data.condition as any,
                description: data.description || '',
                seoDescription,
                seoKeywords,
                isbn: data.isbn || null,
                image: data.image || null,
                status: 'AVAILABLE',
            }
        })

        // Déclencher les alertes automatiques (Email, WhatsApp, Push) pour les utilisateurs ayant ce livre dans leur wishlist dans la même ville
        import('@/lib/community-wishlist-alerts')
            .then(m => m.notifyWishlistUsersOnNewBook(book.id))
            .catch(err => console.error('[WishlistAlerts] Background trigger error:', err))

        revalidatePath('/community')
        return { success: true, bookId: book.id }

    } catch (error) {
        if (error instanceof z.ZodError) {
            return { success: false, error: error.issues[0].message }
        }
        return { success: false, error: "Erreur lors de l'ajout du livre" }
    }
}

export async function getExchangeBook(id: string) {
    const user = await getCommunityUser()
    if (!user) return null

    const book = await prisma.exchangeBook.findUnique({
        where: { id }
    })

    if (!book) return null
    if (book.ownerId !== user.id && user.role !== 'ADMIN') return null

    return book
}

export async function updateExchangeBook(id: string, formData: FormData): Promise<BookResult> {
    const user = await getCommunityUser()
    if (!user) return { success: false, error: "Vous devez être connecté" }

    const rawData = {
        title: formData.get('title'),
        author: formData.get('author'),
        condition: formData.get('condition'),
        description: formData.get('description'),
        isbn: formData.get('isbn'),
        image: formData.get('image'),
        status: formData.get('status'),
    }

    try {
        const data = BookSchema.parse(rawData)

        // Vérifier propriété du livre
        const existingBook = await prisma.exchangeBook.findUnique({
            where: { id }
        })

        if (!existingBook) {
            return { success: false, error: "Livre introuvable" }
        }
        if (existingBook.ownerId !== user.id && user.role !== 'ADMIN') {
            return { success: false, error: "Vous n'êtes pas autorisé à modifier ce livre" }
        }

        const updateData: any = {
            title: data.title,
            author: data.author,
            condition: data.condition as any,
            description: data.description || '',
            isbn: data.isbn || null,
        }

        if (data.image) {
            updateData.image = data.image
        }

        if (rawData.status) {
            updateData.status = rawData.status
        }

        await prisma.exchangeBook.update({
            where: { id },
            data: updateData
        })

        revalidatePath('/community')
        revalidatePath(`/community/books/${id}`)
        return { success: true, bookId: id }

    } catch (error) {
        if (error instanceof z.ZodError) {
            return { success: false, error: error.issues[0].message }
        }
        return { success: false, error: "Erreur lors de la mise à jour du livre" }
    }
}

export async function deleteExchangeBook(id: string): Promise<BookResult> {
    const user = await getCommunityUser()
    if (!user) return { success: false, error: "Vous devez être connecté" }

    try {
        const existingBook = await prisma.exchangeBook.findUnique({
            where: { id }
        })

        if (!existingBook) {
            return { success: false, error: "Livre introuvable" }
        }
        if (existingBook.ownerId !== user.id && user.role !== 'ADMIN') {
            return { success: false, error: "Vous n'êtes pas autorisé à supprimer ce livre" }
        }

        // Vérifier s'il est utilisé dans des échanges PENDING
        const pendingExchanges = await prisma.exchange.findFirst({
            where: {
                OR: [
                    { bookRequestedId: id },
                    { bookOfferedId: id }
                ],
                status: {
                    in: ['PENDING', 'ACCEPTED']
                }
            }
        })

        if (pendingExchanges) {
            return { success: false, error: "Impossible de supprimer ce livre car il est engagé dans un échange en cours" }
        }

        await prisma.exchangeBook.delete({
            where: { id }
        })

        revalidatePath('/community')
        return { success: true, bookId: id }
    } catch (error) {
        return { success: false, error: "Erreur lors de la suppression du livre" }
    }
}

export async function getSuggestions(query: string, type: 'title' | 'author'): Promise<string[]> {
    if (!query || query.length < 2) return []

    const isTitle = type === 'title'

    try {
        const [books, exchangeBooks] = await Promise.all([
            prisma.book.findMany({
                where: {
                    [isTitle ? 'title' : 'author']: { contains: query }
                },
                select: { [isTitle ? 'title' : 'author']: true },
                distinct: [isTitle ? 'title' : 'author'],
                take: 5
            }),
            prisma.exchangeBook.findMany({
                where: {
                    [isTitle ? 'title' : 'author']: { contains: query }
                },
                select: { [isTitle ? 'title' : 'author']: true },
                distinct: [isTitle ? 'title' : 'author'],
                take: 5
            })
        ])

        const suggestions = new Set<string>()
        books.forEach((b: any) => suggestions.add(b[isTitle ? 'title' : 'author']))
        exchangeBooks.forEach((b: any) => suggestions.add(b[isTitle ? 'title' : 'author']))

        return Array.from(suggestions).slice(0, 5)
    } catch (e) {
        return []
    }
}
