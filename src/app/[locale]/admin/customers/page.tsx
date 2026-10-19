import { prisma } from '@/lib/prisma'
import { Users } from 'lucide-react'
import CustomersPageClient from './CustomersPageClient'

export interface CustomerItem {
    id: string
    customerId?: string
    userId?: string
    fullName: string
    phone: string
    email?: string
    city?: string
    address?: string
    totalOrders: number
    totalSpent: number
    lastOrderDate: string
    source: 'google' | 'facebook' | 'order' | 'community'
}

function cleanPhone(phone?: string | null): string {
    if (!phone) return ''
    return phone.replace(/[\s\-\.\(\)\+]/g, '')
}

async function getCustomers(): Promise<CustomerItem[]> {
    const [orders, customers, users] = await Promise.all([
        prisma.order.findMany({
            select: {
                id: true,
                fullName: true,
                phone: true,
                email: true,
                city: true,
                address: true,
                total: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
        }),
        prisma.customer.findMany({
            orderBy: { updatedAt: 'desc' },
        }),
        prisma.user.findMany({
            where: { role: 'USER' },
            include: {
                loginHistory: {
                    orderBy: { createdAt: 'desc' },
                },
            },
            orderBy: { createdAt: 'desc' },
        }),
    ])

    const readersMap = new Map<string, CustomerItem>()

    // 1. Ingestion des utilisateurs enregistrés (Google, Facebook, Communauté)
    for (const u of users) {
        const isGoogle =
            u.loginHistory.some(
                (lh) =>
                    lh.userAgent &&
                    (lh.userAgent.toLowerCase().includes('google') ||
                        lh.userAgent.includes('google OAuth'))
            ) || (u.email && u.email.endsWith('@gmail.com'))

        const isFacebook = u.loginHistory.some(
            (lh) => lh.userAgent && lh.userAgent.toLowerCase().includes('facebook')
        )

        const source: 'google' | 'facebook' | 'community' = isGoogle
            ? 'google'
            : isFacebook
            ? 'facebook'
            : 'community'

        const emailKey = u.email ? u.email.toLowerCase().trim() : ''
        const phoneKey = cleanPhone(u.phone)
        const key = emailKey || phoneKey || u.id

        readersMap.set(key, {
            id: u.id,
            userId: u.id,
            fullName: u.fullName || u.email?.split('@')[0] || 'Lecteur Riwaya',
            phone: u.phone || '',
            email: u.email || '',
            city: u.city || '',
            address: u.address || '',
            totalOrders: 0,
            totalSpent: 0,
            lastOrderDate: u.createdAt.toISOString(),
            source,
        })
    }

    // 2. Ingestion des commandes COD (associe au compte ou crée une entrée)
    for (const o of orders) {
        const phoneKey = cleanPhone(o.phone)
        const emailKey = o.email ? o.email.toLowerCase().trim() : ''

        let key = ''
        if (emailKey && readersMap.has(emailKey)) {
            key = emailKey
        } else if (phoneKey && readersMap.has(phoneKey)) {
            key = phoneKey
        } else {
            key = phoneKey || emailKey || o.id
        }

        if (!readersMap.has(key)) {
            readersMap.set(key, {
                id: o.id,
                fullName: o.fullName || 'Client Commande',
                phone: o.phone || '',
                email: o.email || '',
                city: o.city || '',
                address: o.address || '',
                totalOrders: 0,
                totalSpent: 0,
                lastOrderDate: o.createdAt.toISOString(),
                source: 'order',
            })
        }

        const reader = readersMap.get(key)!
        reader.totalOrders += 1
        reader.totalSpent += o.total || 0
        if (new Date(o.createdAt) > new Date(reader.lastOrderDate)) {
            reader.lastOrderDate = o.createdAt.toISOString()
            if (o.city && !reader.city) reader.city = o.city
            if (o.address && !reader.address) reader.address = o.address
            if (o.phone && !reader.phone) reader.phone = o.phone
        }
    }

    // 3. Ingestion des profils existants de Customer
    for (const c of customers) {
        const phoneKey = cleanPhone(c.phone)
        const emailKey = c.email ? c.email.toLowerCase().trim() : ''

        let key = ''
        if (emailKey && readersMap.has(emailKey)) {
            key = emailKey
        } else if (phoneKey && readersMap.has(phoneKey)) {
            key = phoneKey
        } else {
            key = phoneKey || emailKey || c.id
        }

        if (!readersMap.has(key)) {
            readersMap.set(key, {
                id: c.id,
                customerId: c.id,
                fullName: c.fullName,
                phone: c.phone || '',
                email: c.email || '',
                city: c.city || '',
                address: c.address || '',
                totalOrders: c.totalOrders || 0,
                totalSpent: c.totalSpent || 0,
                lastOrderDate: (c.lastOrderDate || c.createdAt).toISOString(),
                source: 'order',
            })
        } else {
            const reader = readersMap.get(key)!
            reader.customerId = c.id
            if (c.totalOrders && c.totalOrders > reader.totalOrders) {
                reader.totalOrders = c.totalOrders
            }
            if (c.totalSpent && c.totalSpent > reader.totalSpent) {
                reader.totalSpent = c.totalSpent
            }
            if (c.address && !reader.address) reader.address = c.address
            if (c.city && !reader.city) reader.city = c.city
        }
    }

    // Tri par date de dernière activité décroissante
    return Array.from(readersMap.values()).sort(
        (a, b) => new Date(b.lastOrderDate).getTime() - new Date(a.lastOrderDate).getTime()
    )
}

export default async function AdminCustomersPage() {
    const customers = await getCustomers()

    return (
        <div className="space-y-12">
            {/* Header section style Riwaya */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-100">
                <div>
                    <h1 className="text-5xl lg:text-6xl font-black text-black tracking-tighter mb-2">
                        Lecteurs<span className="text-gray-200">.</span>
                    </h1>
                    <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px]">
                        Base de données centralisée ({customers.length})
                    </p>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="bg-black text-white px-8 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-black/10">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span>Total {customers.length} Profils</span>
                    </div>
                </div>
            </div>

            {/* Statistiques rapides */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Volume Ventes', value: `${customers.reduce((acc, c) => acc + c.totalSpent, 0).toLocaleString()} درهم` },
                    { label: 'Commandes', value: `${customers.reduce((acc, c) => acc + c.totalOrders, 0)} Total` },
                    { label: 'Panier Moyen', value: `${(customers.reduce((acc, c) => acc + c.totalSpent, 0) / (customers.reduce((acc, c) => acc + c.totalOrders, 0) || 1)).toFixed(0)} درهم` },
                    { label: 'LTV Moyen', value: `${(customers.reduce((acc, c) => acc + c.totalSpent, 0) / (customers.length || 1)).toFixed(0)} درهم` }
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4">{stat.label}</p>
                        <p className="text-3xl font-black text-black tracking-tighter">
                            {stat.value}
                        </p>
                    </div>
                ))}
            </div>

            <CustomersPageClient initialCustomers={customers} />
        </div>
    )
}
