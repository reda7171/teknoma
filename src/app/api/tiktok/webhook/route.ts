import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        // TikTok Webhooks expect a 200 OK response quickly.
        const body = await req.json();
        void('TikTok Webhook received:', body);

        // TODO: Handle specific TikTok webhook events here (e.g. video upload success)
        
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error('Error in TikTok Webhook:', error);
        return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
    }
}
