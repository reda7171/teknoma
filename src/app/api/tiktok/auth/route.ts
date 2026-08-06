import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/actions/auth';
import { getSetting } from '@/lib/actions/site-settings';

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

    const redirectUri = `${req.nextUrl.origin}/api/tiktok/callback`;
    const scope = 'user.info.basic,video.upload,video.publish';
    
    // Generate random state for CSRF protection
    const state = Math.random().toString(36).substring(7);

    const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&state=${state}`;

    return NextResponse.redirect(authUrl);
}
