'use server'

import fs from 'fs/promises'
import path from 'path'
import { createHash } from 'crypto'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/actions/auth'

export interface CoverCacheEntry {
    fingerprint: string
    title: string
    author?: string
    timestamp: number
    hitCount: number
}

export interface CoverCacheStats {
    totalEntries: number
    totalHits: number
    estimatedTokensSaved: number
    estimatedCostSavedUsd: number
    entries: CoverCacheEntry[]
}

const CACHE_FILE_PATH = path.join(process.cwd(), 'public', 'uploads', 'cache', 'cover_fingerprints.json')

const coverFingerprintCache = new Map<string, { title: string; author?: string; timestamp: number; hitCount: number }>()

let isLoaded = false

export async function loadPersistedCoverCache() {
    if (isLoaded) return
    try {
        const fileContent = await fs.readFile(CACHE_FILE_PATH, 'utf-8')
        const data = JSON.parse(fileContent) as Record<string, { title: string; author?: string; timestamp: number; hitCount: number }>
        for (const [key, value] of Object.entries(data)) {
            coverFingerprintCache.set(key, value)
        }
        isLoaded = true
    } catch {
        // Le fichier n'existe pas encore ou est vide
        isLoaded = true
    }
}

async function persistToDisk() {
    try {
        const dir = path.dirname(CACHE_FILE_PATH)
        await fs.mkdir(dir, { recursive: true })
        const obj: Record<string, any> = {}
        for (const [k, v] of coverFingerprintCache.entries()) {
            obj[k] = v
        }
        await fs.writeFile(CACHE_FILE_PATH, JSON.stringify(obj, null, 2), 'utf-8')
    } catch (err) {
        console.error('Erreur sauvegarde cache Gemini:', err)
    }
}

export async function getCachedCover(fingerprint: string) {
    await loadPersistedCoverCache()
    return coverFingerprintCache.get(fingerprint) || null
}

export async function setCachedCover(fingerprint: string, entry: { title: string; author?: string; timestamp: number; hitCount: number }) {
    await loadPersistedCoverCache()
    coverFingerprintCache.set(fingerprint, entry)
    await persistToDisk()
}

export async function savePersistedCoverCache(fingerprint: string, entry: { title: string; author?: string; timestamp: number; hitCount: number }) {
    await loadPersistedCoverCache()
    coverFingerprintCache.set(fingerprint, entry)
    await persistToDisk()
}

export async function recordCacheHit(fingerprint: string) {
    await loadPersistedCoverCache()
    const entry = coverFingerprintCache.get(fingerprint)
    if (entry) {
        entry.hitCount = (entry.hitCount || 0) + 1
        coverFingerprintCache.set(fingerprint, entry)
        await persistToDisk()
    }
}

export async function getCoverCacheStats(): Promise<CoverCacheStats> {
    await loadPersistedCoverCache()

    let totalHits = 0
    const entries: CoverCacheEntry[] = []

    for (const [fingerprint, val] of coverFingerprintCache.entries()) {
        const hits = val.hitCount || 0
        totalHits += hits
        entries.push({
            fingerprint,
            title: val.title,
            author: val.author,
            timestamp: val.timestamp || Date.now(),
            hitCount: hits
        })
    }

    entries.sort((a, b) => b.timestamp - a.timestamp)

    const estimatedTokensSaved = totalHits * 1500
    const estimatedCostSavedUsd = Number((totalHits * 0.002).toFixed(4))

    return {
        totalEntries: entries.length,
        totalHits,
        estimatedTokensSaved,
        estimatedCostSavedUsd,
        entries
    }
}

export async function purgeCoverCacheItem(fingerprint: string): Promise<{ success: boolean; message?: string }> {
    try {
        await verifyAdmin()
        await loadPersistedCoverCache()
        if (coverFingerprintCache.has(fingerprint)) {
            coverFingerprintCache.delete(fingerprint)
            await persistToDisk()
            return { success: true }
        }
        return { success: false, message: 'Entrée introuvable dans le cache' }
    } catch (err: any) {
        return { success: false, message: err?.message || 'Erreur lors de la purge' }
    }
}

export async function clearAllCoverCache(): Promise<{ success: boolean; message?: string }> {
    try {
        await verifyAdmin()
        coverFingerprintCache.clear()
        await persistToDisk()
        return { success: true }
    } catch (err: any) {
        return { success: false, message: err?.message || 'Erreur lors de la vidange du cache' }
    }
}

export async function getImageBuffer(imagePathOrUrl: string): Promise<Buffer | null> {
    if (!imagePathOrUrl) return null

    if (imagePathOrUrl.startsWith('data:image')) {
        const base64Data = imagePathOrUrl.split(',')[1]
        if (!base64Data) return null
        return Buffer.from(base64Data, 'base64')
    }

    if (imagePathOrUrl.startsWith('/') || (!imagePathOrUrl.startsWith('http://') && !imagePathOrUrl.startsWith('https://'))) {
        const cleanPath = imagePathOrUrl.startsWith('/') ? imagePathOrUrl.slice(1) : imagePathOrUrl
        const localPath = path.join(process.cwd(), 'public', cleanPath)
        try {
            return await fs.readFile(localPath)
        } catch {
            return null
        }
    }

    if (imagePathOrUrl.startsWith('http://') || imagePathOrUrl.startsWith('https://')) {
        try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 4000)
            const res = await fetch(imagePathOrUrl, { signal: controller.signal })
            clearTimeout(timeoutId)
            if (!res.ok) return null
            const arrayBuffer = await res.arrayBuffer()
            return Buffer.from(arrayBuffer)
        } catch {
            return null
        }
    }

    return null
}

export async function indexCoverBuffer(buffer: Buffer, title: string, author?: string): Promise<string> {
    const fingerprint = createHash('sha256').update(buffer).digest('hex')
    await loadPersistedCoverCache()
    if (!coverFingerprintCache.has(fingerprint)) {
        coverFingerprintCache.set(fingerprint, {
            title,
            author,
            timestamp: Date.now(),
            hitCount: 0
        })
        await persistToDisk()
    }
    return fingerprint
}

export async function preindexCatalogCovers(options?: { bypassAuth?: boolean }): Promise<{
    success: boolean
    indexedCount: number
    skippedCount: number
    errorsCount: number
    totalProcessed: number
    message: string
}> {
    try {
        if (!options?.bypassAuth) {
            await verifyAdmin()
        }
        await loadPersistedCoverCache()

        const [books, packs] = await Promise.all([
            prisma.book.findMany({
                where: { active: true },
                select: { id: true, title: true, author: true, image: true }
            }),
            prisma.pack.findMany({
                where: { active: true, image: { not: null } },
                select: { id: true, name: true, image: true }
            })
        ])

        const itemsToIndex: Array<{ title: string; author?: string; image: string }> = [
            ...books.filter(b => b.image).map(b => ({ title: b.title, author: b.author, image: b.image })),
            ...packs.filter(p => p.image).map(p => ({ title: p.name, author: 'Pack PetsUnivers', image: p.image! }))
        ]

        let indexedCount = 0
        let skippedCount = 0
        let errorsCount = 0

        const BATCH_SIZE = 15
        for (let i = 0; i < itemsToIndex.length; i += BATCH_SIZE) {
            const batch = itemsToIndex.slice(i, i + BATCH_SIZE)
            await Promise.all(batch.map(async (item) => {
                try {
                    const buffer = await getImageBuffer(item.image)
                    if (!buffer || buffer.length === 0) {
                        errorsCount++
                        return
                    }

                    const fingerprint = createHash('sha256').update(buffer).digest('hex')

                    if (coverFingerprintCache.has(fingerprint)) {
                        skippedCount++
                    } else {
                        coverFingerprintCache.set(fingerprint, {
                            title: item.title,
                            author: item.author || undefined,
                            timestamp: Date.now(),
                            hitCount: 0
                        })
                        indexedCount++
                    }
                } catch {
                    errorsCount++
                }
            }))
        }

        if (indexedCount > 0) {
            await persistToDisk()
        }

        return {
            success: true,
            indexedCount,
            skippedCount,
            errorsCount,
            totalProcessed: itemsToIndex.length,
            message: `${indexedCount} couverture(s) indexée(s) avec succès (${skippedCount} déjà en cache, ${errorsCount} non résolues).`
        }
    } catch (err: any) {
        return {
            success: false,
            indexedCount: 0,
            skippedCount: 0,
            errorsCount: 0,
            totalProcessed: 0,
            message: err?.message || "Erreur lors de l'indexation pré-calculée"
        }
    }
}
