import { NextRequest, NextResponse } from 'next/server'
import { oauthLoginOrRegister } from '@/lib/actions/community-auth'
import { getTrustedAppOrigin, isValidOAuthState, oauthStateCookieName } from '@/lib/oauth-security'

export async function GET(request: NextRequest) {
    const origin = getTrustedAppOrigin(request)
    const searchParams = request.nextUrl.searchParams
    const stateCookie = oauthStateCookieName('google')

    const finish = (response: NextResponse) => {
        response.cookies.set(stateCookie, '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 0,
            path: '/api/auth/google/callback'
        })
        return response
    }

    const handleRedirect = (url: string, error?: string) => {
        const payload = JSON.stringify(error
            ? { type: 'oauth_error', error }
            : { type: 'oauth_success', redirect: url }
        ).replace(/</g, '\\u003c')
        const targetOrigin = JSON.stringify(origin)
        const destination = JSON.stringify(url).replace(/</g, '\\u003c')
        const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"></head><body>
<script>if(window.opener&&!window.opener.closed){window.opener.postMessage(${payload},${targetOrigin});window.close()}else{window.location.href=${destination}}</script>
Authentification en cours...</body></html>`
        return finish(new NextResponse(html, {
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'private, no-store',
                'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'"
            }
        }))
    }

    if (!isValidOAuthState(searchParams.get('state'), request.cookies.get(stateCookie)?.value)) {
        return handleRedirect(`${origin}/community/login?error=InvalidOAuthState`, 'InvalidOAuthState')
    }
    if (searchParams.get('error')) {
        return handleRedirect(`${origin}/community/login?error=OAuthDenied`, 'OAuthDenied')
    }

    const code = searchParams.get('code')
    if (!code) return handleRedirect(`${origin}/community/login?error=NoCodeProvided`, 'NoCodeProvided')

    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = `${origin}/api/auth/google/callback`
    if (!clientId || !clientSecret) {
        return handleRedirect(`${origin}/community/login?error=GoogleAuthNotConfigured`, 'GoogleAuthNotConfigured')
    }

    try {
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
            cache: 'no-store'
        })
        const tokenData = await tokenResponse.json()
        if (!tokenResponse.ok || !tokenData.access_token) {
            console.error('Google token exchange failed:', tokenResponse.status)
            return handleRedirect(`${origin}/community/login?error=TokenExchangeFailed`, 'TokenExchangeFailed')
        }

        const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
            cache: 'no-store'
        })
        const profileData = await profileResponse.json()
        if (!profileResponse.ok || !profileData.email || profileData.verified_email !== true) {
            return handleRedirect(`${origin}/community/login?error=UnverifiedEmail`, 'UnverifiedEmail')
        }

        const authResult = await oauthLoginOrRegister({
            email: profileData.email,
            fullName: profileData.name || profileData.given_name || 'Utilisateur Google',
            provider: 'google'
        })
        if (authResult.success) return handleRedirect(`${origin}${authResult.redirect || '/community'}`)

        return handleRedirect(`${origin}/community/login?error=OAuthLoginFailed`, 'OAuthLoginFailed')
    } catch (error) {
        console.error('Google Auth Error:', error)
        return handleRedirect(`${origin}/community/login?error=InternalAuthError`, 'InternalAuthError')
    }
}
