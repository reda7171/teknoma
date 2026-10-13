/**
 * Mécanisme de rejeu automatique (retry silencieux) avec temporisation exponentielle
 * Conçu pour fiabiliser les actions critiques du panier et du checkout lors de micro-coupures réseau sur mobile.
 */

export interface RetryOptions {
    maxRetries?: number
    baseDelayMs?: number
    maxDelayMs?: number
    shouldRetry?: (error: any, attempt: number) => boolean
    onRetry?: (error: any, attempt: number, nextDelayMs: number) => void
}

/**
 * Détermine si une erreur provient d'une coupure réseau ou d'une indisponibilité transitoire.
 */
export function isNetworkOrTransientError(error: any): boolean {
    if (!error) return false
    const msg = String(error?.message || error || '').toLowerCase()
    
    // Déconnexions, interruptions fetch, micro-coupures mobiles
    if (
        msg.includes('fetch') ||
        msg.includes('network') ||
        msg.includes('failed to fetch') ||
        msg.includes('abort') ||
        msg.includes('timeout') ||
        msg.includes('econnreset') ||
        msg.includes('econnrefused') ||
        msg.includes('unexpected response') ||
        msg.includes('offline') ||
        msg.includes('load failed') ||
        msg.includes('networkerror')
    ) {
        return true
    }

    // Codes HTTP transitoires
    const status = error?.status || error?.statusCode
    if (status === 502 || status === 503 || status === 504 || status === 429) {
        return true
    }

    return false
}

/**
 * Exécute une action asynchrone avec retry automatique et backoff exponentiel + jitter.
 */
export async function withExponentialRetry<T>(
    action: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const maxRetries = options.maxRetries ?? 3
    const baseDelayMs = options.baseDelayMs ?? 350
    const maxDelayMs = options.maxDelayMs ?? 2500
    const shouldRetry = options.shouldRetry ?? isNetworkOrTransientError

    let attempt = 0

    while (true) {
        try {
            return await action()
        } catch (err: any) {
            attempt++
            if (attempt > maxRetries || !shouldRetry(err, attempt)) {
                throw err
            }

            // Calcul exponentiel avec jitter aléatoire pour éviter les tempêtes de requêtes
            const jitter = Math.floor(Math.random() * 80)
            const exponentialDelay = baseDelayMs * Math.pow(2, attempt - 1)
            const delay = Math.min(maxDelayMs, exponentialDelay + jitter)

            if (options.onRetry) {
                try {
                    options.onRetry(err, attempt, delay)
                } catch {
                    // Silencieux
                }
            }

            await new Promise(resolve => setTimeout(resolve, delay))
        }
    }
}
