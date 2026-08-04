import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendTelegramMessage, answerCallbackQuery, editTelegramMessage } from '@/lib/telegram'

export async function POST(req: Request) {
    try {
        const body = await req.json()

        // Handle button clicks (callback queries)
        if (body.callback_query) {
            const callbackQuery = body.callback_query
            const data = callbackQuery.data
            const message = callbackQuery.message
            const chatId = message?.chat?.id
            const messageId = message?.message_id

            // Handle offer buttons
            if (data && data.startsWith('offer_')) {
                // e.g. offer_10:session123
                const parts = data.split(':')
                const offerType = parts[0]
                const sessionId = parts[1]
                
                let discount = 0
                if (offerType === 'offer_10') discount = 10
                if (offerType === 'offer_20') discount = 20
                if (offerType === 'offer_30') discount = 30

                if (discount > 0 && sessionId) {
                    await prisma.instantOffer.create({
                        data: {
                            sessionId,
                            discount,
                            status: 'PENDING',
                            expiresAt: new Date(Date.now() + 15 * 60 * 1000) // Valable 15 minutes
                        }
                    })
                    
                    // Récupérer le token pour répondre
                    const setting = await prisma.siteSettings.findUnique({ where: { key: 'telegram_bot_token' } })
                    const token = setting?.value || process.env.TELEGRAM_BOT_TOKEN || ''

                    if (token) {
                        await answerCallbackQuery(callbackQuery.id, `Offre de ${discount} appliquée!`, token)
                        
                        if (chatId && messageId) {
                            // Mettre à jour le message pour retirer les boutons
                            const newText = (message.text || 'Nouveau Panier') + `\n\n✅ <b>Offre de ${discount} envoyée avec succès!</b>`
                            await editTelegramMessage(chatId, messageId, newText, token, { inline_keyboard: [] })
                        }
                    }
                    
                    return NextResponse.json({ success: true })
                }
            }
        }

        // Si le message est une réponse à un autre message
        if (body.message?.reply_to_message) {
            const originalText = body.message.reply_to_message.text || ''
            const replyText = body.message.text || ''

            // On vérifie si c'est un message de "Nouveau Panier"
            if (originalText.includes('Nouveau Panier')) {
                // On extrait la session ID du message original
                const sessionMatch = originalText.match(/Session:\s*([a-zA-Z0-9]+)/)
                if (sessionMatch && sessionMatch[1]) {
                    const sessionId = sessionMatch[1]
                    const discount = parseFloat(replyText.trim())

                    if (!isNaN(discount)) {
                        // Créer l'offre en base de données
                        await prisma.instantOffer.create({
                            data: {
                                sessionId,
                                discount,
                                status: 'PENDING',
                                expiresAt: new Date(Date.now() + 15 * 60 * 1000) // Valable 15 minutes
                            }
                        })
                        
                        await sendTelegramMessage(`✅ Offre de ${discount} MAD envoyée au client (Session: ${sessionId})`)
                        return NextResponse.json({ success: true })
                    } else {
                        await sendTelegramMessage(`⚠️ Erreur: "${replyText}" n'est pas un montant valide. Envoyez juste un nombre.`)
                    }
                }
            }
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Erreur Telegram Webhook:', error)
        return NextResponse.json({ success: false }, { status: 500 })
    }
}
