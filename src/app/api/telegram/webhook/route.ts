import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendTelegramMessage } from '@/lib/telegram'

export async function POST(req: Request) {
    try {
        const body = await req.json()

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
