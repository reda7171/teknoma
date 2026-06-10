import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { isAuthenticated } from '@/lib/actions/auth'
import CallCenterClient from './CallCenterClient'

export const dynamic = 'force-dynamic'

export default async function CallCenterPage() {
    const auth = await isAuthenticated()
    if (!auth) {
        redirect('/fr/login')
    }

    // Fetch orders that need follow-up (PENDING and RETURNED mostly)
    const orders = await prisma.order.findMany({
        where: {
            status: {
                in: ['PENDING', 'RETURNED', 'CONFIRMED']
            }
        },
        orderBy: {
            createdAt: 'desc'
        },
        include: {
            items: true
        }
    })

    return <CallCenterClient initialOrders={orders} />
}
