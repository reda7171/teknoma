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
        return NextResponse.redirect(`${baseUrl}/fr/admin/config/n8n?error=tiktok_auth_denied`);
    }

    if (!code) {
        return NextResponse.redirect(`${baseUrl}/fr/admin/config/n8n?error=no_code`);
    }

    try {
        const clientKey = await getSetting('tiktok_app_id');
        const clientSecret = await getSetting('tiktok_client_secret');

        if (!clientKey || !clientSecret) {
            return NextResponse.redirect(`${baseUrl}/fr/admin/config/n8n?error=missing_credentials`);
        }

        const redirectUri = `${baseUrl}/api/tiktok/callback`;

        const params = new URLSearchParams();
        params.append('client_key', clientKey);
        params.append('client_secret', clientSecret);
        params.append('code', code);
        params.append('grant_type', 'authorization_code');
        params.append('redirect_uri', redirectUri);

        const codeVerifier = req.cookies.get('tiktok_code_verifier')?.value;
        if (codeVerifier) {
            params.append('code_verifier', codeVerifier);
        }

        const response = await axios.post('https://open.tiktokapis.com/v2/oauth/token/', params.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cache-Control': 'no-cache'
            }
        });

        const data = response.data;

        if (data.data && data.data.access_token) {
            await updateSetting('tiktok_access_token', data.data.access_token, 'config', 'TikTok Access Token (OAuth)');

            if (data.data.refresh_token) {
                await updateSetting('tiktok_refresh_token', data.data.refresh_token, 'config', 'TikTok Refresh Token (OAuth)');
            }
            if (data.data.open_id) {
                await updateSetting('tiktok_creator_id', data.data.open_id, 'config', 'TikTok Open ID (Creator ID)');
            }
        } else if (data.access_token) {
            // Fallback just in case
            await updateSetting('tiktok_access_token', data.access_token, 'config', 'TikTok Access Token (OAuth)');
            if (data.refresh_token) {
                await updateSetting('tiktok_refresh_token', data.refresh_token, 'config', 'TikTok Refresh Token (OAuth)');
            }
            if (data.open_id) {
                await updateSetting('tiktok_creator_id', data.open_id, 'config', 'TikTok Open ID (Creator ID)');
            }
        }

        return NextResponse.redirect(`${baseUrl}/fr/admin/config/n8n?success=tiktok_connected`);

    } catch (err: any) {
        console.error('Erreur TikTok OAuth Callback:', err.response?.data || err.message);
        return NextResponse.redirect(`${baseUrl}/fr/admin/config/n8n?error=tiktok_oauth_failed`);
    }
}
