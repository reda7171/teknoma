/**
 * Calcul de la distance de Levenshtein, similarité, suggestions et cache en mémoire.
 */

// Cache en mémoire pour les comparaisons de paires de chaînes (limité à 2000 entrées)
const MAX_PAIR_CACHE_SIZE = 2000
const pairCache = new Map<string, { matches: boolean; score: number }>()

// Cache en mémoire pour les suggestions "Vouliez-vous dire" (limité à 500 requêtes)
const MAX_SUGGESTION_CACHE_SIZE = 500
const suggestionCache = new Map<string, string | null>()

export function levenshteinDistance(a: string, b: string): number {
    const s1 = a.toLowerCase().trim()
    const s2 = b.toLowerCase().trim()

    if (s1 === s2) return 0
    if (s1.length === 0) return s2.length
    if (s2.length === 0) return s1.length

    const m = s1.length
    const n = s2.length
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

    for (let i = 0; i <= m; i++) dp[i][0] = i
    for (let j = 0; j <= n; j++) dp[0][j] = j

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1
            dp[i][j] = Math.min(
                dp[i - 1][j] + 1,       // suppression
                dp[i][j - 1] + 1,       // insertion
                dp[i - 1][j - 1] + cost // substitution
            )

            // Damerau-Levenshtein transposition
            if (i > 1 && j > 1 && s1[i - 1] === s2[j - 2] && s1[i - 2] === s2[j - 1]) {
                dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + cost)
            }
        }
    }

    return dp[m][n]
}

/**
 * Tolérance maximale de fautes selon la longueur du mot
 */
export function getMaxAllowedDistance(wordLength: number): number {
    if (wordLength <= 3) return 0
    if (wordLength <= 6) return 1
    return 2
}

/**
 * Score de similarité entre 0 et 1 (1 = identique)
 */
export function levenshteinSimilarity(a: string, b: string): number {
    const s1 = a.toLowerCase().trim()
    const s2 = b.toLowerCase().trim()
    const maxLen = Math.max(s1.length, s2.length)
    if (maxLen === 0) return 1
    const dist = levenshteinDistance(s1, s2)
    return Math.max(0, 1 - dist / maxLen)
}

/**
 * Vérifie si une requête correspond à un texte cible avec tolérance Levenshtein mot à mot et mise en cache.
 */
export function matchWithLevenshtein(query: string, target: string | null | undefined): { matches: boolean; score: number } {
    if (!target) return { matches: false, score: 0 }

    const cleanQuery = query.toLowerCase().trim()
    const cleanTarget = target.toLowerCase().trim()

    if (!cleanQuery || !cleanTarget) return { matches: false, score: 0 }

    const cacheKey = `${cleanQuery}:::${cleanTarget}`
    if (pairCache.has(cacheKey)) {
        return pairCache.get(cacheKey)!
    }

    // Correspondance exacte ou préfixe direct
    if (cleanTarget.includes(cleanQuery)) {
        const result = { matches: true, score: 1.0 }
        saveToPairCache(cacheKey, result)
        return result
    }

    const queryTokens = cleanQuery.split(/\s+/).filter(Boolean)
    const targetTokens = cleanTarget.split(/\s+/).filter(Boolean)

    if (queryTokens.length === 0 || targetTokens.length === 0) {
        const result = { matches: false, score: 0 }
        saveToPairCache(cacheKey, result)
        return result
    }

    let totalScore = 0
    let matchedTokensCount = 0

    for (const qToken of queryTokens) {
        let bestTokenScore = 0
        const maxAllowed = getMaxAllowedDistance(qToken.length)

        for (const tToken of targetTokens) {
            if (tToken.startsWith(qToken) || qToken.startsWith(tToken)) {
                bestTokenScore = Math.max(bestTokenScore, 0.95)
                continue
            }

            const dist = levenshteinDistance(qToken, tToken)
            if (dist <= maxAllowed) {
                const sim = 1 - dist / Math.max(qToken.length, tToken.length)
                bestTokenScore = Math.max(bestTokenScore, sim)
            }
        }

        if (bestTokenScore >= 0.7) {
            matchedTokensCount++
            totalScore += bestTokenScore
        }
    }

    const allTokensMatched = matchedTokensCount === queryTokens.length
    const averageScore = matchedTokensCount > 0 ? totalScore / queryTokens.length : 0

    const result = {
        matches: allTokensMatched && averageScore >= 0.7,
        score: averageScore
    }

    saveToPairCache(cacheKey, result)
    return result
}

function saveToPairCache(key: string, value: { matches: boolean; score: number }) {
    if (pairCache.size >= MAX_PAIR_CACHE_SIZE) {
        const firstKey = pairCache.keys().next().value
        if (firstKey) pairCache.delete(firstKey)
    }
    pairCache.set(key, value)
}

/**
 * Détermine la meilleure suggestion de correction "Vouliez-vous dire"
 * quand la distance de Levenshtein est non nulle (faute de frappe détectée).
 */
export function findBestSuggestion(
    query: string,
    candidates: { text: string | null | undefined; isAuthor?: boolean }[]
): string | null {
    const cleanQuery = query.toLowerCase().trim()
    if (!cleanQuery || cleanQuery.length < 3) return null

    if (suggestionCache.has(cleanQuery)) {
        return suggestionCache.get(cleanQuery) || null
    }

    let bestCandidate: string | null = null
    let highestScore = 0

    for (const { text, isAuthor } of candidates) {
        if (!text) continue
        const candidateClean = text.toLowerCase().trim()

        // Si la requête est déjà exactement dans la cible, aucune suggestion nécessaire
        if (candidateClean.includes(cleanQuery)) {
            continue
        }

        const match = matchWithLevenshtein(cleanQuery, text)
        if (match.matches && match.score >= 0.75 && match.score < 1.0) {
            const adjustedScore = match.score * (isAuthor ? 1.2 : 1.0)
            if (adjustedScore > highestScore) {
                highestScore = adjustedScore
                bestCandidate = text.trim()
            }
        }
    }

    if (suggestionCache.size >= MAX_SUGGESTION_CACHE_SIZE) {
        const firstKey = suggestionCache.keys().next().value
        if (firstKey) suggestionCache.delete(firstKey)
    }
    suggestionCache.set(cleanQuery, bestCandidate)

    return bestCandidate
}
