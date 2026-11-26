'use server'

import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/actions/auth'
import { revalidatePath } from 'next/cache'

export async function getProductSerials(productId: string) {
    await verifyAdmin()
    return await prisma.productSerialNumber.findMany({
        where: { productId },
        orderBy: { createdAt: 'desc' }
    })
}

export async function addProductSerials(productId: string, rawSerials: string) {
    await verifyAdmin()
    if (!productId || !rawSerials) {
        return { success: false, error: 'Données manquantes' }
    }

    const serialList = rawSerials
        .split(/[\n,;]+/)
        .map(s => s.trim())
        .filter(s => s.length > 0)

    if (serialList.length === 0) {
        return { success: false, error: 'Aucun numéro de série valide détecté' }
    }

    // Check existing
    const existing = await prisma.productSerialNumber.findMany({
        where: {
            serialNumber: { in: serialList }
        },
        select: { serialNumber: true }
    })

    const existingSet = new Set(existing.map(e => e.serialNumber))
    const toInsert = serialList.filter(s => !existingSet.has(s))

    if (toInsert.length === 0) {
        return { 
            success: false, 
            error: `Tous les numéros saisis existent déjà (${Array.from(existingSet).join(', ')})` 
        }
    }

    // Unique set to prevent duplicates in current payload
    const uniqueToInsert = Array.from(new Set(toInsert))

    await prisma.productSerialNumber.createMany({
        data: uniqueToInsert.map(sn => ({
            productId,
            serialNumber: sn,
            status: 'AVAILABLE'
        }))
    })

    revalidatePath(`/admin/products/${productId}/edit`)
    return {
        success: true,
        addedCount: uniqueToInsert.length,
        skippedCount: serialList.length - uniqueToInsert.length
    }
}

export async function deleteProductSerial(id: string, productId?: string) {
    await verifyAdmin()
    await prisma.productSerialNumber.delete({
        where: { id }
    })
    if (productId) {
        revalidatePath(`/admin/products/${productId}/edit`)
    }
    return { success: true }
}

export async function updateProductSerialStatus(id: string, status: string, notes?: string, productId?: string) {
    await verifyAdmin()
    await prisma.productSerialNumber.update({
        where: { id },
        data: {
            status,
            notes: notes !== undefined ? notes : undefined,
            updatedAt: new Date()
        }
    })
    if (productId) {
        revalidatePath(`/admin/products/${productId}/edit`)
    }
    return { success: true }
}
