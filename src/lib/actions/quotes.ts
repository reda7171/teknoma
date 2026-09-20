'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getQuotes(search?: string, tag?: string, locale?: string) {
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
    if (locale) {
        where.locale = locale
    }
    // Note: getQuotes will be updated to filter by locale if passed, or fetch all.
    // We'll leave this as-is and update getQuotes to take locale in a future step if needed.

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
    locale?: string
    isActive?: boolean
}) {
    const quote = await (prisma as any).quote.create({
        data: {
            text: data.text,
            author: data.author,
            source: data.source || null,
            bookId: data.bookId || null,
            tags: data.tags || null,
            locale: data.locale || 'fr',
            isActive: data.isActive ?? true
        }
    })
    
    // S'assurer que le profil auteur existe
    if (data.author) {
        await prisma.authorProfile.upsert({
            where: { name: data.author },
            update: {},
            create: { name: data.author }
        })
    }
    
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
    locale?: string
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
            locale: data.locale,
            isActive: data.isActive
        }
    })
    
    // S'assurer que le profil auteur existe (en cas de modification du nom)
    if (data.author) {
        await prisma.authorProfile.upsert({
            where: { name: data.author },
            update: {},
            create: { name: data.author }
        })
    }
    
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

export async function getQuotesByAuthorExact(authorName: string, locale?: string) {
    const where: any = { 
        author: authorName,
        isActive: true
    }
    // We intentionally do NOT filter by locale here. 
    // An author's quotes should be visible on their page regardless of the current site language.

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
