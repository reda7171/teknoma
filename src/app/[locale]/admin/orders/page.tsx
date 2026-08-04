import { prisma } from '@/lib/prisma'
import { Search, Filter, Eye, Usb, Baby, BookOpen } from 'lucide-react'
import Link from 'next/link'
import ExportOrdersButton from '@/components/admin/ExportOrdersButton'
import ImportOrdersButton from '@/components/admin/ImportOrdersButton'
import { isAuthenticated } from '@/lib/actions/auth'
import { redirect } from 'next/navigation'

import OrdersTableClient from './OrdersTableClient'
import OrdersPageClient from './OrdersPageClient'

async function getOrders(status?: string) {
    const orders = await prisma.order.findMany({
        where: status ? { status: status as any } : undefined,
        orderBy: { createdAt: 'desc' },
        include: {
            items: {
                include: {
                    book: { select: { title: true, image: true, price: true } },
                    pack: { select: { name: true, price: true } }
                }
            },
            expense: { select: { title: true } }
        },
    })

    // Charger les sociétés de livraison pour enrichir les commandes
    const companies = await prisma.shippingCompany.findMany()
    const companyMap = new Map(companies.map(c => [c.id, c]))

    return orders.map(order => ({
        ...order,
        shippingCompanyName: order.shippingCompany ? companyMap.get(order.shippingCompany)?.name || order.shippingCompany : null,
        shippingCompanySupportPhone: order.shippingCompany ? companyMap.get(order.shippingCompany)?.supportPhone || null : null,
        shippingCompanyLogo: order.shippingCompany ? companyMap.get(order.shippingCompany)?.logo || null : null,
    }))
}

export default async function AdminOrdersPage(props: {
    params: Promise<{ locale: string }>
    searchParams: Promise<{ status?: string }>
}) {
    const params = await props.params
    const { locale } = params
    const searchParams = await props.searchParams

    const isAuth = await isAuthenticated()
    if (!isAuth) {
        redirect(`/${locale}/admin/login`)
    }

    const orders = await getOrders(searchParams.status)

    const statusColors = {
        PENDING: 'bg-yellow-100 text-yellow-800',
        CONFIRMED: 'bg-blue-100 text-blue-800',
        SHIPPED: 'bg-purple-100 text-purple-800',
        DELIVERED: 'bg-green-100 text-green-800',
        RETURNED: 'bg-orange-100 text-orange-800',
        CANCELLED: 'bg-red-100 text-red-800',
    }

    const statusLabels = {
        PENDING: 'En attente',
        CONFIRMED: 'Confirmée',
        SHIPPED: 'En livraison',
        DELIVERED: 'Livrée',
        RETURNED: 'Retournée',
        CANCELLED: 'Annulée',
    }

    const stats = {
        totalArticles: orders.reduce((sum, order) => sum + order.items.reduce((s, i) => s + i.quantity, 0), 0),
        totalRevenue: orders.reduce((sum, order) => sum + order.total, 0),
        totalNetProfit: orders.reduce((sum, order) => {
            const itemCosts = order.items.reduce((itemSum, item) => itemSum + ((item as any).costPrice || 0) * item.quantity, 0)
            return sum + (order.total - itemCosts - 2.65)
        }, 0)
    }

    const companies = await prisma.shippingCompany.findMany({
        where: { isActive: true }
    })

    const paymentSettings = await prisma.siteSettings.findMany({
        where: { key: { in: ['payment_cod_enabled', 'payment_bank_transfer_enabled', 'payment_paypal_enabled', 'payment_stripe_enabled', 'payment_cmi_enabled'] } }
    })
    
    const activePaymentMethods = {
        COD: paymentSettings.find(s => s.key === 'payment_cod_enabled')?.value === 'true',
        BANK_TRANSFER: paymentSettings.find(s => s.key === 'payment_bank_transfer_enabled')?.value === 'true',
        PAYPAL: paymentSettings.find(s => s.key === 'payment_paypal_enabled')?.value === 'true',
        STRIPE: paymentSettings.find(s => s.key === 'payment_stripe_enabled')?.value === 'true',
        CMI: paymentSettings.find(s => s.key === 'payment_cmi_enabled')?.value === 'true',
    }

    const deliveryInvoices = await prisma.expense.findMany({
        where: { category: 'INCOME_DELIVERY', type: 'INCOME' },
        orderBy: { date: 'desc' },
        select: { id: true, title: true, amount: true, date: true, description: true }
    })

    return (
        <OrdersPageClient 
            orders={orders as any}
            locale={locale}
            statusColors={statusColors}
            statusLabels={statusLabels}
            currentStatus={searchParams.status}
            stats={stats}
            shippingCompanies={companies}
            activePaymentMethods={activePaymentMethods}
            deliveryInvoices={deliveryInvoices}
        />
    )
}
