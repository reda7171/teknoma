import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { OrderStatus } from '@prisma/client';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fullName, phone, address, city, comment, total, discount, couponCode, items, paymentMethod } = body;

    if (!fullName || !phone || !address || !city || !items || !items.length) {
      return NextResponse.json({ success: false, error: 'Données manquantes' }, { status: 400 });
    }

    const order = await prisma.order.create({
      data: {
        fullName,
        phone,
        address,
        city,
        comment,
        total,
        subtotal: total + (discount || 0),
        discount: discount || 0,
        couponCode: couponCode || null,
        status: OrderStatus.PENDING,
        paymentMethod: paymentMethod || 'COD',
        items: {
          create: items.map((item: any) => ({
            type: item.type === 'PACK' ? 'PACK' : 'BOOK',
            quantity: item.quantity,
            price: item.price || 0,
            ...(item.type === 'PACK' ? { packId: item.productId } : { bookId: item.productId })
          }))
        }
      },
      include: {
        items: {
          include: {
            book: { select: { title: true } },
            pack: { select: { name: true } },
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderDetails: {
        id: order.id,
        fullName: order.fullName,
        city: order.city,
        total: order.total,
        discount: order.discount,
        couponCode: order.couponCode,
        createdAt: order.createdAt,
        items: order.items.map(i => ({
          name: i.type === 'PACK' ? i.pack?.name : i.book?.title,
          quantity: i.quantity,
          type: i.type,
        }))
      }
    });
  } catch (error) {
    console.error('Mobile API Error - Checkout:', error);
    return NextResponse.json(
      { success: false, error: 'Erreur lors de la création de la commande' },
      { status: 500 }
    );
  }
}
