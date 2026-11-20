import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => null)
        if (!body) {
            return NextResponse.json({ success: false, error: 'Corps de requête vide' }, { status: 400 })
        }

        const { event, session, payload } = body

        // 1. Mise à jour de l'accusé de réception (Delivered / Read / Failed)
        if (event === 'message.ack' && payload) {
            const messageId = payload.id || payload.msgId
            const ack = payload.ack
            const ackName = payload.ackName

            let newStatus: string | null = null
            if (ack === 2 || ackName === 'DELIVERED' || ackName === 'RECEIVED') {
                newStatus = 'DELIVERED'
            } else if (ack === 3 || ackName === 'READ' || ackName === 'PLAYED') {
                newStatus = 'READ'
            } else if (ack === -1 || ackName === 'ERROR' || ackName === 'FAILED') {
                newStatus = 'FAILED'
            }

            if (messageId && newStatus) {
                await prisma.whatsAppMessageLog.updateMany({
                    where: { messageId },
                    data: { status: newStatus }
                }).catch(() => null)
            }
        }

        // 2. Traçage des réponses entrantes du client & Auto-Welcome
        if (event === 'message' && payload && !payload.fromMe) {
            const sourceId = String(payload.from || payload.author || '')
            const isChannelPost = sourceId.endsWith('@newsletter')
            const phone = sourceId.replace(/\D/g, '')
            const text = payload.body || ''

            if (phone && text) {
                await prisma.whatsAppMessageLog.create({
                    data: {
                        phone,
                        message: text,
                        status: 'RECEIVED',
                        messageId: payload.id || null,
                        type: isChannelPost ? 'CHANNEL_INCOMING' : 'INCOMING',
                        metadata: JSON.stringify({
                            session: session || 'default',
                            channelId: isChannelPost ? sourceId : null,
                            pushName: payload.pushName || null,
                            timestamp: payload.timestamp || Date.now()
                        })
                    }
                }).catch(() => null)

                // Une publication de chaîne est enregistrée, mais ne doit jamais déclencher l'auto-welcome.
                if (!isChannelPost) try {
                    const autoWelcomeSetting = await prisma.siteSettings.findUnique({
                        where: { key: 'whatsapp_auto_welcome' }
                    })

                    if (autoWelcomeSetting?.value !== 'false') {
                        // Throttling 24h pour ne pas spammer le même contact
                        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
                        const alreadyReplied = await prisma.whatsAppMessageLog.findFirst({
                            where: {
                                phone,
                                type: 'WELCOME_AUTO',
                                createdAt: { gte: oneDayAgo }
                            }
                        })

                        if (!alreadyReplied) {
                            const { DEFAULT_WHATSAPP_TEMPLATES } = await import('@/lib/constants/whatsapp-templates')
                            const templateSetting = await prisma.siteSettings.findUnique({
                                where: { key: 'whatsapp_template_welcome' }
                            })

                            const rawTemplate = templateSetting?.value || DEFAULT_WHATSAPP_TEMPLATES.whatsapp_template_welcome
                            const customerName = payload.pushName || 'Cher lecteur'
                            const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://petsunivers.ma'
                            const replyText = rawTemplate
                                .replace(/{customerName}/g, customerName)
                                .replace(/{siteUrl}/g, siteUrl)

                            const { sendWhatsAppMessageDirect } = await import('@/lib/actions/whatsapp-gateway')
                            await sendWhatsAppMessageDirect(phone, replyText, {
                                type: 'WELCOME_AUTO',
                                session: session || 'default',
                                metadata: { trigger: 'incoming_webhook_message', customerName }
                            })
                        }
                    }
                } catch (autoErr) {
                    console.error('[WhatsApp Auto-Welcome Error]', autoErr)
                }
            }
        }

        // 3. Alerte Telegram immédiate en cas d'arrêt ou d'échec d'une session
        if (event === 'session.status' && payload) {
            const sessionStatus = payload.status
            if (sessionStatus === 'STOPPED' || sessionStatus === 'FAILED') {
                const { sendTelegramAlert } = await import('@/lib/telegram')
                await sendTelegramAlert(
                    `⚠️ <b>Alerte Passerelle WhatsApp WAHA</b>\n\nSession : <code>${session || 'default'}</code>\nNouveau Statut : <b>${sessionStatus}</b>\n\nLes envois automatiques peuvent être impactés. Rendez-vous sur votre panneau d'administration pour relancer ou reconnecter la session.`
                ).catch(() => null)
            }
        }

        return NextResponse.json({ success: true, processed: event || 'unknown' })
    } catch (err: unknown) {
        console.error('[WhatsApp Webhook Error]', err)
        return NextResponse.json({
            success: false,
            error: err instanceof Error ? err.message : 'Erreur webhook WhatsApp'
        }, { status: 500 })
    }
}

export async function GET() {
    return NextResponse.json({
        status: 'online',
        service: 'PetsUnivers WAHA Webhook Listener',
        supportedEvents: ['message.ack', 'message', 'session.status']
    })
}
