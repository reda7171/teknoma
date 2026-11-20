import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import OrderTrackingClient from './OrderTrackingClient'
import { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ orderId: string, locale: string }> }): Promise<Metadata> {
    const { orderId } = await params
    return {
        title: `Suivi de Commande #${orderId.substring(0, 8)} | Tekno Store`,
        description: "Suivez l'état de votre commande sur Tekno Store.",
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
        include: {
            items: {
                include: {
                    book: { select: { title: true, image: true, author: true } },
                    pack: { select: { name: true, image: true } },
                    extraProduct: { select: { name: true, image: true } }
                }
            },
            statusHistory: {
                orderBy: { createdAt: 'desc' }
            }
        }
    })

    if (!order) {
        return notFound()
    }

    let shippingCompany = null
    if (order.shippingCompany) {
        shippingCompany = await prisma.shippingCompany.findUnique({
            where: { id: order.shippingCompany }
        })
    }

    return (
        <OrderTrackingClient
            order={order as any}
            shippingCompany={shippingCompany}
            locale={locale}
        />
    )
}
