'use server';

import { prisma } from '@/lib/prisma';
import { OrderStatus, OrderItemType, SalesChannel } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function getCustomerByPhone(phone: string) {
  try {
    const lastOrder = await prisma.order.findFirst({
      where: { phone },
      orderBy: { createdAt: 'desc' },
      select: { fullName: true, address: true, city: true }
    });
    return { success: true, customer: lastOrder };
  } catch (error) {
    console.error('getCustomerByPhone Error:', error);
    return { success: false, error: 'Erreur lors de la récupération du client' };
  }
}

export async function createPOSOrder(data: {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  items: {
    id: string;
    type: 'BOOK' | 'PACK' | 'ACCESSORY';
    quantity: number;
    price: number;
  }[];
  total: number;
  subtotal: number;
  discount: number;
  shippingFees: number;
  shippingCompany?: string;
  posSessionId?: string;
}) {
  try {

    // Récupérer les prix de revient (costPrice) pour chaque article
    const itemsWithCost = await Promise.all(data.items.map(async (item) => {
      let costPrice = 0;
      if (item.type === 'BOOK') {
        const book = await prisma.book.findUnique({
          where: { id: item.id },
          select: { costPrice: true }
        });
        costPrice = book?.costPrice || 0;
      } else if (item.type === 'PACK') {
        const pack = await prisma.pack.findUnique({
          where: { id: item.id },
          select: { costPrice: true }
        });
        costPrice = pack?.costPrice || 0;
      } else if (item.type === 'ACCESSORY') {
        const acc = await prisma.extraProduct.findUnique({
          where: { id: item.id },
          select: { costPrice: true }
        });
        costPrice = acc?.costPrice || 0;
      }
      return { ...item, costPrice };
    }));

    const order = await prisma.order.create({
      data: {
        salesChannel: SalesChannel.ADMIN_POS,
        fullName: data.fullName,
        phone: data.phone,
        address: data.address,
        city: data.city,
        total: data.total,
        subtotal: data.subtotal,
        discount: data.discount,
        shippingFees: data.shippingFees,
        shippingCompany: data.shippingCompany,
        posSessionId: data.posSessionId,
        status: OrderStatus.CONFIRMED,
        paymentMethod: 'CASH',
        items: {
          create: itemsWithCost.map((item) => ({
            type: item.type as OrderItemType,
            quantity: item.quantity,
            price: item.price,
            costPrice: item.costPrice,
            bookId: item.type === 'BOOK' ? item.id : null,
            packId: item.type === 'PACK' ? item.id : null,
            extraProductId: item.type === 'ACCESSORY' ? item.id : null,
          })),
        },
      },
    });



    // Update stock for books
    const impactedBookIds: string[] = [];
    for (const item of data.items) {
      if (item.type === 'BOOK') {
        impactedBookIds.push(item.id);
        await prisma.book.updateMany({
          where: { id: item.id },
          data: { stock: { decrement: item.quantity } },
        });
      } else if (item.type === 'PACK') {
        // Increment books in pack? (Optional depending on business logic)
        const pack = await prisma.pack.findUnique({
          where: { id: item.id },
          include: { books: true },
        });
        if (pack) {
          for (const pb of pack.books) {
            impactedBookIds.push(pb.bookId);
            await prisma.book.updateMany({
              where: { id: pb.bookId },
              data: { stock: { decrement: item.quantity } },
            });
          }
        }
      } else if (item.type === 'ACCESSORY') {
        await prisma.extraProduct.updateMany({
          where: { id: item.id },
          data: { stock: { decrement: item.quantity } },
        });
      }
    }

    if (impactedBookIds.length > 0) {
      import('@/lib/actions/jumia').then(({ syncJumiaStockForBooksBackground }) => {
        syncJumiaStockForBooksBackground(impactedBookIds).catch(console.error);
      });
    }

    revalidatePath('/admin/orders');

    try {
      const { getOrderById } = await import('@/lib/actions/orders');
      const fullOrder = await getOrderById(order.id);
      if (fullOrder) {
        const { sendOrderNotification } = await import('@/lib/telegram');
        const orderWithSource = { ...fullOrder, source: 'Admin (POS)' };
        sendOrderNotification(orderWithSource as any).catch(console.error);
      }
    } catch (e) {
      console.error('Erreur Telegram Notification POS:', e);
    }

    return { success: true, orderId: order.id };
  } catch (error: any) {
    console.error('POS Order Error:', error);
    // Format error stack to return to client for debugging
    const errorMessage = String(error?.message || error);
    return { success: false, error: errorMessage };
  }
}
