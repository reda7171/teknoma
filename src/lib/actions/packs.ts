'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { verifyAdmin } from '@/lib/actions/auth'
import { createAuditLog } from "@/lib/server/audit"

const optionalNonEmptyString = z.preprocess(
    value => typeof value === 'string' && value.trim() === '' ? undefined : value,
    z.string().optional()
)

// Schéma de validation pour un pack
const PackSchema = z.object({
    name: z.string().min(1, 'Le nom est requis').transform(val => val.replace(/\|/g, '-').replace(/\s+/g, ' ').trim()),
    nameFr: optionalNonEmptyString.transform(val => val?.replace(/\|/g, '-').replace(/\s+/g, ' ').trim()),
    nameEn: optionalNonEmptyString.transform(val => val?.replace(/\|/g, '-').replace(/\s+/g, ' ').trim()),
    description: z.string().optional(),
    descriptionFr: optionalNonEmptyString,
    descriptionEn: optionalNonEmptyString,
    language: z.string().default('fr'),
    price: z.number().min(0),
    originalPrice: z.number().min(0).nullable().optional(),
    image: z.string().min(1, 'L\'image est requise').optional(),
    isFreeDelivery: z.boolean().default(false),
    shippingFees: z.number().min(0).default(0),
    bookIds: z.array(z.string().uuid()).default([]),
    extraProductIds: z.array(z.string().uuid()).default([]),
    sellerSku: z.string().optional(),
    jumiaPackageContent: z.string().optional(),
    jumiaPackageContentAr: z.string().optional(),
    jumiaPackageContentFr: z.string().optional(),
    jumiaPackageContentEn: z.string().optional(),
    jumiaHighlights: z.string().optional(),
    jumiaHighlightsAr: z.string().optional(),
    jumiaHighlightsFr: z.string().optional(),
    jumiaHighlightsEn: z.string().optional(),
    isAffiliate: z.boolean().default(false).optional(),
    affiliateLink: z.string().optional(),
}).refine(
    data => data.bookIds.length + data.extraProductIds.length > 0,
    { message: 'Le pack doit contenir au moins un livre ou accessoire', path: ['bookIds'] }
)

export type PackInput = z.infer<typeof PackSchema>

export type PackResult =
    | { success: true; packId: string }
    | { success: false; error: string }

/**
 * Créer un nouveau pack
 */
export async function createPack(input: PackInput): Promise<PackResult> {
    try {
        await verifyAdmin()
        const validatedData = PackSchema.parse(input)

        // Vérifier doublon par nom
        const existing = await prisma.pack.findFirst({
            where: { name: validatedData.name }
        })

        if (existing) {
            return {
                success: false,
                error: `Un pack portant le nom "${validatedData.name}" existe déjà.`
            }
        }

        const pack = await prisma.pack.create({
            data: {
                name: validatedData.name,
                nameFr: validatedData.nameFr,
                nameEn: validatedData.nameEn,
                description: validatedData.description,
                descriptionFr: validatedData.descriptionFr,
                descriptionEn: validatedData.descriptionEn,
                language: validatedData.language || 'fr',
                price: validatedData.price,
                originalPrice: validatedData.originalPrice,
                image: validatedData.image,
                isFreeDelivery: validatedData.isFreeDelivery,
                shippingFees: validatedData.shippingFees,
                sellerSku: validatedData.sellerSku,
                jumiaPackageContent: validatedData.jumiaPackageContent || validatedData.jumiaPackageContentFr || validatedData.jumiaPackageContentAr || validatedData.jumiaPackageContentEn,
                jumiaPackageContentAr: validatedData.jumiaPackageContentAr,
                jumiaPackageContentFr: validatedData.jumiaPackageContentFr,
                jumiaPackageContentEn: validatedData.jumiaPackageContentEn,
                jumiaHighlights: validatedData.jumiaHighlights || validatedData.jumiaHighlightsFr || validatedData.jumiaHighlightsAr || validatedData.jumiaHighlightsEn,
                jumiaHighlightsAr: validatedData.jumiaHighlightsAr,
                jumiaHighlightsFr: validatedData.jumiaHighlightsFr,
                jumiaHighlightsEn: validatedData.jumiaHighlightsEn,
                isAffiliate: validatedData.isAffiliate,
                affiliateLink: validatedData.affiliateLink,
                active: true,
                jumiaStock: 0,
                books: {
                    create: validatedData.bookIds.map((bookId) => ({
                        bookId,
                    })),
                },
                extraProducts: {
                    create: validatedData.extraProductIds.map((extraProductId) => ({
                        extraProductId,
                    })),
                },
            } as any,
        })

        await createAuditLog({
            action: 'CREATE_PACK',
            entity: 'PACK',
            entityId: pack.id,
            details: JSON.stringify({
                name: pack.name,
                localizedFields: {
                    nameFr: Boolean(pack.nameFr),
                    nameEn: Boolean(pack.nameEn),
                    descriptionFr: Boolean(pack.descriptionFr),
                    descriptionEn: Boolean(pack.descriptionEn),
                },
            }),
        })

        try {
            const { submitPackToIndexNow } = await import('@/lib/indexnow')
            submitPackToIndexNow(pack.id)
        } catch (idxErr) {
            console.warn('[IndexNow] Erreur notification création pack:', idxErr)
        }

        revalidatePath('/admin/packs')
        revalidatePath('/')

        return {
            success: true,
            packId: pack.id,
        }
    } catch (error: any) {
        console.error('Erreur lors de la création du pack:', error)

        if (error instanceof z.ZodError) {
            return {
                success: false,
                error: error.issues[0].message,
            }
        }

        return {
            success: false,
            error: error.message || 'Une erreur est survenue lors de la création du pack',
        }
    }
}

/**
 * Récupérer un pack par son ID
 */
export async function getPackById(id: string) {
    try {
        const pack = await prisma.pack.findUnique({
            where: { id },
            include: {
                books: {
                    include: {
                        book: {
                            select: {
                                id: true,
                                title: true,
                                author: true,
                                price: true,
                                image: true,
                            }
                        }
                    }
                },
                extraProducts: {
                    include: { extraProduct: true }
                },
            },
        })

        if (!pack) {
            return {
                success: false,
                error: 'Pack introuvable',
                data: null,
            }
        }

        return {
            success: true,
            data: pack,
            error: null,
        }
    } catch (error) {
        console.error('Erreur lors de la récupération du pack:', error)
        return {
            success: false,
            error: 'Une erreur est survenue',
            data: null,
        }
    }
}

/**
 * Mettre à jour un pack
 */
export async function updatePack(
    id: string,
    input: PackInput
): Promise<PackResult> {
    try {
        await verifyAdmin()
        const validatedData = PackSchema.parse(input)

        const existingPack = await prisma.pack.findUnique({
            where: { id },
            select: {
                nameFr: true,
                nameEn: true,
                descriptionFr: true,
                descriptionEn: true,
            },
        })

        if (!existingPack) {
            return { success: false, error: 'Pack introuvable' }
        }

        const localizedValues = {
            nameFr: validatedData.nameFr ?? existingPack.nameFr,
            nameEn: validatedData.nameEn ?? existingPack.nameEn,
            descriptionFr: validatedData.descriptionFr ?? existingPack.descriptionFr,
            descriptionEn: validatedData.descriptionEn ?? existingPack.descriptionEn,
        }

        // Transaction pour éviter les états incohérents
        await prisma.$transaction(async (tx) => {
            // Supprimer les anciennes relations
            await tx.packBook.deleteMany({
                where: { packId: id },
            })
            await tx.packExtraProduct.deleteMany({
                where: { packId: id },
            })

            // Mettre à jour le pack avec les nouvelles relations
            await tx.pack.update({
                where: { id },
                data: {
                    name: validatedData.name,
                    nameFr: localizedValues.nameFr,
                    nameEn: localizedValues.nameEn,
                    description: validatedData.description,
                    descriptionFr: localizedValues.descriptionFr,
                    descriptionEn: localizedValues.descriptionEn,
                    language: validatedData.language || 'fr',
                    price: validatedData.price,
                    originalPrice: validatedData.originalPrice,
                    image: validatedData.image,
                    isFreeDelivery: validatedData.isFreeDelivery,
                    shippingFees: validatedData.shippingFees,
                    sellerSku: validatedData.sellerSku,
                    jumiaPackageContent: validatedData.jumiaPackageContent || validatedData.jumiaPackageContentFr || validatedData.jumiaPackageContentAr || validatedData.jumiaPackageContentEn,
                    jumiaPackageContentAr: validatedData.jumiaPackageContentAr,
                    jumiaPackageContentFr: validatedData.jumiaPackageContentFr,
                    jumiaPackageContentEn: validatedData.jumiaPackageContentEn,
                    jumiaHighlights: validatedData.jumiaHighlights || validatedData.jumiaHighlightsFr || validatedData.jumiaHighlightsAr || validatedData.jumiaHighlightsEn,
                    jumiaHighlightsAr: validatedData.jumiaHighlightsAr,
                    jumiaHighlightsFr: validatedData.jumiaHighlightsFr,
                    jumiaHighlightsEn: validatedData.jumiaHighlightsEn,
                    isAffiliate: validatedData.isAffiliate,
                    affiliateLink: validatedData.affiliateLink,
                    books: {
                        create: validatedData.bookIds.map((bookId) => ({
                            bookId,
                        })),
                    },
                    extraProducts: {
                        create: validatedData.extraProductIds.map((extraProductId) => ({
                            extraProductId,
                        })),
                    },
                } as any,
            })
        })

        await createAuditLog({
            action: 'UPDATE_PACK',
            entity: 'PACK',
            entityId: id,
            details: JSON.stringify({
                localizedFieldsPreserved: {
                    nameFr: validatedData.nameFr === undefined && Boolean(existingPack.nameFr),
                    nameEn: validatedData.nameEn === undefined && Boolean(existingPack.nameEn),
                    descriptionFr: validatedData.descriptionFr === undefined && Boolean(existingPack.descriptionFr),
                    descriptionEn: validatedData.descriptionEn === undefined && Boolean(existingPack.descriptionEn),
                },
                localizedFieldsSubmitted: {
                    nameFr: validatedData.nameFr !== undefined,
                    nameEn: validatedData.nameEn !== undefined,
                    descriptionFr: validatedData.descriptionFr !== undefined,
                    descriptionEn: validatedData.descriptionEn !== undefined,
                },
            }),
        })

        try {
            const { submitPackToIndexNow } = await import('@/lib/indexnow')
            submitPackToIndexNow(id)
        } catch (idxErr) {
            console.warn('[IndexNow] Erreur notification mise à jour pack:', idxErr)
        }

        revalidatePath('/admin/packs')
        revalidatePath('/')

        return {
            success: true,
            packId: id,
        }
    } catch (error: any) {
        console.error('Erreur lors de la mise à jour du pack:', error)

        if (error instanceof z.ZodError) {
            return {
                success: false,
                error: error.issues[0].message,
            }
        }

        return {
            success: false,
            error: error.message || 'Une erreur est survenue lors de la mise à jour du pack',
        }
    }
}

/**
 * Supprimer un pack
 */
export async function deletePack(id: string): Promise<PackResult> {
    try {
        await verifyAdmin()
        await prisma.pack.delete({
            where: { id },
        })

        revalidatePath('/admin/packs')
        revalidatePath('/')

        return {
            success: true,
            packId: id,
        }
    } catch (error: any) {
        console.error('Erreur lors de la suppression du pack:', error)
        return {
            success: false,
            error: error.message || 'Impossible de supprimer le pack',
        }
    }
}

/**
 * Activer/Désactiver un pack
 */
export async function togglePackStatus(
    id: string,
    active: boolean
): Promise<PackResult> {
    try {
        await verifyAdmin()
        await prisma.pack.update({
            where: { id },
            data: { active },
        })

        revalidatePath('/admin/packs')
        revalidatePath('/')

        return {
            success: true,
            packId: id,
        }
    } catch (error: any) {
        console.error('Erreur lors du changement de statut:', error)
        return {
            success: false,
            error: error.message || 'Impossible de changer le statut du pack',
        }
    }
}

/**
 * Récupérer les livres disponibles en stock pour le constructeur de pack sur mesure
 */
export async function getAvailableBooksForCustomPack() {
    try {
        const books = await prisma.book.findMany({
            where: {
                active: true,
                stock: { gt: 0 }
            },
            select: {
                id: true,
                title: true,
                titleFr: true,
                titleEn: true,
                language: true,
                author: true,
                price: true,
                image: true,
                stock: true,
            },
            orderBy: {
                title: 'asc'
            }
        })
        return books
    } catch (error: any) {
        console.error('Erreur getAvailableBooksForCustomPack:', error)
        return []
    }
}
