import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/actions/auth';
import { getSetting } from '@/lib/actions/site-settings';

export async function GET(req: NextRequest) {
    try {
        await verifyAdmin();
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientId = await getSetting('pinterest_app_id');
    if (!clientId) {
        return NextResponse.json({ error: 'Pinterest App ID not configured in Settings' }, { status: 400 });
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/pinterest/callback`;
    const scope = 'boards:read,boards:write,pins:read,pins:write,user_accounts:read';
    
    const authUrl = `https://www.pinterest.com/oauth/?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}`;

    return NextResponse.redirect(authUrl);
}
