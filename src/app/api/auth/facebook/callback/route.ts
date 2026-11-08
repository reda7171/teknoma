import { NextRequest, NextResponse } from 'next/server'
import { oauthLoginOrRegister } from '@/lib/server/community-oauth'
import { getTrustedAppOrigin, isValidOAuthState, oauthStateCookieName } from '@/lib/oauth-security'

export async function GET(request: NextRequest) {
    const origin = getTrustedAppOrigin(request)
    const searchParams = request.nextUrl.searchParams
    const stateCookie = oauthStateCookieName('facebook')

    const redirect = (path: string) => {
        const response = NextResponse.redirect(`${origin}${path}`)
        response.cookies.set(stateCookie, '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 0,
            path: '/api/auth/facebook/callback'
        })
        response.headers.set('Cache-Control', 'private, no-store')
        return response
    }

    if (!isValidOAuthState(searchParams.get('state'), request.cookies.get(stateCookie)?.value)) {
        return redirect('/community/login?error=InvalidOAuthState')
    }
    if (searchParams.get('error')) return redirect('/community/login?error=OAuthDenied')

    const code = searchParams.get('code')
    if (!code) return redirect('/community/login?error=NoCodeProvided')

    const clientId = process.env.FACEBOOK_CLIENT_ID || process.env.NEXT_PUBLIC_FACEBOOK_APP_ID
    const clientSecret = process.env.FACEBOOK_CLIENT_SECRET
    const redirectUri = process.env.FACEBOOK_REDIRECT_URI || `${origin}/api/auth/facebook/callback`
    if (!clientId || !clientSecret) return redirect('/community/login?error=FacebookAuthNotConfigured')

    try {
        const tokenResponse = await fetch('https://graph.facebook.com/v19.0/oauth/access_token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, client_secret: clientSecret, code }),
            cache: 'no-store'
        })
        const tokenData = await tokenResponse.json()
        if (!tokenResponse.ok || !tokenData.access_token) {
            console.error('Facebook token exchange failed:', tokenResponse.status)
            return redirect('/community/login?error=TokenExchangeFailed')
        }

        const profileResponse = await fetch('https://graph.facebook.com/me?fields=id,name,email', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
            cache: 'no-store'
        })
        const profileData = await profileResponse.json()
        if (!profileResponse.ok || !profileData.email) return redirect('/community/login?error=NoEmailProvidedByFacebook')

        const authResult = await oauthLoginOrRegister({
            email: profileData.email,
            fullName: profileData.name || 'Utilisateur Facebook',
            provider: 'facebook'
        })
        if (authResult.success) return redirect(authResult.redirect || '/community')
        return redirect('/community/login?error=OAuthLoginFailed')
    } catch (error) {
        console.error('Facebook Auth Error:', error)
        return redirect('/community/login?error=InternalAuthError')
    }
}
