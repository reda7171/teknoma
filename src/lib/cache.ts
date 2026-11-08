import { redisGet, redisSet, redisDel, redisDelPattern } from './redis'

/**
 * Système de cache hybride : Tier 1 Redis Distribué, Tier 2 Mémoire locale.
 * Garantit des temps de réponse ultra-rapides et la cohérence entre instances répliquées.
 */

interface CacheEntry<T> {
    data: T
    expiry: number
}

class MemoryCache {
    private cache = new Map<string, CacheEntry<any>>()
    private maxSize = 1000

    set<T>(key: string, data: T, ttlSeconds: number = 300): void {
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value
            if (firstKey !== undefined) {
                this.cache.delete(firstKey)
            }
        }

        this.cache.set(key, {
            data,
            expiry: Date.now() + ttlSeconds * 1000,
        })
    }

    get<T>(key: string): T | null {
        const entry = this.cache.get(key)
        if (!entry) return null

        if (Date.now() > entry.expiry) {
            this.cache.delete(key)
            return null
        }

        return entry.data as T
    }

    delete(key: string): void {
        this.cache.delete(key)
    }

    deletePattern(prefix: string): void {
        for (const k of this.cache.keys()) {
            if (k.startsWith(prefix)) {
                this.cache.delete(k)
            }
        }
    }

    clear(): void {
        this.cache.clear()
    }

    cleanup(): void {
        const now = Date.now()
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiry) {
                this.cache.delete(key)
            }
        }
    }
}

// Instance singleton mémoire locale
export const cache = new MemoryCache()

if (typeof setInterval !== 'undefined') {
    setInterval(() => cache.cleanup(), 5 * 60 * 1000)
}

/**
 * Cache distribué Redis avec fallback mémoire locale
 */
export async function getCached<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds: number = 300
): Promise<T> {
    try {
        // 1. Essai Redis distribué
        const redisValue = await redisGet<T>(key)
        if (redisValue !== null && redisValue !== undefined) {
            return redisValue
        }

        // 2. Essai mémoire locale
        const memoryValue = cache.get<T>(key)
        if (memoryValue !== null && memoryValue !== undefined) {
            return memoryValue
        }

        // 3. Exécution requête source
        const fresh = await fetchFn()

        if (fresh !== null && fresh !== undefined) {
            // Sauvegarde dans les deux tiers
            cache.set(key, fresh, ttlSeconds)
            await redisSet(key, fresh, ttlSeconds).catch(() => {})
        }

        return fresh
    } catch {
        return await fetchFn()
    }
}

/**
 * Invalidation d'une clé spécifique dans Redis et la mémoire
 */
export async function invalidateCacheKey(key: string): Promise<void> {
    cache.delete(key)
    await redisDel(key).catch(() => {})
}

/**
 * Invalidation par préfixe/pattern (ex: "catalog:books:*")
 */
export async function invalidateCachePattern(pattern: string): Promise<void> {
    const prefix = pattern.replace(/\*$/, '')
    cache.deletePattern(prefix)
    await redisDelPattern(pattern).catch(() => {})
}

/**
 * Générer une clé de cache stable
 */
export function generateCacheKey(prefix: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
        .sort()
        .map(key => `${key}=${JSON.stringify(params[key])}`)
        .join('&')

    return `${prefix}:${sortedParams}`
}
