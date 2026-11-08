import { authorizeAdminApi } from '@/lib/api-authorization'
import { NextResponse } from 'next/server'
import { getAuthenticatedAdmin, hasAdminRole } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
    const accessDenied = await authorizeAdminApi(["ADMIN","MANAGER"])
    if (accessDenied) return accessDenied

    try {
        const admin = await getAuthenticatedAdmin()
        if (!admin) return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
        if (!hasAdminRole(admin, ['ADMIN', 'MANAGER'])) return NextResponse.json({ error: 'Acc\u00e8s interdit' }, { status: 403 })

        // Fetch customers with emails
        const customers = await prisma.customer.findMany({
            where: { email: { not: null, notIn: [''] } },
            select: { id: true, email: true, fullName: true, phone: true },
            orderBy: { createdAt: 'desc' }
        })

        // Fetch newsletter subscribers
        const subscribers = await prisma.newsletterSubscriber.findMany({
            select: { id: true, email: true, createdAt: true },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({
            customers,
            subscribers
        })

    } catch (error: any) {
        console.error('Mailing List Error:', error)
        return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
    }
}
