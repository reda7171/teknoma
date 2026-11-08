import 'server-only'
import jwt from 'jsonwebtoken'
import { prisma } from '@/lib/prisma'
import { getJwtSecret } from '@/lib/jwt-secret'
import { createHash } from 'node:crypto'

export function mobilePasswordVersion(hash: string) { return createHash('sha256').update(hash).digest('hex') }

export async function getMobileCustomer(request: Request) {
    const header = request.headers.get('authorization')
    if (!header?.startsWith('Bearer ')) return null
    try {
        const payload = jwt.verify(header.slice(7), getJwtSecret(), { algorithms: ['HS256'], issuer: 'riwaya', audience: 'mobile-customer' })
        if (typeof payload === 'string' || payload.role !== 'CUSTOMER' || typeof payload.id !== 'string') return null
        const customer = await prisma.customer.findUnique({
            where: { id: payload.id },
            select: { id: true, email: true, phone: true, password: true },
        })
        if (!customer?.password || payload.ver !== mobilePasswordVersion(customer.password)) return null
        return { id: customer.id, email: customer.email, phone: customer.phone }
    } catch {
        return null
    }
}
