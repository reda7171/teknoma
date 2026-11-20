import { NextResponse } from 'next/server'
import { createOAuthState, getTrustedAppOrigin, oauthStateCookieName, oauthStateCookieOptions } from '@/lib/oauth-security'

export async function GET(request: Request) {
    const clientId = process.env.FACEBOOK_CLIENT_ID || process.env.NEXT_PUBLIC_FACEBOOK_APP_ID
    if (!clientId) {
        return NextResponse.json({ error: 'FACEBOOK_CLIENT_ID is not configured' }, { status: 500 })
    }

    const origin = getTrustedAppOrigin(request)
    const redirectUri = process.env.FACEBOOK_REDIRECT_URI || `${origin}/api/auth/facebook/callback`
    const state = createOAuthState()
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: 'email,public_profile',
        response_type: 'code',
        state
    })

    const response = NextResponse.redirect(`https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`)
    response.cookies.set(oauthStateCookieName('facebook'), state, oauthStateCookieOptions('facebook'))
    return response
}
