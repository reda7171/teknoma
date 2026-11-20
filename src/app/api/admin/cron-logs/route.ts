import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedAdmin, hasAdminRole } from '@/lib/admin-auth'

export async function GET() {
    try {
        const admin = await getAuthenticatedAdmin()
        if (!admin) return new NextResponse('Authentication required', { status: 401 })
        if (!hasAdminRole(admin, ['ADMIN'])) return new NextResponse('Forbidden', { status: 403 })

        const logs = await prisma.cronLog.findMany({
            where: { isRead: false },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json(logs)
    } catch (error) {
        console.error('Erreur récupération cron logs:', error)
        return new NextResponse('Erreur serveur', { status: 500 })
    }
}

export async function PATCH(req: Request) {
    try {
        const admin = await getAuthenticatedAdmin()
        if (!admin) return new NextResponse('Authentication required', { status: 401 })
        if (!hasAdminRole(admin, ['ADMIN'])) return new NextResponse('Forbidden', { status: 403 })

        const body = await req.json()
        const { logIds } = body

        if (!Array.isArray(logIds) || logIds.length === 0) {
            return new NextResponse('Invalid request', { status: 400 })
        }

        await prisma.cronLog.updateMany({
            where: { id: { in: logIds } },
            data: { isRead: true }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Erreur mise à jour cron logs:', error)
        return new NextResponse('Erreur serveur', { status: 500 })
    }
}
