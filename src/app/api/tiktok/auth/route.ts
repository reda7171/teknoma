import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/actions/auth';
import { getSetting } from '@/lib/actions/site-settings';

export async function GET(req: NextRequest) {
    try {
        await verifyAdmin();
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientKey = await getSetting('tiktok_app_id');
    if (!clientKey) {
        return NextResponse.json({ error: 'TikTok App ID (Client Key) not configured in Settings' }, { status: 400 });
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.riwaya.store'}/api/tiktok/callback`;
    const scope = 'user.info.basic,video.upload,video.publish';
    
    // Generate random state for CSRF protection
    const state = Math.random().toString(36).substring(7);

    const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&state=${state}`;

    return NextResponse.redirect(authUrl);
}
