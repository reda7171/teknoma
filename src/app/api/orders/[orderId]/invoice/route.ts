import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateInvoiceHtml } from '@/lib/utils/invoiceGenerator';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ orderId: string }> }
) {
    try {
        const { orderId } = await context.params;
        const searchParams = request.nextUrl.searchParams;
        const locale = searchParams.get('locale') || 'fr';

        if (!orderId) {
            return new NextResponse('Order ID is required', { status: 400 });
        }

        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                items: {
                    include: {
                        book: { select: { title: true } },
                        pack: { select: { name: true } },
                        extraProduct: { select: { name: true } },
                        digitalProduct: { select: { title: true } }
                    }
                }
            }
        });

        if (!order) {
            return new NextResponse('Order not found', { status: 404 });
        }

        // Récupérer dynamiquement les numéros des agents WhatsApp et le logo du site
        let formattedAgentsPhone = "07 02 22 05 75 / 06 66 03 81 29";
        let siteLogo = "/uploads/books/0dded6c73e7283c1-TEKNO__1_.png";
        try {
            const settings = await prisma.siteSettings.findMany({
                where: { key: { in: ['whatsapp_agents', 'site_logo'] } }
            });
            const agentsSetting = settings.find(s => s.key === 'whatsapp_agents');
            const logoSetting = settings.find(s => s.key === 'site_logo');

            if (logoSetting?.value) {
                siteLogo = logoSetting.value;
            }

            if (agentsSetting?.value) {
                const agents = JSON.parse(agentsSetting.value);
                if (Array.isArray(agents)) {
                    const activePhones = agents
                        .filter((a: any) => a.enabled !== false && a.phone)
                        .map((a: any) => {
                            const raw = String(a.phone).replace(/\s+/g, '');
                            if (/^0[5-7]\d{8}$/.test(raw)) {
                                return raw.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
                            }
                            return a.phone;
                        });
                    if (activePhones.length > 0) {
                        formattedAgentsPhone = activePhones.join(' / ');
                    }
                }
            }
        } catch {}

        const html = generateInvoiceHtml(order as any, locale, formattedAgentsPhone, siteLogo);

        return new Response(html, {
            status: 200,
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'no-store, max-age=0'
            }
        });
    } catch (error) {
        console.error('Invoice route error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
