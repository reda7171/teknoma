const FALLBACK_BUILD_SECRET = 'riwaya-build-prerender-fallback-jwt-secret-key-32-chars-min'

const configuredSecret = process.env.JWT_SECRET?.trim()

export const JWT_SECRET = (configuredSecret && configuredSecret.length >= 32)
    ? configuredSecret
    : FALLBACK_BUILD_SECRET

if (process.env.NODE_ENV === 'production' && (!configuredSecret || configuredSecret.length < 32)) {
    if (process.env.NEXT_PHASE !== 'phase-production-build') {
        console.warn('[SECURITY] JWT_SECRET non configuré ou inférieur à 32 caractères.')
    }
}

