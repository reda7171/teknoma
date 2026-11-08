import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMobileCustomer } from '@/lib/mobile-auth';

// Libellés de statut en français
const STATUS_LABELS: Record<string, string> = {
  PENDING:    'En attente',
  CONFIRMED:  'Confirmée',
  PROCESSING: 'En préparation',
  SHIPPED:    'En livraison',
  DELIVERED:  'Livrée',
  CANCELLED:  'Annulée',
  RETURNED:   'Retournée',
};

export async function GET(request: Request) {
  const customer = await getMobileCustomer(request);
  if (!customer) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const phone = searchParams.get('phone')?.trim();
  const orderId = searchParams.get('orderId')?.trim();

  try {
    const orders = await prisma.order.findMany({
      where: { customerId: customer.id, ...(orderId ? { id: orderId } : {}) },
      select: {
        id: true,
        status: true,
        total: true,
        createdAt: true,
        city: true,
        trackingID: true,
        items: {
          select: {
            quantity: true,
            type: true,
            book:  { select: { title: true, image: true } },
            pack:  { select: { name: true, image: true } },
          }
        },
        statusHistory: {
          select: {
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      success: true,
      orders: orders.map(o => ({
        id:          o.id,
        status:      o.status,
        statusLabel: STATUS_LABELS[o.status] ?? o.status,
        total:       o.total,
        city:        o.city,
        trackingID:  o.trackingID,
        createdAt:   o.createdAt,
        statusHistory: o.statusHistory,
        items: o.items.map(i => ({
          quantity: i.quantity,
          type:     i.type,
          name:     i.type === 'PACK' ? i.pack?.name : i.book?.title,
          image:    i.type === 'PACK' ? i.pack?.image : i.book?.image,
        })),
      })),
    });
  } catch (error) {
    console.error('Mobile API Error - Orders:', error);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
