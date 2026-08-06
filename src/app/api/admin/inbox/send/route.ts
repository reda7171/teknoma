import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAuthenticated } from '@/lib/actions/auth'
import { getSetting } from '@/lib/actions/site-settings'

export async function POST(request: Request) {
    try {
        const isAuth = await isAuthenticated()
        if (!isAuth) {
            return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
        }

        const body = await request.json()
        const { conversationId, text } = body

        if (!conversationId || !text) {
            return NextResponse.json({ error: "Données manquantes" }, { status: 400 })
        }

        const conversation = await prisma.socialConversation.findUnique({
            where: { id: conversationId }
        })

        if (!conversation) {
            return NextResponse.json({ error: "Conversation introuvable" }, { status: 404 })
        }

        // Send to Meta API if token is configured
        // In a real implementation, you would need the Page ID and make a POST request to Graph API
        // Example: https://graph.facebook.com/v19.0/me/messages?access_token=...
        let metaMessageId = null;
        
        const META_ACCESS_TOKEN = await getSetting('meta_inbox_access_token', '')

        if (META_ACCESS_TOKEN) {
            try {
                const response = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${META_ACCESS_TOKEN}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        recipient: { id: conversation.platformId },
                        message: { text: text }
                    })
                })
                
                const data = await response.json()
                if (data.message_id) {
                    metaMessageId = data.message_id
                } else if (data.error) {
                    console.error("Meta API Error:", data.error)
                    // We don't throw to still save it in DB for testing, but in prod we might want to alert the user
                }
            } catch (err) {
                console.error("Failed to call Meta API:", err)
            }
        } else {
            console.warn("META_ACCESS_TOKEN is not defined. Message saved to DB but NOT sent to Instagram.")
        }

        // Save OUTBOUND message to DB
        const message = await prisma.socialMessage.create({
            data: {
                conversationId: conversation.id,
                content: text,
                direction: 'OUTBOUND',
                messageId: metaMessageId
            }
        })

        // Update conversation lastMessageAt
        await prisma.socialConversation.update({
            where: { id: conversation.id },
            data: { lastMessageAt: new Date() }
        })

        return NextResponse.json({ success: true, message })

    } catch (error) {
        console.error("Error sending message:", error)
        return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
    }
}
