import { publicOrderSelect } from '@/lib/public-order'
import { prisma } from '@/lib/prisma'
import { canReadOrder } from '@/lib/order-access'
import { notFound } from 'next/navigation'
import OrderTrackingClient from './OrderTrackingClient'
import { Metadata } from 'next'
import { getAmanaTracking } from '@/lib/shipping/amana-tracking'

export async function generateMetadata({ params }: { params: Promise<{ orderId: string, locale: string }> }): Promise<Metadata> {
    const { orderId } = await params
    return {
        title: `Suivi de Commande #${orderId.substring(0, 8)} | Riwaya`,
        description: "Suivez l'état de votre commande sur Riwaya.",
        robots: {
            index: false, // Ne pas indexer les pages de suivi
            follow: false
        }
    }
}

export default async function OrderTrackingPage(props: {
    params: Promise<{ orderId: string, locale: string }>
}) {
    const params = await props.params
    const { orderId, locale } = params

    // Fetch order details
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: publicOrderSelect
    })

    if (!order || !(await canReadOrder(order))) {
        return notFound()
    }

    let shippingCompany = null
    if (order.shippingCompany) {
        shippingCompany = await prisma.shippingCompany.findUnique({
            where: { id: order.shippingCompany }
        }).catch(() => null)
    }

    const isAmanaShipping = order.shippingCompany === 'Amana International'
        || order.shippingCompany === 'AMANA_WORLDWIDE'
        || order.shippingFees === 150
        || (Boolean(order.trackingID) && String(order.trackingID).endsWith('MA'))

    const amanaTracking = isAmanaShipping ? await getAmanaTracking(order) : null

    return (
        <OrderTrackingClient
            order={order as any}
            shippingCompany={shippingCompany}
            amanaTracking={amanaTracking}
            locale={locale}
        />
    )
}
