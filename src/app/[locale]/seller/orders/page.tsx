import { getSellerOrders } from '@/lib/actions/seller/dashboard'
import { getAdminUser, getAdminRole } from '@/lib/actions/auth'
import { getCommunityUser } from '@/lib/actions/community-auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import SellerOrdersClient from './SellerOrdersClient'

export default async function SellerOrdersPage({ params }: { params: Promise<{ locale: string }> }) {
    const locale = (await params).locale

    let userId = await getAdminUser()
    let role = await getAdminRole()

    if (!userId || role !== 'SELLER') {
        const commUser = await getCommunityUser()
        if (commUser && commUser.role === 'SELLER') {
            userId = commUser.id
            role = 'SELLER'
        }
    }

    if (!userId || role !== 'SELLER') {
        redirect(`/${locale}/admin/login`)
    }

    const orders = await getSellerOrders()

    return <SellerOrdersClient initialOrders={orders as any} locale={locale} />
}
