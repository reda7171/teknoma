import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/actions/auth';
import { getSetting } from '@/lib/actions/site-settings';
import crypto from 'crypto';

function base64URLEncode(buffer: Buffer) {
    return buffer.toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

export async function GET(req: NextRequest) {
    try {
        await verifyAdmin();
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let clientKey = await getSetting('tiktok_app_id');
    if (!clientKey || !clientKey.trim()) {
        return NextResponse.json({ error: 'TikTok App ID (Client Key) not configured in Settings' }, { status: 400 });
    }
    clientKey = clientKey.trim();

    // Toujours utiliser l'URL de production — TikTok vérifie l'URI exacte enregistrée
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.riwaya.store'}/api/tiktok/callback`;
    const scope = 'user.info.profile,user.info.stats,video.list,video.upload';
    
    // Generate random state for CSRF protection
    const state = Math.random().toString(36).substring(7);

    // Generate PKCE code_challenge
    const verifier = base64URLEncode(crypto.randomBytes(32));
    const challenge = base64URLEncode(crypto.createHash('sha256').update(verifier).digest());

    const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&state=${state}&code_challenge=${challenge}&code_challenge_method=S256`;

    const response = NextResponse.redirect(authUrl);
    response.cookies.set('tiktok_code_verifier', verifier, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 10, // 10 minutes
        path: '/'
    });
    
    return response;
}
