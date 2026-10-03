'use client'

import { useEffect } from 'react'
import { trackPurchase } from '@/lib/tracking'

interface TrackPurchaseOrderProps {
    order: {
        id: string
        total: number
        shippingFees?: number | null
        paymentMethod?: string | null
        items: Array<{
            id: string
            price: number
            quantity: number
            book?: { id: string; title: string } | null
            pack?: { id: string; name: string } | null
            digitalProduct?: { id: string; title: string } | null
            extraProduct?: { id: string; name: string } | null
        }>
    }
}

export default function TrackPurchaseOrder({ order }: TrackPurchaseOrderProps) {
    useEffect(() => {
        if (!order?.id) return

        trackPurchase({
            id: order.id,
            total: order.total,
            shippingFee: order.shippingFees || 0,
            paymentMethod: order.paymentMethod || 'COD',
            items: order.items.map(item => ({
                id: item.book?.id || item.pack?.id || item.digitalProduct?.id || item.extraProduct?.id || item.id,
                title: item.book?.title || item.pack?.name || item.digitalProduct?.title || item.extraProduct?.name || 'Article',
                price: Number(item.price),
                quantity: item.quantity,
                category: item.book ? 'Book' : item.pack ? 'Pack' : 'Product'
            }))
        })
    }, [order])

    return null
}
