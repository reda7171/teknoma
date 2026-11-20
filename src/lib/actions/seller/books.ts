'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getAdminUser, getAdminRole } from '@/lib/actions/auth'

async function getSellerId() {
    const userId = await getAdminUser()
    const role = await getAdminRole()
    
    if (!userId || role !== 'SELLER') {
        return null
    }
    return userId
}

export async function deleteSellerBook(bookId: string) {
    const sellerId = await getSellerId()
    if (!sellerId) throw new Error('Unauthorized')

    // Verify ownership
    const book = await prisma.book.findUnique({
        where: { id: bookId }
    })

    if (!book || book.sellerId !== sellerId) {
        throw new Error('Book not found or unauthorized')
    }

    await prisma.book.delete({
        where: { id: bookId }
    })

    revalidatePath('/[locale]/seller/books', 'page')
    return { success: true }
}

export async function toggleSellerBookStatus(bookId: string, currentStatus: boolean) {
    const sellerId = await getSellerId()
    if (!sellerId) throw new Error('Unauthorized')

    // Verify ownership
    const book = await prisma.book.findUnique({
        where: { id: bookId }
    })

    if (!book || book.sellerId !== sellerId) {
        throw new Error('Book not found or unauthorized')
    }

    await prisma.book.update({
        where: { id: bookId },
        data: { active: !currentStatus }
    })

    revalidatePath('/[locale]/seller/books', 'page')
    return { success: true }
}
