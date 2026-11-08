import { authorizeAdminApi } from '@/lib/api-authorization'
import { NextRequest, NextResponse } from 'next/server';
import { getSetting } from '@/lib/server/site-settings'
import { updateSetting } from '@/lib/actions/site-settings'
import axios from 'axios';

export async function GET(req: NextRequest) {
    const accessDenied = await authorizeAdminApi(['ADMIN', 'MANAGER'])
    if (accessDenied) return accessDenied

    const code = req.nextUrl.searchParams.get('code');
    const error = req.nextUrl.searchParams.get('error');

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.riwaya.store';

    if (error) {
        return NextResponse.redirect(`${baseUrl}/fr/admin/config/n8n?error=pinterest_auth_denied`);
    }

    if (!code) {
        return NextResponse.redirect(`${baseUrl}/fr/admin/config/n8n?error=no_code`);
    }

    try {
        const clientId = await getSetting('pinterest_app_id');
        const clientSecret = await getSetting('pinterest_app_secret');

        if (!clientId || !clientSecret) {
            return NextResponse.redirect(`${baseUrl}/fr/admin/config/n8n?error=missing_credentials`);
        }

        const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/pinterest/callback`;

        const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

        const params = new URLSearchParams();
        params.append('grant_type', 'authorization_code');
        params.append('code', code);
        params.append('redirect_uri', redirectUri);

        const response = await axios.post('https://api.pinterest.com/v5/oauth/token', params.toString(), {
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const data = response.data;

        if (data.access_token) {
            await updateSetting('pinterest_access_token', data.access_token, 'config', 'Pinterest Access Token (OAuth)');

            if (data.refresh_token) {
                await updateSetting('pinterest_refresh_token', data.refresh_token, 'config', 'Pinterest Refresh Token (OAuth)');
            }
        }

        return NextResponse.redirect(`${baseUrl}/fr/admin/config/n8n?success=pinterest_connected`);

    } catch (err: any) {
        console.error('Erreur Pinterest OAuth Callback:', err.response?.data || err.message);
        return NextResponse.redirect(`${baseUrl}/fr/admin/config/n8n?error=pinterest_oauth_failed`);
    }
}
