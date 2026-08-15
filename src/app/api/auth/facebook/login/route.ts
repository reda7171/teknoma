import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const FACEBOOK_CLIENT_ID = process.env.FACEBOOK_CLIENT_ID

    if (!FACEBOOK_CLIENT_ID) {
        return NextResponse.json({ error: 'FACEBOOK_CLIENT_ID is not configured' }, { status: 500 })
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
    const redirectUri = `${origin}/api/auth/facebook/callback`

    const params = new URLSearchParams({
        client_id: FACEBOOK_CLIENT_ID,
        redirect_uri: redirectUri,
        scope: 'email,public_profile',
        response_type: 'code',
    })

    const facebookAuthUrl = `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`

    return NextResponse.redirect(facebookAuthUrl)
}
