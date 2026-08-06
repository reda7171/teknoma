import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSetting } from '@/lib/actions/site-settings'

// Verification endpoint (Meta Challenge)
export async function GET(request: Request) {
    const VERIFY_TOKEN = await getSetting('meta_webhook_verify_token', 'riwaya_super_secret_token_123')
    
    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('hub.mode')
    const token = searchParams.get('hub.verify_token')
    const challenge = searchParams.get('hub.challenge')

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log('WEBHOOK_VERIFIED')
        return new NextResponse(challenge, { status: 200 })
    }
    return new NextResponse('Forbidden', { status: 403 })
}

// Receive Messages
export async function POST(request: Request) {
    try {
        const body = await request.json()

        if (body.object === 'instagram' || body.object === 'page') {
            for (const entry of body.entry) {
                const messaging = entry.messaging
                if (!messaging) continue

                for (const event of messaging) {
                    // Check if it's a message and not an echo from our own bot
                    if (event.message && !event.message.is_echo && event.message.text) {
                        const senderId = event.sender.id
                        const messageText = event.message.text
                        const messageId = event.message.mid
                        const platform = body.object === 'instagram' ? 'INSTAGRAM' : 'FACEBOOK'

                        // Upsert Conversation
                        const conversation = await prisma.socialConversation.upsert({
                            where: { platformId: senderId },
                            update: {
                                lastMessageAt: new Date(),
                                unreadCount: { increment: 1 }
                            },
                            create: {
                                platform: platform,
                                platformId: senderId,
                                lastMessageAt: new Date(),
                                unreadCount: 1
                            }
                        })

                        // Check if message already exists (Meta can retry webhooks)
                        const existingMessage = await prisma.socialMessage.findUnique({
                            where: { messageId: messageId }
                        })

                        if (!existingMessage) {
                            await prisma.socialMessage.create({
                                data: {
                                    conversationId: conversation.id,
                                    messageId: messageId,
                                    content: messageText,
                                    direction: 'INBOUND'
                                }
                            })
                        }
                    }
                }
            }
            return new NextResponse('EVENT_RECEIVED', { status: 200 })
        }
        
        return new NextResponse('Not Found', { status: 404 })
    } catch (error) {
        console.error('Meta Webhook Error:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}
