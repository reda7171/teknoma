import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { randomBytes } from 'node:crypto'
import { getJwtSecret } from '@/lib/jwt-secret'
import { mobilePasswordVersion } from '@/lib/mobile-auth'
import { rateLimit, getIpIdentifier } from '@/lib/rate-limit'
import { readJsonBody } from '@/lib/request-body'

const schema = z.object({
    email: z.string().email().max(255).optional(), phone: z.string().trim().min(8).max(20),
    fullName: z.string().trim().min(2).max(100), password: z.string().min(12).max(72),
})
export async function POST(request: Request) {
    if (!(await rateLimit(`mobile_register_${await getIpIdentifier()}`, { limit: 5, windowMs: 15 * 60 * 1000 })).success) return NextResponse.json({ error: 'Veuillez reessayer plus tard' }, { status: 429 })
    let input: z.infer<typeof schema>
    try {
        input = schema.parse(await readJsonBody(request))
        if (Buffer.byteLength(input.password) > 72) throw new Error('Password too long')
    } catch { return NextResponse.json({ error: 'Donnees invalides. Mot de passe de 12 caracteres minimum.' }, { status: 400 }) }
    try {
        const secret = getJwtSecret()
        const existing = await prisma.customer.findFirst({ where: { OR: [{ phone: input.phone }, ...(input.email ? [{ email: input.email }] : [])] } })
        // A COD record is not proof of identity. Never claim it with a new password.
        if (existing) return NextResponse.json({ error: 'Ce compte necessite une connexion ou une recuperation verifiee.' }, { status: 409 })
        const password = await bcrypt.hash(input.password, 12)
        const customer = await prisma.customer.create({ data: { fullName: input.fullName, phone: input.phone, email: input.email || null, password } })
        await prisma.coupon.create({ data: { code: `BIENVENUE-${randomBytes(8).toString('hex').toUpperCase()}`, discount: 10, type: 'FIXED_AMOUNT', isActive: true } }).catch(() => null)
        const token = jwt.sign({ id: customer.id, role: 'CUSTOMER', ver: mobilePasswordVersion(password) }, secret, {
            algorithm: 'HS256', issuer: 'riwaya', audience: 'mobile-customer', expiresIn: '30d',
        })
        return NextResponse.json({ token, customer: { id: customer.id, email: customer.email, fullName: customer.fullName, phone: customer.phone } }, { status: 201, headers: { 'Cache-Control': 'no-store' } })
    } catch { return NextResponse.json({ error: 'Inscription indisponible' }, { status: 503 }) }
}
