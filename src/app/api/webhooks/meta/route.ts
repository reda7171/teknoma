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
                // 1. Handle Messages (Instagram/Messenger)
                const messaging = entry.messaging
                if (messaging) {

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

                // 2. Handle Leadgen (Facebook Lead Ads)
                const changes = entry.changes
                if (changes) {
                    for (const change of changes) {
                        if (change.field === 'leadgen') {
                            const leadgenId = change.value.leadgen_id
                            const formId = change.value.form_id
                            
                            if (leadgenId) {
                                // Fetch lead data from Meta Graph API
                                const META_ACCESS_TOKEN = await getSetting('meta_inbox_access_token', '')
                                if (META_ACCESS_TOKEN) {
                                    try {
                                        const response = await fetch(`https://graph.facebook.com/v19.0/${leadgenId}?access_token=${META_ACCESS_TOKEN}`)
                                        const leadData = await response.json()
                                        
                                        if (leadData && leadData.field_data) {
                                            let fullName = 'Prospect Facebook'
                                            let phone = ''
                                            let email = ''
                                            let city = 'À confirmer'
                                            
                                            // Extract fields
                                            for (const field of leadData.field_data) {
                                                if (field.name === 'full_name' || field.name === 'first_name') {
                                                    fullName = field.values[0] || fullName
                                                }
                                                if (field.name === 'phone_number') {
                                                    phone = field.values[0] || ''
                                                }
                                                if (field.name === 'email') {
                                                    email = field.values[0] || ''
                                                }
                                                if (field.name === 'city') {
                                                    city = field.values[0] || city
                                                }
                                            }

                                            // Check if lead already exists to prevent duplicate webhooks
                                            const existingOrder = await prisma.order.findFirst({
                                                where: { comment: { contains: leadgenId } }
                                            })

                                            if (!existingOrder && phone) {
                                                await prisma.order.create({
                                                    data: {
                                                        fullName: fullName,
                                                        phone: phone,
                                                        email: email,
                                                        address: 'À confirmer (Facebook Lead)',
                                                        city: city,
                                                        total: 0,
                                                        shippingFees: 0,
                                                        comment: `Prospect issu du formulaire Facebook Lead Ads.\nForm ID: ${formId}\nLead ID: ${leadgenId}`,
                                                        paymentMethod: 'COD'
                                                    }
                                                })
                                                console.log(`Created Order for Lead ID: ${leadgenId}`)
                                            }
                                        }
                                    } catch (err) {
                                        console.error('Error fetching lead data:', err)
                                    }
                                }
                            }
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
