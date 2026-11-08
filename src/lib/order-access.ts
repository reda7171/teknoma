import 'server-only'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { getJwtSecret } from '@/lib/jwt-secret'
import { getAuthenticatedAdmin, hasAdminRole } from '@/lib/admin-auth'
import { getMobileCustomer } from '@/lib/mobile-auth'

const PREFIX = 'riwaya-order-'
const PURPOSE = 'guest-order-access'

export async function grantOrderAccess(orderId: string) {
    const token = jwt.sign({ purpose: PURPOSE }, getJwtSecret(), {
        algorithm: 'HS256', subject: orderId, expiresIn: '30d',
    })
    const store = await cookies()
    store.set(`${PREFIX}${orderId}`, token, {
        httpOnly: true, secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax', path: '/', maxAge: 30 * 24 * 60 * 60,
    })
}

export async function getGuestOrderIds() {
    const store = await cookies()
    const ids: string[] = []
    for (const cookie of store.getAll().filter(c => c.name.startsWith(PREFIX)).slice(0, 30)) {
        try {
            const payload = jwt.verify(cookie.value, getJwtSecret(), { algorithms: ['HS256'] })
            const id = cookie.name.slice(PREFIX.length)
            if (typeof payload !== 'string' && payload.purpose === PURPOSE && payload.sub === id) ids.push(id)
        } catch { /* Invalid, expired and forged cookies grant no access. */ }
    }
    return ids
}

export async function canReadOrder(order: { id: string; sellerId?: string | null; customerId?: string | null }, request?: Request) {
    if (request) {
        const customer = await getMobileCustomer(request)
        if (customer && order.customerId === customer.id) return true
    }
    const admin = await getAuthenticatedAdmin()
    if (hasAdminRole(admin, ['ADMIN', 'MANAGER', 'CONFIRMATOR'])) return true
    if (admin?.role === 'SELLER' && order.sellerId === admin.id) return true
    return (await getGuestOrderIds()).includes(order.id)
}
