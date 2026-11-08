import Redis from 'ioredis'

/**
 * Client Redis distribué pour la mise en cache haute performance du catalogue.
 * Gère automatiquement la reconnexion et le fallback mémoire en cas d'indisponibilité.
 */

let redisInstance: Redis | null = null
let isRedisAvailable = false
let connectionAttempted = false

export function getRedisClient(): Redis | null {
    if (redisInstance) {
        return redisInstance
    }

    if (process.env.DISABLE_REDIS === 'true') {
        return null
    }

    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379'

    try {
        redisInstance = new Redis(redisUrl, {
            lazyConnect: true,
            maxRetriesPerRequest: 1,
            connectTimeout: 3000,
            retryStrategy(times) {
                if (times > 3) {
                    return null // Arrêter de réessayer en boucle si Redis n'est pas actif
                }
                return Math.min(times * 200, 1000)
            },
        })

        redisInstance.on('connect', () => {
            isRedisAvailable = true
        })

        redisInstance.on('error', () => {
            isRedisAvailable = false
        })

        redisInstance.on('close', () => {
            isRedisAvailable = false
        })

        // Tenter la connexion de façon non-bloquante
        if (!connectionAttempted) {
            connectionAttempted = true
            redisInstance.connect().then(() => {
                isRedisAvailable = true
            }).catch(() => {
                isRedisAvailable = false
            })
        }

        return redisInstance
    } catch {
        isRedisAvailable = false
        return null
    }
}

/**
 * Lecture d'une clé dans Redis avec désérialisation JSON
 */
export async function redisGet<T>(key: string): Promise<T | null> {
    try {
        const client = getRedisClient()
        if (!client || !isRedisAvailable) return null

        const raw = await client.get(key)
        if (!raw) return null

        return JSON.parse(raw) as T
    } catch {
        return null
    }
}

/**
 * Écriture d'une clé dans Redis avec TTL (en secondes)
 */
export async function redisSet<T>(key: string, data: T, ttlSeconds: number = 300): Promise<boolean> {
    try {
        const client = getRedisClient()
        if (!client || !isRedisAvailable) return false

        const serialized = JSON.stringify(data)
        if (ttlSeconds > 0) {
            await client.set(key, serialized, 'EX', ttlSeconds)
        } else {
            await client.set(key, serialized)
        }
        return true
    } catch {
        return false
    }
}

/**
 * Suppression d'une clé unique dans Redis
 */
export async function redisDel(key: string): Promise<boolean> {
    try {
        const client = getRedisClient()
        if (!client || !isRedisAvailable) return false

        await client.del(key)
        return true
    } catch {
        return false
    }
}

/**
 * Suppression des clés correspondant à un motif (ex: "catalog:books:*")
 */
export async function redisDelPattern(pattern: string): Promise<boolean> {
    try {
        const client = getRedisClient()
        if (!client || !isRedisAvailable) return false

        let cursor = '0'
        do {
            const [nextCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100)
            cursor = nextCursor
            if (keys && keys.length > 0) {
                await client.del(...keys)
            }
        } while (cursor !== '0')

        return true
    } catch {
        return false
    }
}

/**
 * Helper cache-aside : retourne la valeur depuis Redis ou exécute fetchFn
 */
export async function rememberCache<T>(
    key: string,
    ttlSeconds: number,
    fetchFn: () => Promise<T>
): Promise<T> {
    const cached = await redisGet<T>(key)
    if (cached !== null && cached !== undefined) {
        return cached
    }

    const fresh = await fetchFn()
    if (fresh !== null && fresh !== undefined) {
        await redisSet(key, fresh, ttlSeconds).catch(() => {})
    }

    return fresh
}
