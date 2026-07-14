import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAuthenticated } from '@/lib/actions/auth'

export async function GET(request: Request) {
    try {
        const isAuth = await isAuthenticated()
        if (!isAuth) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const trackingID = searchParams.get('trackingID')

        if (!trackingID) {
            return NextResponse.json({ error: "trackingID manquant" }, { status: 400 })
        }

        // Clean trackingID in case of whitespaces
        const cleanTrackingID = trackingID.trim()

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
