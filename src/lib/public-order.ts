import 'server-only'
import type { Prisma } from '@prisma/client'

// Customer responses deliberately exclude cost prices, staff notes, delivery
// labels, payment internals and digital-file URLs.
export const publicOrderSelect = {
    id: true, fullName: true, email: true, phone: true, address: true, city: true,
    comment: true, total: true, subtotal: true, shippingFees: true, discount: true,
    couponCode: true, status: true, paymentMethod: true, isPaid: true,
    createdAt: true, updatedAt: true, trackingID: true, shippingCompany: true,
    customerId: true, sellerId: true,
    items: { select: {
        id: true, type: true, quantity: true, price: true, isMissing: true,
        bookId: true, packId: true, giftId: true, extraProductId: true, digitalProductId: true,
        book: { select: { id: true, title: true, image: true, author: true, isbn: true, category: true } },
        pack: { select: { id: true, name: true, image: true } },
        gift: { select: { id: true, name: true, image: true } },
        extraProduct: { select: { id: true, name: true, image: true } },
        digitalProduct: { select: { id: true, title: true, image: true } },
    } },
    statusHistory: { select: { status: true, createdAt: true }, orderBy: { createdAt: 'desc' } },
} satisfies Prisma.OrderSelect
