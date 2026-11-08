import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { getJwtSecret } from '@/lib/jwt-secret'
import { mobilePasswordVersion } from '@/lib/mobile-auth'
import { rateLimit, getIpIdentifier } from '@/lib/rate-limit'
import { readJsonBody } from '@/lib/request-body'

const schema = z.object({ identifier: z.string().trim().min(1).max(255), password: z.string().min(1).max(72) })
export async function POST(request: Request) {
    const limited = await rateLimit(`mobile_login_${await getIpIdentifier()}`, { limit: 10, windowMs: 15 * 60 * 1000 })
    if (!limited.success) return NextResponse.json({ error: 'Veuillez reessayer plus tard' }, { status: 429 })
    let input: z.infer<typeof schema>
    try { input = schema.parse(await readJsonBody(request)) }
    catch { return NextResponse.json({ error: 'Donnees invalides' }, { status: 400 }) }
    const account = await rateLimit(`mobile_account_${input.identifier.toLowerCase()}`, { limit: 10, windowMs: 15 * 60 * 1000 })
    if (!account.success) return NextResponse.json({ error: 'Veuillez reessayer plus tard' }, { status: 429 })
    try {
        const secret = getJwtSecret()
        const customer = await prisma.customer.findFirst({ where: { OR: [{ email: input.identifier }, { phone: input.identifier }] } })
        if (!customer?.password || !(await bcrypt.compare(input.password, customer.password))) {
            return NextResponse.json({ error: 'Identifiants incorrects' }, { status: 401 })
        }
        const token = jwt.sign({ id: customer.id, role: 'CUSTOMER', ver: mobilePasswordVersion(customer.password) }, secret, {
            algorithm: 'HS256', issuer: 'riwaya', audience: 'mobile-customer', expiresIn: '30d',
        })
        return NextResponse.json({ token, customer: { id: customer.id, email: customer.email, fullName: customer.fullName, phone: customer.phone, image: customer.image, credits: customer.credits } }, { headers: { 'Cache-Control': 'no-store' } })
    } catch { return NextResponse.json({ error: 'Connexion indisponible' }, { status: 503 }) }
}
