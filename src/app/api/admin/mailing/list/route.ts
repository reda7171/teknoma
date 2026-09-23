import { NextResponse } from 'next/server'
import { getAdminRole } from '@/lib/actions/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
    try {
        const role = await getAdminRole()
        
        if (!role || (role !== 'ADMIN' && role !== 'MANAGER')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

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
