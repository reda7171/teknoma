'use server'

import { prisma } from '@/lib/prisma'

export interface CannibalizationIssue {
    keyword: string
    entities: {
        id: string
        type: 'BOOK' | 'PACK' | 'POST' | 'CATEGORY'
        title: string
        url: string
    }[]
}

function normalize(str: string) {
    return str.toLowerCase().trim().replace(/[-_]/g, ' ').replace(/\s+/g, ' ')
}

export async function analyzeSeoCannibalization(): Promise<CannibalizationIssue[]> {
    const issuesMap = new Map<string, CannibalizationIssue['entities']>()

    function addEntity(keyword: string, entity: CannibalizationIssue['entities'][0]) {
        if (!keyword) return
        const keys = keyword.split(',').map(k => normalize(k)).filter(k => k.length > 2)
        
        for (const k of keys) {
            if (!issuesMap.has(k)) {
                issuesMap.set(k, [])
            }
            // Avoid duplicates
            if (!issuesMap.get(k)!.find(e => e.id === entity.id && e.type === entity.type)) {
                issuesMap.get(k)!.push(entity)
            }
        }
    }

    // 1. Fetch Books
    const books = await prisma.book.findMany({
        where: { active: true },
        select: { id: true, title: true, seoKeywords: true }
    })
    books.forEach(b => {
        const entity = { id: b.id, type: 'BOOK' as const, title: b.title, url: `/books/${b.id}` }
        addEntity(b.title, entity)
        if (b.seoKeywords) addEntity(b.seoKeywords, entity)
    })

    // 2. Fetch Packs
    const packs = await prisma.pack.findMany({
        where: { active: true },
        select: { id: true, name: true }
    })
    packs.forEach(p => {
        const entity = { id: p.id, type: 'PACK' as const, title: p.name, url: `/packs/${p.id}` }
        addEntity(p.name, entity)
    })

    // 3. Fetch Posts
    const posts = await prisma.post.findMany({
        where: { published: true },
        select: { id: true, title: true, slug: true, tags: true }
    })
    posts.forEach(p => {
        const entity = { id: p.id, type: 'POST' as const, title: p.title, url: `/blog/${p.slug}` }
        addEntity(p.title, entity)
        if (p.tags) addEntity(p.tags, entity)
    })

    // 4. Fetch SeoCategories
    const categories = await prisma.seoCategory.findMany({
        where: { isActive: true },
        select: { id: true, title: true, slug: true, keyword: true, searchQuery: true }
    })
    categories.forEach(c => {
        const entity = { id: c.id, type: 'CATEGORY' as const, title: c.title, url: `/collection/${c.slug}` }
        addEntity(c.title, entity)
        addEntity(c.keyword, entity)
        if (c.searchQuery) addEntity(c.searchQuery, entity)
    })

    // Filter to only keep keywords that have > 1 entity mapping to it
    const conflicts: CannibalizationIssue[] = []
    
    issuesMap.forEach((entities, keyword) => {
        if (entities.length > 1) {
            // Ignore generic keywords that might just be common words
            if (keyword.length > 3) {
                conflicts.push({ keyword, entities })
            }
        }
    })

    return conflicts.sort((a, b) => b.entities.length - a.entities.length)
}
