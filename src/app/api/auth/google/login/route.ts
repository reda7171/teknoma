import { NextResponse } from 'next/server'
import { createOAuthState, getTrustedAppOrigin, oauthStateCookieName, oauthStateCookieOptions } from '@/lib/oauth-security'

export async function GET(request: Request) {
    const clientId = process.env.GOOGLE_CLIENT_ID
    if (!clientId) {
        return NextResponse.json({ error: 'GOOGLE_CLIENT_ID is not configured' }, { status: 500 })
    }

    const origin = getTrustedAppOrigin(request)
    const state = createOAuthState()
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: `${origin}/api/auth/google/callback`,
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'online',
        prompt: 'select_account',
        state
    })

    const response = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`)
    response.cookies.set(oauthStateCookieName('google'), state, oauthStateCookieOptions('google'))
    return response
}
