import { NextResponse } from 'next/server';
import { JumiaAPI } from '@/lib/jumia-api';
import { verifyAdmin } from '@/lib/actions/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        await verifyAdmin();

        const jumia = await JumiaAPI.getInstance();
        if (!jumia) {
            return NextResponse.json({ error: "Jumia non configuré" });
        }
        
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        const todayStr = now.toISOString().split('T')[0];
        
        // Also test what webhooks does:
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        
        const response1 = await jumia.getOrders(10, undefined, undefined, yesterdayStr, todayStr);
        const response2 = await jumia.getOrders(10, undefined, undefined, oneYearAgo.toISOString(), now.toISOString());
        
        return NextResponse.json({
            yesterdayStr,
            todayStr,
            isoStart: oneYearAgo.toISOString(),
            isoEnd: now.toISOString(),
            response1,
            response2
        });
    } catch (e: any) {
        if (e?.message?.includes('autorisé') || e?.message?.includes('administrateur')) {
            return NextResponse.json(
                { error: 'Authentification administrateur requise' },
                { status: 401, headers: { 'Cache-Control': 'private, no-store, max-age=0' } }
            );
        }
        console.error('[DEBUG JUMIA] Test failed:', e)
        return NextResponse.json(
            { error: 'Test Jumia indisponible' },
            { status: 500, headers: { 'Cache-Control': 'private, no-store, max-age=0' } }
        );
    }
}
