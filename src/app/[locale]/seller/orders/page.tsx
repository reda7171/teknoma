import { getSellerOrders } from '@/lib/actions/seller/dashboard'
import { requireSellerSession } from '@/lib/server/seller-auth'
import SellerOrdersClient from './SellerOrdersClient'

export default async function SellerOrdersPage({ params }: { params: Promise<{ locale: string }> }) {
    const locale = (await params).locale
    await requireSellerSession(locale)

    const orders = await getSellerOrders()

    return <SellerOrdersClient initialOrders={orders as any} locale={locale} />
}
