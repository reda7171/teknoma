import { authorizeAdminApi } from '@/lib/api-authorization'
import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/actions/auth';
import { getSetting } from '@/lib/server/site-settings'
import axios from 'axios';

export async function GET(req: NextRequest) {
    const accessDenied = await authorizeAdminApi(['ADMIN', 'MANAGER'])
    if (accessDenied) return accessDenied

    try {
        await verifyAdmin();
    } catch {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const accessToken = await getSetting('pinterest_access_token');
        const boardId = await getSetting('pinterest_board_id');

        if (!accessToken || !boardId) {
            return NextResponse.json({
                success: false,
                error: 'Identifiants Pinterest manquants (Token ou Board ID).'
            }, { status: 400 });
        }

        const res = await axios.get(`https://api.pinterest.com/v5/boards/${boardId}/pins?page_size=25&pin_metrics=true`, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            timeout: 10000
        });

        const items = res.data?.items || [];
        const pins = items.map((p: any) => {
            const m = p.pin_metrics?.lifetime_metrics || p.pin_metrics?.['90d'] || {};
            return {
                id: p.id,
                title: p.title || 'Sans titre',
                description: p.description || '',
                link: p.link || '',
                pinUrl: `https://www.pinterest.com/pin/${p.id}/`,
                createdAt: p.created_at,
                imageUrl: p.media?.images?.['600x']?.url || p.media?.images?.['1200x']?.url || p.media?.images?.['original']?.url || null,
                metrics: {
                    impressions: Number(m.impression ?? 0),
                    pinClicks: Number(m.pin_click ?? 0),
                    outboundClicks: Number(m.outbound_click ?? 0),
                    saves: Number(m.save ?? 0)
                }
            };
        });

        return NextResponse.json({
            success: true,
            boardId,
            total: pins.length,
            pins
        });
    } catch (error: any) {
        console.error('Erreur récupération pins Pinterest:', error.response?.data || error.message);
        return NextResponse.json({
            success: false,
            error: error.response?.data?.message || error.message || 'Erreur lors de la récupération des épingles'
        }, { status: 500 });
    }
}
