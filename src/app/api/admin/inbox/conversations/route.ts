import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAuthenticated } from '@/lib/actions/auth'

export async function GET() {
    try {
        const isAuth = await isAuthenticated()
        if (!isAuth) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
        }

        const conversations = await prisma.socialConversation.findMany({
            orderBy: { lastMessageAt: 'desc' },
            include: {
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            }
        })

        return NextResponse.json({ conversations })
    } catch (error) {
        console.error("Error fetching conversations:", error)
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
    }
}
