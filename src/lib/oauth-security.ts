import 'server-only'

import { randomBytes, timingSafeEqual } from 'crypto'

export type OAuthProvider = 'google' | 'facebook'

export function getTrustedAppOrigin(request: Request) {
    const requestUrl = new URL(request.url)
    if (requestUrl.hostname === 'localhost' || requestUrl.hostname === '127.0.0.1') {
        return requestUrl.origin
    }

    const configured = process.env.NEXT_PUBLIC_APP_URL || 'https://www.petsunivers.ma'
    const origin = new URL(configured).origin
    if (new URL(origin).protocol !== 'https:') {
        throw new Error('NEXT_PUBLIC_APP_URL doit utiliser HTTPS')
    }
    return origin
}

export function createOAuthState() {
    return randomBytes(32).toString('base64url')
}

export function oauthStateCookieName(provider: OAuthProvider) {
    return `oauth-state-${provider}`
}

export function oauthStateCookieOptions(provider: OAuthProvider) {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        maxAge: 10 * 60,
        path: `/api/auth/${provider}/callback`
    }
}

export function isValidOAuthState(provided: string | null, expected: string | undefined) {
    if (!provided || !expected) return false
    const providedBuffer = Buffer.from(provided)
    const expectedBuffer = Buffer.from(expected)
    return providedBuffer.length === expectedBuffer.length && timingSafeEqual(providedBuffer, expectedBuffer)
}
