import { authorizeAdminApi } from '@/lib/api-authorization'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedAdmin, hasAdminRole, ORDER_OPERATION_ROLES } from '@/lib/admin-auth'

export async function GET(request: Request) {
    const accessDenied = await authorizeAdminApi(["ADMIN","MANAGER","CONFIRMATOR"])
    if (accessDenied) return accessDenied

    try {
        const admin = await getAuthenticatedAdmin()
        if (!admin) return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
        if (!hasAdminRole(admin, ORDER_OPERATION_ROLES)) return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })

        const { searchParams } = new URL(request.url)
        const trackingID = searchParams.get('trackingID')

        if (!trackingID) {
            return NextResponse.json({ error: "trackingID manquant" }, { status: 400 })
        }

        // Clean trackingID in case of whitespaces
        let cleanTrackingID = trackingID.trim()

        // If it's a URL, extract the last part (the ID)
        if (cleanTrackingID.includes('/')) {
            const parts = cleanTrackingID.split('/').filter(Boolean);
            cleanTrackingID = parts[parts.length - 1];
        }

        const order = await prisma.order.findFirst({
            where: {
                trackingID: cleanTrackingID
            },
            include: {
                items: {
                    include: {
                        book: { select: { title: true, image: true, id: true } },
                        pack: { select: { name: true, image: true, id: true, books: { include: { book: { select: { id: true, title: true } } } } } }
                    }
                },
                customer: { select: { fullName: true, phone: true } }
            }
        })

        if (!order) {
            return NextResponse.json({ error: "Aucune commande trouvée pour ce numéro de suivi" }, { status: 404 })
        }

        if (order.status === 'RETURNED') {
            return NextResponse.json({ error: "Cette commande est déjà marquée comme retournée." }, { status: 400 })
        }

        return NextResponse.json({ order })

    } catch (error) {
        console.error("Erreur scan-return find:", error)
        return NextResponse.json({ error: "Erreur serveur interne" }, { status: 500 })
    }
}
