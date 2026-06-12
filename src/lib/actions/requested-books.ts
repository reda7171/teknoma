'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function addRequestedBook(title: string, author?: string) {
    try {
        const existing = await prisma.requestedBook.findFirst({
            where: { title }
        })

        if (existing) {
            await prisma.requestedBook.update({
                where: { id: existing.id },
                data: { requestCount: existing.requestCount + 1 }
            })
        } else {
            await prisma.requestedBook.create({
                data: { title, author: author || null }
            })
        }
        revalidatePath('/[locale]/admin/requested-books', 'page')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function getRequestedBooks() {
    try {
        const books = await prisma.requestedBook.findMany({
            orderBy: { requestCount: 'desc' }
        })
        return { success: true, data: books }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function updateRequestedBookStatus(id: string, status: string) {
    try {
        await prisma.requestedBook.update({
            where: { id },
            data: { status }
        })
        revalidatePath('/[locale]/admin/requested-books', 'page')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
