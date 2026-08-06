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
        const conversationId = searchParams.get('conversationId')

        if (!conversationId) {
            return NextResponse.json({ error: "ID de conversation manquant" }, { status: 400 })
        }

        const messages = await prisma.socialMessage.findMany({
            where: { conversationId },
            orderBy: { createdAt: 'asc' }
        })

        // Reset unread count
        await prisma.socialConversation.update({
            where: { id: conversationId },
            data: { unreadCount: 0 }
        })

        return NextResponse.json({ messages })
    } catch (error) {
        console.error("Error fetching messages:", error)
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
    }
}
