import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID

    if (!GOOGLE_CLIENT_ID) {
        return NextResponse.json({ error: 'GOOGLE_CLIENT_ID is not configured' }, { status: 500 })
    }

    const { origin } = new URL(request.url)
    const redirectUri = `${origin}/api/auth/google/callback`

    const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'online',
        prompt: 'select_account'
    })

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`

    return NextResponse.redirect(googleAuthUrl)
}
