'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { verifyAdmin, getAdminRole, getAdminUser } from '@/lib/actions/auth'
import { createAuditLog } from './audit'
import { autoClassifyBook } from '@/lib/utils/auto-classifier'

// Schéma de validation pour un livre
import { getBooks as getBooksDb, BookFilters, getAllAuthors } from '@/lib/db/books'

const BookSchemaBase = z.object({
    title: z.string().optional().default(""),
    titleFr: z.string().optional(),
    titleEn: z.string().optional(),
    author: z.string().min(1, 'L\'auteur est requis'),
    description: z.string().optional().default(""),
    descriptionFr: z.string().optional(),
    descriptionEn: z.string().optional(),
    longDescription: z.string().optional(),
    longDescriptionFr: z.string().optional(),
    longDescriptionEn: z.string().optional(),
    isbn: z.string().optional(),
    price: z.number().min(0),
    costPrice: z.number().min(0, 'Le coût ne peut pas être négatif').default(0),
    stock: z.number().int().min(0, 'Le stock ne peut pas être négatif'),
    image: z.string().min(1, 'L\'image est requise'),
    category: z.string().optional(),
    subCategory: z.string().optional(),
    language: z.string().optional().default('fr'),
    active: z.boolean().optional(),
    status: z.string().optional(),
    isBestSeller: z.boolean().optional(),
    previewUrl: z.string().optional(),
    isOriginal: z.boolean().optional().default(true),
    sellerSku: z.string().optional(),
    jumiaPriceMarkup: z.number().int().min(0).max(100).optional().default(0),
    isSyncedWithJumia: z.boolean().optional(),
    jumiaProductSid: z.string().optional(),
    jumiaPackageContent: z.string().optional(),
    jumiaHighlights: z.string().optional(),
    isAffiliate: z.boolean().optional(),
    affiliateLink: z.string().nullable().optional(),
    seoKeywords: z.string().nullable().optional(),
    condition: z.enum(['NEW', 'GOOD', 'USED']).optional().default('NEW'),
})

const BookSchema = BookSchemaBase.superRefine((data, ctx) => {
    if (data.language === 'ar') {
        if (!data.title || data.title.trim() === '') {
            ctx.addIssue({ path: ['title'], code: z.ZodIssueCode.custom, message: "Le titre en arabe est requis" })
        }
        if (!data.description || data.description.trim() === '') {
            ctx.addIssue({ path: ['description'], code: z.ZodIssueCode.custom, message: "La description en arabe est requise" })
        }
    } else if (data.language === 'fr') {
        if (!data.titleFr || data.titleFr.trim() === '') {
            ctx.addIssue({ path: ['titleFr'], code: z.ZodIssueCode.custom, message: "Le titre en français est requis" })
        }
        if (!data.descriptionFr || data.descriptionFr.trim() === '') {
            ctx.addIssue({ path: ['descriptionFr'], code: z.ZodIssueCode.custom, message: "La description en français est requise" })
        }
    } else if (data.language === 'en') {
        if (!data.titleEn || data.titleEn.trim() === '') {
            ctx.addIssue({ path: ['titleEn'], code: z.ZodIssueCode.custom, message: "Le titre en anglais est requis" })
        }
        if (!data.descriptionEn || data.descriptionEn.trim() === '') {
            ctx.addIssue({ path: ['descriptionEn'], code: z.ZodIssueCode.custom, message: "La description en anglais est requise" })
        }
    }
})

export type BookInput = z.infer<typeof BookSchemaBase>

export type BookResult =
    | { success: true; bookId: string }
    | { success: false; error: string }

/**
 * Créer un nouveau livre
 */
export async function createBook(input: BookInput): Promise<BookResult> {
    try {
        await verifyAdmin()
        const validatedData = BookSchema.parse(input)

        // Vérifier doublons
        const existing = await prisma.book.findFirst({
            where: {
                OR: [
                    validatedData.isbn ? { isbn: validatedData.isbn } : undefined,
                    { title: validatedData.title, author: validatedData.author }
                ].filter(Boolean) as any
            }
        })

        if (existing) {
            return {
                success: false,
                error: existing.isbn === validatedData.isbn
                    ? `Un livre avec l'ISBN ${existing.isbn} existe déjà.`
                    : `Le livre "${validatedData.title}" par ${validatedData.author} existe déjà.`
            }
        }

        const role = await getAdminRole()
        const userId = await getAdminUser()
        
        let additionalData: any = {}
        if (role === 'SELLER' && userId) {
            additionalData = {
                sellerId: userId,
                status: 'PENDING'
            }
        }

        const cleanIsbn = validatedData.isbn?.trim() ? validatedData.isbn.trim() : null

        if (cleanIsbn) {
            const existingWithIsbn = await prisma.book.findFirst({
                where: { isbn: cleanIsbn },
                select: { id: true, title: true }
            })
            if (existingWithIsbn) {
                return {
                    success: false,
                    error: `Cet ISBN (${cleanIsbn}) est déjà attribué au livre "${existingWithIsbn.title}".`
                }
            }
        }

        const classification = autoClassifyBook({
            title: validatedData.title,
            author: validatedData.author,
            description: validatedData.description,
            language: validatedData.language,
            category: validatedData.category,
            subCategory: validatedData.subCategory
        })

        const book = await prisma.book.create({
            data: {
                ...validatedData,
                category: classification.category,
                subCategory: classification.subCategory,
                isbn: cleanIsbn,
                active: validatedData.active ?? true,
                isOriginal: validatedData.isOriginal ?? true,
                ...additionalData,
            },
        })

        revalidatePath('/admin/books')
        revalidatePath('/sitemap.xml')
        revalidatePath('/[locale]/books', 'page')
        revalidatePath('/books')
        revalidatePath('/')

        await createAuditLog({
            action: 'CREATE',
            entity: 'BOOK',
            entityId: book.id,
            details: `Livre créé: ${book.title} par ${book.author}`
        })

        try {
            const { submitBookToIndexNow } = await import('@/lib/indexnow')
            submitBookToIndexNow(book.id)
        } catch (idxErr) {
            console.warn('[IndexNow] Erreur notification création livre:', idxErr)
        }

        if (book.image) {
            try {
                const { getImageBuffer, indexCoverBuffer } = await import('@/lib/actions/gemini-cache')
                const imgBuffer = await getImageBuffer(book.image)
                if (imgBuffer) {
                    await indexCoverBuffer(imgBuffer, book.title, book.author || undefined)
                }
            } catch (cacheErr) {
                console.warn('[GeminiCache] Erreur indexation auto couverture création livre:', cacheErr)
            }
        }

        return {
            success: true,
            bookId: book.id,
        }
    } catch (error: any) {
        console.error('Erreur lors de la création du livre:', error)

        if (error?.code === 'P2002') {
            const target = String(error.meta?.target || '')
            if (target.includes('isbn')) {
                return {
                    success: false,
                    error: 'Cet ISBN est déjà attribué à un autre livre dans le catalogue.'
                }
            }
            if (target.includes('sellerSku')) {
                return {
                    success: false,
                    error: 'Ce SKU vendeur est déjà attribué à un autre livre.'
                }
            }
            return {
                success: false,
                error: 'Une valeur unique existe déjà pour un autre livre.'
            }
        }

        if (error instanceof z.ZodError) {
            return {
                success: false,
                error: error.issues[0].message,
            }
        }

        return {
            success: false,
            error: error.message || 'Une erreur est survenue lors de la création du livre',
        }
    }
}

/**
 * Récupérer un livre par son ID
 */
export async function getBookById(id: string) {
    try {
        const book = await prisma.book.findUnique({
            where: { id },
            include: {
                customerSeller: true,
                packBooks: {
                    include: {
                        pack: { select: { id: true, name: true, active: true } }
                    }
                },
                seoCategoryBooks: {
                    include: {
                        seoCategory: { select: { id: true, title: true, slug: true } }
                    }
                }
            }
        })

        if (!book) {
            return {
                success: false,
                error: 'Livre introuvable',
                data: null,
            }
        }

        // Normaliser l'image Base64 brute (ex: import depuis Odoo)
        // Note: /9j/ = en-tête JPEG base64, PAS un chemin local
        let image = book.image?.trim() || ''
        if (!image || image.startsWith('data:') || image.startsWith('http')) {
            // déjà valide
        } else if (image.startsWith('/9j/')) {
            image = 'data:image/jpeg;base64,' + image
        } else if (image.startsWith('iVBOR')) {
            image = 'data:image/png;base64,' + image
        } else if (!image.startsWith('/') && image.length > 100) {
            image = 'data:image/jpeg;base64,' + image
        }

        // Statistiques réelles du livre : commandes, visites, ajouts au panier
        const [orders, orderQuantityAgg] = await Promise.all([
            prisma.orderItem.findMany({
                where: { bookId: id },
                select: { orderId: true },
                distinct: ['orderId']
            }),
            prisma.orderItem.aggregate({ where: { bookId: id }, _sum: { quantity: true } }),
        ])

        const stats = {
            ordersCount: orders.length,
            unitsSold: orderQuantityAgg._sum.quantity || 0,
            viewsCount: book.views || 0,
            cartCount: book.cartAdditions || 0
        }

        return {
            success: true,
            data: { ...book, image, stats },
            error: null,
        }
    } catch (error) {
        console.error('Erreur lors de la récupération du livre:', error)
        return {
            success: false,
            error: 'Une erreur est survenue',
            data: null,
        }
    }
}

/**
 * Mettre à jour un livre
 */
export async function updateBook(
    id: string,
    input: BookInput
): Promise<BookResult> {
    try {
        await verifyAdmin()
        const validatedData = BookSchema.parse(input)
        
        const existingBook = await prisma.book.findUnique({ where: { id } })
        
        if (!existingBook) {
            throw new Error('Livre introuvable')
        }

        const role = await getAdminRole()
        const userId = await getAdminUser()
        
        if (role === 'SELLER' && existingBook.sellerId !== userId) {
            throw new Error('Non autorisé - Ce livre ne vous appartient pas')
        }

        const cleanIsbn = validatedData.isbn?.trim() ? validatedData.isbn.trim() : null

        if (cleanIsbn) {
            const existingWithIsbn = await prisma.book.findFirst({
                where: {
                    isbn: cleanIsbn,
                    id: { not: id }
                },
                select: { id: true, title: true }
            })
            if (existingWithIsbn) {
                return {
                    success: false,
                    error: `Cet ISBN (${cleanIsbn}) est déjà attribué au livre "${existingWithIsbn.title}".`
                }
            }
        }

        await prisma.book.update({
            where: { id },
            data: {
                ...validatedData,
                isbn: cleanIsbn,
                longDescription: validatedData.longDescription || null,
            },
        })

        if (existingBook && existingBook.stock !== validatedData.stock && existingBook.sellerSku) {
            try {
                const { syncJumiaStockForBooksBackground } = await import('@/lib/actions/jumia')
                syncJumiaStockForBooksBackground([existingBook.id]).catch(console.error)
                
                const { sendTelegramMessage } = await import('@/lib/telegram')
                await sendTelegramMessage(`🔄 <b>Stock Jumia Mis à Jour (Édition)</b>\n\n📖 Livre: ${validatedData.title || existingBook.title}\n📦 Ancien: ${existingBook.stock} ➔ Nouveau: ${validatedData.stock}\n🔢 SKU: ${existingBook.sellerSku}`)
            } catch (err) {
                console.error("Erreur sync jumia:", err)
            }
        }

        revalidatePath('/admin/books')
        revalidatePath('/books/[id]', 'page')
        revalidatePath('/[locale]/books/[id]', 'page')
        revalidatePath('/sitemap.xml')
        revalidatePath('/[locale]/books', 'page')
        revalidatePath('/books')
        revalidatePath('/')

        await createAuditLog({
            action: 'UPDATE',
            entity: 'BOOK',
            entityId: id,
            details: `Livre mis à jour: ${validatedData.title}`
        })

        try {
            const { submitBookToIndexNow } = await import('@/lib/indexnow')
            submitBookToIndexNow(id)
        } catch (idxErr) {
            console.warn('[IndexNow] Erreur notification mise à jour livre:', idxErr)
        }

        if (validatedData.image) {
            try {
                const { getImageBuffer, indexCoverBuffer } = await import('@/lib/actions/gemini-cache')
                const imgBuffer = await getImageBuffer(validatedData.image)
                if (imgBuffer) {
                    await indexCoverBuffer(imgBuffer, validatedData.title, validatedData.author || undefined)
                }
            } catch (cacheErr) {
                console.warn('[GeminiCache] Erreur indexation auto couverture mise à jour livre:', cacheErr)
            }
        }

        return {
            success: true,
            bookId: id,
        }
    } catch (error: any) {
        console.error('Erreur lors de la mise à jour du livre:', error)

        if (error?.code === 'P2002') {
            const target = String(error.meta?.target || '')
            if (target.includes('isbn')) {
                return {
                    success: false,
                    error: 'Cet ISBN est déjà attribué à un autre livre dans le catalogue.'
                }
            }
            if (target.includes('sellerSku')) {
                return {
                    success: false,
                    error: 'Ce SKU vendeur est déjà attribué à un autre livre.'
                }
            }
            return {
                success: false,
                error: 'Une valeur unique existe déjà pour un autre livre.'
            }
        }

        if (error instanceof z.ZodError) {
            return {
                success: false,
                error: error.issues[0].message,
            }
        }

        return {
            success: false,
            error: error.message || 'Une erreur est survenue lors de la mise à jour du livre',
        }
    }
}

/**
 * Mise à jour rapide (stock et prix)
 */
export async function updateBookQuick(
    id: string,
    data: { price: number; stock: number; active: boolean }
): Promise<BookResult> {
    try {
        await verifyAdmin()
        const existingBook = await prisma.book.findUnique({ where: { id } })
        
        if (!existingBook) {
            throw new Error('Livre introuvable')
        }

        const role = await getAdminRole()
        const userId = await getAdminUser()
        
        if (role === 'SELLER' && existingBook.sellerId !== userId) {
            throw new Error('Non autorisé - Ce livre ne vous appartient pas')
        }
        const updated = await prisma.book.update({
            where: { id },
            data: {
                price: Number(data.price),
                stock: Number(data.stock),
                active: data.active
            },
        })

        if (existingBook && existingBook.stock !== updated.stock && existingBook.sellerSku) {
            try {
                const { syncJumiaStockForBooksBackground } = await import('@/lib/actions/jumia')
                syncJumiaStockForBooksBackground([existingBook.id]).catch(console.error)
                
                const { sendTelegramMessage } = await import('@/lib/telegram')
                await sendTelegramMessage(`⚡ <b>Stock Jumia Mis à Jour (Édition Rapide)</b>\n\n📖 Livre: ${updated.title}\n📦 Ancien: ${existingBook.stock} ➔ Nouveau: ${updated.stock}\n🔢 SKU: ${existingBook.sellerSku}`)
            } catch (err) {
                console.error("Erreur sync jumia:", err)
            }
        }

        if (updated.stock < 3) {
            const { sendLowStockNotification } = await import('@/lib/telegram')
            sendLowStockNotification({ id: updated.id, title: updated.title, stock: updated.stock }).catch(console.error)
        }

        revalidatePath('/admin/books')
        revalidatePath('/')

        await createAuditLog({
            action: 'UPDATE',
            entity: 'BOOK',
            entityId: id,
            details: `Mise à jour rapide - Prix: ${data.price}, Stock: ${data.stock}`
        })

        return { success: true, bookId: id }
    } catch (error: any) {
        console.error('Erreur lors de la mise à jour rapide:', error)
        return { success: false, error: 'Impossible de mettre à jour le livre' }
    }
}

/**
 * Supprimer un livre
 */
export async function deleteBook(id: string): Promise<BookResult> {
    try {
        await verifyAdmin()
        
        const existingBook = await prisma.book.findUnique({ where: { id } })
        if (!existingBook) {
            throw new Error('Livre introuvable')
        }

        const role = await getAdminRole()
        const userId = await getAdminUser()
        
        if (role === 'SELLER' && existingBook.sellerId !== userId) {
            throw new Error('Non autorisé - Ce livre ne vous appartient pas')
        }

        await prisma.book.delete({
            where: { id },
        })

        revalidatePath('/admin/books')
        revalidatePath('/')

        await createAuditLog({
            action: 'DELETE',
            entity: 'BOOK',
            entityId: id,
        })

        return {
            success: true,
            bookId: id,
        }
    } catch (error: any) {
        console.error('Erreur lors de la suppression du livre:', error)
        return {
            success: false,
            error: error.message || 'Impossible de supprimer le livre',
        }
    }
}

/**
 * Activer/Désactiver un livre
 */
export async function toggleBookStatus(
    id: string,
    active: boolean
): Promise<BookResult> {
    try {
        await verifyAdmin()
        await prisma.book.update({
            where: { id },
            data: { active },
        })

        revalidatePath('/admin/books')
        revalidatePath('/')

        await createAuditLog({
            action: 'TOGGLE_STATUS',
            entity: 'BOOK',
            entityId: id,
            details: `Statut changé à: ${active ? 'Actif' : 'Inactif'}`
        })

        return {
            success: true,
            bookId: id,
        }
    } catch (error: any) {
        console.error('Erreur lors du changement de statut:', error)
        return {
            success: false,
            error: error.message || 'Impossible de changer le statut du livre',
        }
    }
}

/**
 * Approuver un livre (Admin)
 */
export async function approveBook(id: string): Promise<BookResult> {
    try {
        await verifyAdmin()
        const book = await prisma.book.update({
            where: { id },
            data: { active: true, status: 'APPROVED' },
            include: { customerSeller: true, seller: true }
        })

        if (book.customerSeller || book.seller) {
            const { sendSellerBookApproved } = await import('@/lib/email')
            sendSellerBookApproved(book).catch(console.error)
        }

        revalidatePath('/admin/books/pending')
        revalidatePath('/admin/books')
        revalidatePath('/')

        return { success: true, bookId: id }
    } catch (error: any) {
        return { success: false, error: 'Impossible d\'approuver le livre' }
    }
}

/**
 * Rejeter un livre (Admin)
 */
export async function rejectBook(id: string): Promise<BookResult> {
    try {
        await verifyAdmin()
        
        const book = await prisma.book.findUnique({
            where: { id },
            include: { customerSeller: true, seller: true }
        })

        if (!book) return { success: false, error: 'Livre introuvable' }

        await prisma.book.delete({
            where: { id },
        })

        if (book.customerSeller || book.seller) {
            const { sendSellerBookRejected } = await import('@/lib/email')
            sendSellerBookRejected(book, 'Non respect de nos critères de sélection').catch(console.error)
        }

        revalidatePath('/admin/books/pending')
        revalidatePath('/admin/books')

        return { success: true, bookId: id }
    } catch (error: any) {
        return { success: false, error: 'Impossible de rejeter le livre' }
    }
}

/**
 * Récupérer tous les auteurs pour l'admin
 */
export async function fetchAllAuthors() {
    try {
        const authors = await getAllAuthors()
        return { success: true, data: authors }
    } catch (error) {
        console.error('Error fetching authors:', error)
        return { success: false, error: 'Failed to fetch authors', data: [] }
    }
}

/**
 * Récupérer les livres avec pagination pour le client (Server Action)
 */
export async function fetchBooks(filters: BookFilters) {
    try {
        const books = await getBooksDb(filters)
        return { success: true, data: books }
    } catch (error) {
        console.error('Error fetching books:', error)
        return { success: false, error: 'Failed to fetch books', data: [] }
    }
}

/**
 * Supprimer plusieurs livres en masse
 */
export async function bulkDeleteBooks(ids: string[]) {
    try {
        await verifyAdmin()
        await prisma.book.deleteMany({
            where: { id: { in: ids } },
        })

        revalidatePath('/admin/books')
        revalidatePath('/')

        await createAuditLog({
            action: 'BULK_DELETE',
            entity: 'BOOK',
            details: `${ids.length} livres supprimés`,
        })

        return { success: true }
    } catch (error: any) {
        console.error('Erreur lors de la suppression en masse:', error)
        return { success: false, error: 'Impossible de supprimer les livres sélectionnés' }
    }
}

/**
 * Récupérer tous les livres actifs pour le catalogue PDF ou Image (avec support entrepôt)
 */
export async function getAllBooksForCatalog(warehouseId?: string) {
    try {
        await verifyAdmin()
        const whereClause: any = { active: true }
        if (warehouseId && warehouseId !== 'all') {
            whereClause.inventories = {
                some: {
                    warehouseId,
                    quantity: { gt: 0 }
                }
            }
        } else {
            whereClause.stock = { gt: 0 }
        }

        const books = await prisma.book.findMany({
            where: whereClause,
            orderBy: { title: 'asc' },
            select: {
                id: true,
                title: true,
                titleFr: true,
                titleEn: true,
                author: true,
                price: true,
                image: true,
                description: true,
                descriptionFr: true,
                descriptionEn: true,
                category: true,
                language: true,
                stock: true,
                createdAt: true,
                inventories: {
                    select: {
                        warehouseId: true,
                        quantity: true
                    }
                }
            }
        })

        return {
            success: true,
            data: books
        }
    } catch (error: any) {
        console.error('Erreur lors de la récupération des livres pour le catalogue:', error)
        return {
            success: false,
            error: 'Impossible de récupérer les livres'
        }
    }
}

/**
 * Vider toute la bibliothèque (Supprimer tous les livres)
 */
export async function deleteAllBooks(): Promise<BookResult> {
    try {
        await verifyAdmin()
        await prisma.book.deleteMany({})

        revalidatePath('/admin/books')
        revalidatePath('/')

        await createAuditLog({
            action: 'DELETE_ALL',
            entity: 'BOOK',
            details: 'Toute la bibliothèque a été supprimée'
        })

        return { success: true, bookId: 'all' }
    } catch (error: any) {
        console.error('Erreur lors de la suppression de tous les livres:', error)
        return { success: false, error: 'Impossible de vider la bibliothèque' }
    }
}

/**
 * Mettre à jour l'ordre d'affichage des livres
 */
export async function updateBookOrder(orderedIds: string[], pageOffset: number = 0) {
    try {
        await verifyAdmin()
        
        const MANUAL_ORDER_BASE = -1000000
        // Mise à jour groupée de l'ordre avec une base négative pour passer devant le par défaut (0)
        await prisma.$transaction(
            orderedIds.map((id, index) => 
                prisma.book.update({
                    where: { id },
                    data: { displayOrder: MANUAL_ORDER_BASE + pageOffset + index }
                })
            )
        )

        revalidatePath('/admin/books')
        revalidatePath('/')
        
        return { success: true }
    } catch (error: any) {
        console.error('Erreur lors de la mise à jour de l\'ordre:', error)
        return { success: false, error: 'Impossible de mettre à jour l\'ordre' }
    }
}
/**
 * Mettre à jour les prix en masse
 */
export async function bulkUpdateBookPrices(ids: string[], newPrice: number) {
    try {
        await verifyAdmin()
        await prisma.book.updateMany({
            where: { id: { in: ids } },
            data: { price: Number(newPrice) },
        })

        await prisma.extraProduct.updateMany({
            where: { id: { in: ids } },
            data: { price: Number(newPrice) },
        }).catch(() => null)

        revalidatePath('/admin/books')
        revalidatePath('/')

        await createAuditLog({
            action: 'BULK_UPDATE_PRICE',
            entity: 'BOOK',
            details: `Prix mis à jour pour ${ids.length} livres: ${newPrice} درهم`,
        })

        return { success: true }
    } catch (error: any) {
        console.error('Erreur lors de la mise à jour des prix en masse:', error)
        return { success: false, error: 'Impossible de mettre à jour les prix' }
    }
}

/**
 * Mettre à jour la langue de plusieurs livres.
 */
export async function bulkUpdateBookLanguages(ids: string[], language: string) {
    try {
        await verifyAdmin()

        const validLanguages = ['fr', 'ar', 'en'] as const
        if (!validLanguages.includes(language as typeof validLanguages[number])) {
            return { success: false, error: 'Langue invalide' }
        }

        const uniqueIds = [...new Set(ids.filter(id => typeof id === 'string' && id.trim()))]
        if (uniqueIds.length === 0 || uniqueIds.length > 500) {
            return { success: false, error: 'Sélection de livres invalide' }
        }

        const role = await getAdminRole()
        const userId = await getAdminUser()
        const where = {
            id: { in: uniqueIds },
            ...(role === 'SELLER' && userId ? { sellerId: userId } : {}),
        }

        const result = await prisma.book.updateMany({
            where,
            data: { language },
        })

        revalidatePath('/admin/books')
        revalidatePath('/')

        await createAuditLog({
            action: 'BULK_UPDATE_LANGUAGE',
            entity: 'BOOK',
            details: `Langue mise à jour pour ${result.count} livre(s) : ${language}`,
        })

        return { success: true, count: result.count }
    } catch (error: unknown) {
        console.error('Erreur lors de la mise à jour des langues en masse:', error)
        return { success: false, error: 'Impossible de mettre à jour les langues' }
    }
}

/**
 * Mettre à jour le stock en masse (par entrepôt ou global)
 */
export async function bulkUpdateBookStock(ids: string[], newStock: number, warehouseId?: string) {
    try {
        await verifyAdmin()
        const role = await getAdminRole()
        const userId = await getAdminUser()
        const stockValue = Math.max(0, Math.floor(Number(newStock)))

        const whereBook: any = { id: { in: ids } }
        if (role === 'SELLER' && userId) {
            whereBook.sellerId = userId
        }

        let warehouseName = 'Stock Total'

        if (!warehouseId || warehouseId === 'TOTAL') {
            await prisma.book.updateMany({
                where: whereBook,
                data: { stock: stockValue },
            })

            await prisma.extraProduct.updateMany({
                where: { id: { in: ids } },
                data: { stock: stockValue },
            }).catch(() => null)
        } else {
            const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId } })
            if (!warehouse) throw new Error('Entrepôt introuvable')
            warehouseName = warehouse.name

            const validBooks = await prisma.book.findMany({
                where: whereBook,
                select: { id: true }
            })
            const validBookIds = validBooks.map(b => b.id)

            for (const bookId of validBookIds) {
                await prisma.inventory.upsert({
                    where: { bookId_warehouseId: { bookId, warehouseId } },
                    update: { quantity: stockValue },
                    create: { bookId, warehouseId, quantity: stockValue }
                })

                const agg = await prisma.inventory.aggregate({
                    where: { bookId },
                    _sum: { quantity: true }
                })
                await prisma.book.update({
                    where: { id: bookId },
                    data: { stock: agg._sum.quantity ?? stockValue }
                })
            }

            const extraProducts = await prisma.extraProduct.findMany({
                where: { id: { in: ids } },
                select: { id: true }
            })
            for (const extra of extraProducts) {
                await prisma.inventory.upsert({
                    where: { extraProductId_warehouseId: { extraProductId: extra.id, warehouseId } },
                    update: { quantity: stockValue },
                    create: { extraProductId: extra.id, warehouseId, quantity: stockValue }
                }).catch(() => null)

                const agg = await prisma.inventory.aggregate({
                    where: { extraProductId: extra.id },
                    _sum: { quantity: true }
                })
                await prisma.extraProduct.update({
                    where: { id: extra.id },
                    data: { stock: agg._sum.quantity ?? stockValue }
                }).catch(() => null)
            }
        }

        // Déclencher la synchronisation Jumia en arrière-plan si applicable
        try {
            const { syncJumiaStockForBooksBackground } = await import('@/lib/actions/jumia')
            syncJumiaStockForBooksBackground(ids).catch(() => null)
        } catch {}

        revalidatePath('/admin/books')
        revalidatePath('/')

        await createAuditLog({
            action: 'BULK_UPDATE_STOCK',
            entity: 'BOOK',
            details: `Stock mis à jour pour ${ids.length} livres: ${stockValue} (${warehouseName})`,
        })

        return { success: true }
    } catch (error: any) {
        console.error('Erreur lors de la mise à jour du stock en masse:', error)
        return { success: false, error: error.message || 'Impossible de mettre à jour le stock' }
    }
}

export interface AiBookUpdateData {
    id: string
    title_ar?: string
    title_fr?: string
    title_en?: string
    title?: string
    titleFr?: string
    titleEn?: string
    author?: string
    isbn?: string
    description_ar?: string
    description_fr?: string
    description_en?: string
    description?: string
    descriptionFr?: string
    descriptionEn?: string
    longDescription_ar?: string
    longDescription_fr?: string
    longDescription_en?: string
    longDescription?: string
    longDescriptionFr?: string
    longDescriptionEn?: string
    category?: string
    subCategory?: string
    seoKeywords?: string | string[]
    jumiaHighlights?: string
    jumiaPackageContent?: string
}

/**
 * Mettre à jour des livres en masse depuis la réponse IA (ChatGPT)
 */
export async function bulkUpdateBooksFromAi(booksData: AiBookUpdateData[]) {
    try {
        await verifyAdmin()
        if (!Array.isArray(booksData) || booksData.length === 0) {
            return { success: false, error: 'Aucune donnée fournie' }
        }

        let updatedCount = 0

        for (const item of booksData) {
            if (!item || !item.id) continue

            const dataToUpdate: any = {}

            const tAr = item.title_ar || item.title
            const tFr = item.title_fr || item.titleFr
            const tEn = item.title_en || item.titleEn
            if (tAr) dataToUpdate.title = tAr.trim()
            if (tFr) dataToUpdate.titleFr = tFr.trim()
            if (tEn) dataToUpdate.titleEn = tEn.trim()

            if (item.author) dataToUpdate.author = item.author.trim()
            if (item.isbn) dataToUpdate.isbn = item.isbn.trim()

            const dAr = item.description_ar || item.description
            const dFr = item.description_fr || item.descriptionFr
            const dEn = item.description_en || item.descriptionEn
            if (dAr) dataToUpdate.description = dAr.trim()
            if (dFr) dataToUpdate.descriptionFr = dFr.trim()
            if (dEn) dataToUpdate.descriptionEn = dEn.trim()

            const ldAr = item.longDescription_ar || item.longDescription
            const ldFr = item.longDescription_fr || item.longDescriptionFr
            const ldEn = item.longDescription_en || item.longDescriptionEn
            if (ldAr) dataToUpdate.longDescription = ldAr.trim()
            if (ldFr) dataToUpdate.longDescriptionFr = ldFr.trim()
            if (ldEn) dataToUpdate.longDescriptionEn = ldEn.trim()

            if (item.category) dataToUpdate.category = item.category.trim()
            if (item.subCategory) dataToUpdate.subCategory = item.subCategory.trim()

            if (item.seoKeywords) {
                dataToUpdate.seoKeywords = Array.isArray(item.seoKeywords)
                    ? item.seoKeywords.join(', ')
                    : String(item.seoKeywords).trim()
            }

            if (item.jumiaHighlights) dataToUpdate.jumiaHighlights = item.jumiaHighlights.trim()
            if (item.jumiaPackageContent) dataToUpdate.jumiaPackageContent = item.jumiaPackageContent.trim()

            if (Object.keys(dataToUpdate).length > 0) {
                await prisma.book.update({
                    where: { id: item.id },
                    data: dataToUpdate,
                })
                updatedCount++
            }
        }

        revalidatePath('/admin/books')
        revalidatePath('/')
        revalidatePath('/books')

        await createAuditLog({
            action: 'BULK_AI_UPDATE',
            entity: 'BOOK',
            details: `Mise à jour IA (ChatGPT) pour ${updatedCount} livre(s)`,
        })

        return { success: true, count: updatedCount }
    } catch (error: any) {
        console.error('Erreur lors de la mise à jour bulk IA:', error)
        return { success: false, error: error.message || 'Impossible de mettre à jour les livres depuis l\'IA' }
    }
}

/**
 * Générer automatiquement des SKU uniques pour les livres sans SKU
 */
export async function bulkGenerateSkus(ids?: string[]): Promise<{
    success: boolean
    count?: number
    error?: string
    updatedMap?: Record<string, string>
}> {
    try {
        await verifyAdmin()
        const role = await getAdminRole()
        const userId = await getAdminUser()

        const where: any = {
            OR: [
                { sellerSku: null },
                { sellerSku: '' }
            ]
        }
        if (ids && ids.length > 0) {
            where.id = { in: ids }
        }
        if (role === 'SELLER' && userId) {
            where.sellerId = userId
        }

        const booksWithoutSku = await prisma.book.findMany({
            where,
            select: { id: true, title: true }
        })

        if (booksWithoutSku.length === 0) {
            return { success: true, count: 0, updatedMap: {} }
        }

        const updatedMap: Record<string, string> = {}
        const nowBase = Date.now().toString(36).toUpperCase()

        for (let i = 0; i < booksWithoutSku.length; i++) {
            const b = booksWithoutSku[i]
            const indexHex = (i + 1).toString(16).padStart(4, '0').toUpperCase()
            const randHex = Math.random().toString(36).substring(2, 5).toUpperCase()
            const generatedSku = `RIW-${nowBase}-${indexHex}${randHex}`

            await prisma.book.update({
                where: { id: b.id },
                data: { sellerSku: generatedSku }
            })
            updatedMap[b.id] = generatedSku
        }

        revalidatePath('/admin/books')
        revalidatePath('/')

        await createAuditLog({
            action: 'BULK_GENERATE_SKU',
            entity: 'BOOK',
            details: `Génération automatique de SKU pour ${booksWithoutSku.length} livre(s)`,
        })

        return { success: true, count: booksWithoutSku.length, updatedMap }
    } catch (error: any) {
        console.error('Erreur lors de la génération automatique des SKU:', error)
        return { success: false, error: error.message || 'Impossible de générer les SKU' }
    }
}



export async function incrementBookViews(id: string, userSession: string = 'Visiteur Anonyme') {
    try {
        await prisma.book.updateMany({
            where: { id },
            data: { views: { increment: 1 } }
        })
        


        return { success: true }
    } catch (error: any) {
        if (error.code === 'P2025') {
            return { success: false, error: 'Book not found' }
        }
        console.error('Erreur lors de l\'incrémentation des vues du livre:', error)
        return { success: false, error: 'Impossible d\'incrémenter les vues' }
    }
}
