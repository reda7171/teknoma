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

        const html = generateInvoiceHtml(order as any, locale);

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
