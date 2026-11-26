const RELOAD_STORAGE_KEY = 'tekno_chunk_reload_at'
const RELOAD_COOLDOWN_MS = 15_000

const CHUNK_ERROR_PATTERNS = [
  'chunkloaderror',
  'loading chunk',
  'loading css chunk',
  'failed to fetch dynamically imported module',
  'importing a module script failed',
  'failed to find server action',
]

/**
 * Vérifie si l'erreur correspond à un décalage de chunks après déploiement.
 */
export function isChunkLoadError(error: Error | null | undefined): boolean {
  if (!error) return false
  const text = `${error.name || ''} ${error.message || ''}`.toLowerCase()
  return CHUNK_ERROR_PATTERNS.some((pattern) => text.includes(pattern))
}

/**
 * Recharge la page une seule fois (anti-boucle via sessionStorage) en cas d'erreur de chunk.
 * Retourne true si un rechargement a été déclenché.
 */
export function tryAutoReloadOnChunkError(error: Error | null | undefined): boolean {
  if (typeof window === 'undefined' || !isChunkLoadError(error)) return false

  try {
    const lastReloadRaw = window.sessionStorage.getItem(RELOAD_STORAGE_KEY)
    const lastReloadAt = lastReloadRaw ? Number(lastReloadRaw) : 0
    const now = Date.now()

    if (!Number.isNaN(lastReloadAt) && now - lastReloadAt < RELOAD_COOLDOWN_MS) {
      return false
    }

    window.sessionStorage.setItem(RELOAD_STORAGE_KEY, String(now))
    window.location.reload()
    return true
  } catch {
    return false
  }
}
