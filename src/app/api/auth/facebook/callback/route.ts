import { NextResponse } from 'next/server'
import { oauthLoginOrRegister } from '@/lib/actions/community-auth'

export async function GET(request: Request) {
    const searchParams = new URL(request.url).searchParams
    const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
        return NextResponse.redirect(`${origin}/community/login?error=${encodeURIComponent(error)}`)
    }

    if (!code) {
        return NextResponse.redirect(`${origin}/community/login?error=NoCodeProvided`)
    }

    const FACEBOOK_CLIENT_ID = process.env.FACEBOOK_CLIENT_ID
    const FACEBOOK_CLIENT_SECRET = process.env.FACEBOOK_CLIENT_SECRET
    const redirectUri = `${origin}/api/auth/facebook/callback`

    if (!FACEBOOK_CLIENT_ID || !FACEBOOK_CLIENT_SECRET) {
        return NextResponse.redirect(`${origin}/community/login?error=FacebookAuthNotConfigured`)
    }

    try {
        // Exchange code for access token
        const tokenResponse = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?client_id=${FACEBOOK_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${FACEBOOK_CLIENT_SECRET}&code=${code}`)

        const tokenData = await tokenResponse.json()

        if (tokenData.error) {
            console.error('Facebook token error:', tokenData)
            return NextResponse.redirect(`${origin}/community/login?error=TokenExchangeFailed`)
        }

        const { access_token } = tokenData

        // Fetch user profile
        const profileResponse = await fetch(`https://graph.facebook.com/me?fields=id,name,email&access_token=${access_token}`)

        const profileData = await profileResponse.json()

        if (!profileData.email) {
            return NextResponse.redirect(`${origin}/community/login?error=NoEmailProvidedByFacebook`)
        }

        // Connect to community-auth
        const authResult = await oauthLoginOrRegister({
            email: profileData.email,
            fullName: profileData.name || 'Utilisateur Facebook',
            provider: 'facebook'
        })

        if (authResult.success) {
            return NextResponse.redirect(`${origin}/community`)
        } else {
            return NextResponse.redirect(`${origin}/community/login?error=${encodeURIComponent(authResult.error || 'Erreur inconnue')}`)
        }

    } catch (err) {
        console.error('Facebook Auth Error:', err)
        return NextResponse.redirect(`${origin}/community/login?error=InternalAuthError`)
    }
}
