import { NextResponse } from 'next/server'
import { oauthLoginOrRegister } from '@/lib/actions/community-auth'

export async function GET(request: Request) {
    const searchParams = new URL(request.url).searchParams
    let proto = request.headers.get('x-forwarded-proto') || 'https'
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
    if (host && host.includes('riwaya.store')) {
        proto = 'https' // Forcer HTTPS en production
    }
    const origin = host ? `${proto}://${host}` : process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    // Helper function to handle popup or direct redirect
    const handleRedirect = (url: string, error?: string) => {
        const payload = error ? `{ type: 'oauth_error', error: '${error}' }` : `{ type: 'oauth_success', redirect: '${url}' }`
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <script>
                    if (window.opener && !window.opener.closed) {
                        window.opener.postMessage(${payload}, '*');
                        window.close();
                    } else {
                        window.location.href = '${url}';
                    }
                </script>
            </head>
            <body>
                Authentification en cours... Veuillez patienter.
            </body>
            </html>
        `
        return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } })
    }

    if (error) return handleRedirect(`${origin}/community/login?error=${encodeURIComponent(error)}`, error)
    if (!code) return handleRedirect(`${origin}/community/login?error=NoCodeProvided`, 'NoCodeProvided')

    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
    const redirectUri = `${origin}/api/auth/google/callback`

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        return handleRedirect(`${origin}/community/login?error=GoogleAuthNotConfigured`, 'GoogleAuthNotConfigured')
    }

    try {
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
            })
        })

        const tokenData = await tokenResponse.json()

        if (tokenData.error) {
            console.error('Google token error:', tokenData)
            return handleRedirect(`${origin}/community/login?error=TokenExchangeFailed`, 'TokenExchangeFailed')
        }

        const { access_token } = tokenData
        const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${access_token}` }
        })
        const profileData = await profileResponse.json()

        if (!profileData.email) return handleRedirect(`${origin}/community/login?error=NoEmailProvidedByGoogle`, 'NoEmailProvidedByGoogle')

        const authResult = await oauthLoginOrRegister({
            email: profileData.email,
            fullName: profileData.name || profileData.given_name || 'Utilisateur Google',
            provider: 'google'
        })

        if (authResult.success) {
            return handleRedirect(`${origin}${authResult.redirect || '/community'}`)
        } else {
            return handleRedirect(`${origin}/community/login?error=${encodeURIComponent(authResult.error || 'Erreur inconnue')}`, authResult.error || 'Erreur inconnue')
        }

    } catch (err) {
        console.error('Google Auth Error:', err)
        return handleRedirect(`${origin}/community/login?error=InternalAuthError`, 'InternalAuthError')
    }
}
