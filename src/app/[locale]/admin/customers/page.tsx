import { prisma } from '@/lib/prisma'
import { Users } from 'lucide-react'
import CustomersPageClient from './CustomersPageClient'

export interface CartProductItem {
    id: string
    title: string
    price: number
    quantity: number
    image?: string
    type?: string
}

export interface CustomerCartInfo {
    itemCount: number
    total: number
    items: CartProductItem[]
    type: 'active_cart' | 'last_order' | 'empty'
    updatedAt?: string
}

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
    cart?: CustomerCartInfo
}

function cleanPhone(phone?: string | null): string {
    if (!phone) return ''
    return phone.replace(/[\s\-\.\(\)\+]/g, '')
}

function parseCartData(rawJson?: string | null): CartProductItem[] {
    if (!rawJson) return []
    try {
        const parsed = JSON.parse(rawJson)
        if (Array.isArray(parsed)) {
            return parsed.map((it: any) => ({
                id: String(it.id || Math.random()),
                title: it.title || it.name || 'Livre',
                price: Number(it.price) || 0,
                quantity: Number(it.quantity) || 1,
                image: it.image || undefined,
                type: it.type || 'BOOK'
            }))
        }
    } catch {}
    return []
}

async function getCustomers(): Promise<CustomerItem[]> {
    const [orders, customers, users, abandonedCarts] = await Promise.all([
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
                items: {
                    select: {
                        id: true,
                        quantity: true,
                        price: true,
                        type: true,
                        book: {
                            select: {
                                id: true,
                                title: true,
                                image: true,
                            }
                        },
                        pack: {
                            select: {
                                id: true,
                                name: true,
                                image: true,
                            }
                        },
                        gift: {
                            select: {
                                id: true,
                                name: true,
                                image: true,
                            }
                        },
                        extraProduct: {
                            select: {
                                id: true,
                                name: true,
                                image: true,
                            }
                        }
                    }
                }
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
        prisma.abandonedCart.findMany({
            orderBy: { updatedAt: 'desc' }
        }),
    ])

    const abandonedMap = new Map<string, any>()
    for (const ac of abandonedCarts) {
        const pKey = cleanPhone(ac.phone)
        const eKey = ac.email ? ac.email.toLowerCase().trim() : ''
        if (pKey && !abandonedMap.has(pKey)) abandonedMap.set(pKey, ac)
        if (eKey && !abandonedMap.has(eKey)) abandonedMap.set(eKey, ac)
    }

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
            fullName: u.fullName || u.email?.split('@')[0] || 'Lecteur Tekno Store',
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

    // 4. Association des produits dans les paniers
    for (const reader of readersMap.values()) {
        const pKey = cleanPhone(reader.phone)
        const eKey = reader.email ? reader.email.toLowerCase().trim() : ''
        const ac = (pKey && abandonedMap.get(pKey)) || (eKey && abandonedMap.get(eKey))

        if (ac) {
            const items = parseCartData(ac.cartData)
            if (items.length > 0) {
                reader.cart = {
                    itemCount: items.reduce((s, it) => s + it.quantity, 0),
                    total: ac.total || items.reduce((s, it) => s + it.price * it.quantity, 0),
                    items,
                    type: 'active_cart',
                    updatedAt: ac.updatedAt.toISOString(),
                }
                continue
            }
        }

        // Si pas de panier abandonné, récupérer les articles de la dernière commande
        const matchingOrder = orders.find(o => {
            const op = cleanPhone(o.phone)
            const oe = o.email ? o.email.toLowerCase().trim() : ''
            return (pKey && op === pKey) || (eKey && oe === eKey)
        })

        if (matchingOrder && matchingOrder.items && matchingOrder.items.length > 0) {
            const orderItems: CartProductItem[] = matchingOrder.items.map(it => ({
                id: it.id,
                title: it.book?.title || it.pack?.name || it.gift?.name || it.extraProduct?.name || 'Article',
                price: it.price,
                quantity: it.quantity,
                image: it.book?.image || it.pack?.image || it.gift?.image || it.extraProduct?.image || undefined,
                type: it.type
            }))

            reader.cart = {
                itemCount: orderItems.reduce((s, it) => s + it.quantity, 0),
                total: matchingOrder.total || 0,
                items: orderItems,
                type: 'last_order',
                updatedAt: matchingOrder.createdAt.toISOString()
            }
        } else {
            reader.cart = {
                itemCount: 0,
                total: 0,
                items: [],
                type: 'empty'
            }
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
            {/* Header section style Tekno Store */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-100">
                <div>
                    <h1 className="text-5xl lg:text-6xl font-black text-black tracking-tighter mb-2">
                        Lecteurs<span className="text-gray-200">.</span>
                    </h1>
                    <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px]">
                        Base de données centralisée (**)
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="bg-black text-white px-8 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-black/10">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span>Total ** Profils</span>
                    </div>
                </div>
            </div>

            {/* Statistiques rapides */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Volume Ventes', value: '** درهم' },
                    { label: 'Commandes', value: '** Total' },
                    { label: 'Panier Moyen', value: '** درهم' },
                    { label: 'LTV Moyen', value: '** درهم' }
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
