'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getQuotes(search?: string, tag?: string) {
    const where: any = {}
    if (search) {
        where.OR = [
            { text: { contains: search } },
            { author: { contains: search } }
        ]
    }
    if (tag) {
        where.tags = { contains: tag }
    }

    return await (prisma as any).quote.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
            book: {
                select: {
                    title: true,
                    image: true
                }
            }
        }
    })
}

export async function getQuote(id: string) {
    return await (prisma as any).quote.findUnique({
        where: { id },
        include: {
            book: {
                select: { id: true, title: true }
            }
        }
    })
}

export async function createQuote(data: {
    text: string
    author: string
    source?: string
    bookId?: string
    tags?: string
    isActive?: boolean
}) {
    const quote = await (prisma as any).quote.create({
        data: {
            text: data.text,
            author: data.author,
            source: data.source || null,
            bookId: data.bookId || null,
            tags: data.tags || null,
            isActive: data.isActive ?? true
        }
    })
    
    revalidatePath('/[locale]/quotes', 'layout')
    revalidatePath('/[locale]/admin/quotes', 'layout')
    return quote
}

export async function updateQuote(id: string, data: {
    text?: string
    author?: string
    source?: string
    bookId?: string
    tags?: string
    isActive?: boolean
}) {
    const quote = await (prisma as any).quote.update({
        where: { id },
        data: {
            text: data.text,
            author: data.author,
            source: data.source || null,
            bookId: data.bookId || null,
            tags: data.tags || null,
            isActive: data.isActive
        }
    })
    
    revalidatePath('/[locale]/quotes', 'layout')
    revalidatePath('/[locale]/admin/quotes', 'layout')
    return quote
}

export async function deleteQuote(id: string) {
    await (prisma as any).quote.delete({
        where: { id }
    })
    
    revalidatePath('/[locale]/quotes', 'layout')
    revalidatePath('/[locale]/admin/quotes', 'layout')
}

export async function getPopularQuoteTags() {
    // Basic aggregation for tags, usually needs complex querying or processing in app
    const quotes = await (prisma as any).quote.findMany({
        select: { tags: true },
        where: { isActive: true }
    })
    
    const tagCounts: Record<string, number> = {}
    
    quotes.forEach((q: any) => {
        if (q.tags) {
            const tagsList = q.tags.split(',').map((t: string) => t.trim().toLowerCase()).filter(Boolean)
            tagsList.forEach((t: string) => {
                tagCounts[t] = (tagCounts[t] || 0) + 1
            })
        }
    })
    
    return Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .map(([name, count]) => ({ name, count }))
}
