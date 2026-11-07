'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { rateLimit, getIpIdentifier } from '@/lib/rate-limit'
import { sanitizeInput } from '@/lib/security'
import { transporter } from '@/lib/email'
import { sendTelegramMessage } from '@/lib/telegram'
import { getAllSettings } from '@/lib/actions/site-settings'

const SellerRequestSchema = z.object({
    storeName: z.string().min(2, 'Le nom de la boutique est requis').max(150),
    managerName: z.string().min(2, 'Le nom du responsable est requis').max(100),
    email: z.string().email('Adresse email invalide').max(150),
    phone: z.string().min(8, 'Numéro de téléphone invalide').max(30),
    city: z.string().min(2, 'La ville est requise').max(100),
    stockSize: z.string().min(1, 'La taille du stock est requise').max(50),
    honeypot: z.string().optional(),
})

export type SellerRequestInput = z.infer<typeof SellerRequestSchema>

export async function createSellerRequest(input: SellerRequestInput) {
    try {
        const ip = await getIpIdentifier()
        const limiter = await rateLimit(`seller_req_${ip}`, { limit: 5, windowMs: 60000 * 15 })
        if (!limiter.success) {
            return { success: false, error: 'Trop de demandes envoyées. Veuillez patienter un instant.' }
        }

        const parsed = SellerRequestSchema.safeParse(input)
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message || 'Données invalides' }
        }

        // Piège à robots anti-spam sans friction utilisateur
        if (parsed.data.honeypot) {
            return { success: true }
        }

        const sanitizedData = {
            storeName: sanitizeInput(parsed.data.storeName),
            managerName: sanitizeInput(parsed.data.managerName),
            email: sanitizeInput(parsed.data.email),
            phone: sanitizeInput(parsed.data.phone),
            city: sanitizeInput(parsed.data.city),
            stockSize: sanitizeInput(parsed.data.stockSize),
        }

        const request = await prisma.sellerRequest.create({
            data: {
                ...sanitizedData,
                status: 'PENDING'
            }
        })

        const trackingCode = 'RW-VEN-' + request.id.slice(0, 8).toUpperCase()
        const settings = await getAllSettings()
        const adminEmail = settings.contact_email || process.env.SMTP_USER || 'contact@riwaya.store'

        // 1. Envoi d'email SMTP via Nodemailer
        try {
            await transporter.sendMail({
                from: `"Riwaya Marketplace" <${process.env.SMTP_USER || 'contact@riwaya.store'}>`,
                to: adminEmail,
                replyTo: sanitizedData.email,
                subject: `[Nouvelle Demande Vendeur] ${sanitizedData.storeName} (${sanitizedData.city}) - ${trackingCode}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
                        <h2 style="color: #000; margin-bottom: 16px;">Nouvelle candidature de vendeur</h2>
                        <p><strong>Dossier N° :</strong> <code style="font-weight: bold; background: #f0f0f0; padding: 2px 6px; border-radius: 4px;">${trackingCode}</code></p>
                        <p><strong>Boutique :</strong> ${sanitizedData.storeName}</p>
                        <p><strong>Responsable :</strong> ${sanitizedData.managerName}</p>
                        <p><strong>Email :</strong> <a href="mailto:${sanitizedData.email}">${sanitizedData.email}</a></p>
                        <p><strong>Téléphone :</strong> ${sanitizedData.phone}</p>
                        <p><strong>Ville :</strong> ${sanitizedData.city}</p>
                        <p><strong>Taille du stock :</strong> ${sanitizedData.stockSize} livres</p>
                    </div>
                `,
            })

            await transporter.sendMail({
                from: `"Riwaya Marketplace" <${process.env.SMTP_USER || 'contact@riwaya.store'}>`,
                to: sanitizedData.email,
                subject: `Votre candidature vendeur sur Riwaya (${trackingCode})`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
                        <h2 style="color: #000;">Bonjour ${sanitizedData.managerName},</h2>
                        <p>Nous avons bien reçu votre demande pour rejoindre la communauté des libraires partenaires Riwaya avec <strong>${sanitizedData.storeName}</strong>.</p>
                        <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
                            <p style="margin: 0 0 6px 0; font-size: 12px; color: #6c757d; text-transform: uppercase; font-weight: bold;">Identifiant de suivi de dossier</p>
                            <p style="margin: 0; font-size: 20px; font-weight: bold; font-family: monospace; color: #000;">${trackingCode}</p>
                        </div>
                        <p>Notre équipe examine vos informations et vous recontactera sous 24h à 48h au <strong>${sanitizedData.phone}</strong>.</p>
                        <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
                        <p style="color: #666; font-size: 12px;">L'équipe Riwaya · La première librairie collaborative au Maroc</p>
                    </div>
                `,
            }).catch(console.error)
        } catch (emailErr) {
            console.error('[SellerRequest] Erreur envoi SMTP:', emailErr)
        }

        // 2. Notification Telegram en temps réel pour l'équipe
        try {
            const telegramText = `🏪 <b>Nouvelle Demande Vendeur</b>\n\n` +
                `🆔 <b>Dossier :</b> <code>${trackingCode}</code>\n` +
                `🏢 <b>Boutique :</b> ${sanitizedData.storeName}\n` +
                `👤 <b>Responsable :</b> ${sanitizedData.managerName}\n` +
                `📧 <b>Email :</b> ${sanitizedData.email}\n` +
                `📞 <b>Tél :</b> ${sanitizedData.phone}\n` +
                `📍 <b>Ville :</b> ${sanitizedData.city}\n` +
                `📦 <b>Stock estimé :</b> ${sanitizedData.stockSize} livres`
            await sendTelegramMessage(telegramText).catch(console.error)
        } catch (tgErr) {
            console.error('[SellerRequest] Erreur notification Telegram:', tgErr)
        }
        
        revalidatePath('/admin/vendeurs')

        // Notification instantanée IndexNow (Bing, Yandex, Seznam, Naver)
        import('@/lib/indexnow')
            .then(m => m.submitSellerProgramToIndexNow('Nouvelle candidature vendeur soumise'))
            .catch(err => console.error('[IndexNow] Erreur notification candidature vendeur:', err))

        return { success: true, request, trackingCode }
    } catch (error) {
        console.error('Erreur createSellerRequest:', error)
        return { success: false, error: 'Une erreur est survenue lors de l\'envoi de la demande.' }
    }
}

export async function getSellerRequestStatus(query: string) {
    try {
        const trimmed = (query || '').trim()
        if (!trimmed || trimmed.length < 3) {
            return { success: false, error: 'Identifiant trop court' }
        }

        const cleanId = trimmed.toUpperCase().replace(/^RW-VEN-/, '').toLowerCase()

        const request = await prisma.sellerRequest.findFirst({
            where: {
                OR: [
                    { id: { startsWith: cleanId } },
                    { phone: { contains: trimmed } },
                    { email: { equals: trimmed } },
                ]
            },
            select: {
                id: true,
                storeName: true,
                managerName: true,
                city: true,
                status: true,
                createdAt: true,
                updatedAt: true,
            }
        })

        if (!request) {
            return { success: false, error: 'Aucun dossier correspondant trouvé' }
        }

        const trackingCode = 'RW-VEN-' + request.id.slice(0, 8).toUpperCase()
        return {
            success: true,
            data: {
                trackingCode,
                storeName: request.storeName,
                managerName: request.managerName,
                city: request.city,
                status: request.status,
                createdAt: request.createdAt,
                updatedAt: request.updatedAt,
            }
        }
    } catch (err) {
        console.error('Erreur getSellerRequestStatus:', err)
        return { success: false, error: 'Erreur lors de la consultation du dossier' }
    }
}

export async function getSellerRequests() {
    try {
        const requests = await prisma.sellerRequest.findMany({
            orderBy: { createdAt: 'desc' }
        })
        return { success: true, requests }
    } catch (error) {
        console.error('Erreur getSellerRequests:', error)
        return { success: false, error: 'Impossible de récupérer les demandes.' }
    }
}

export async function updateSellerRequestStatus(id: string, status: string) {
    try {
        const updated = await prisma.sellerRequest.update({
            where: { id },
            data: { status }
        })

        // Si la demande est approuvée, on crée un compte SELLER
        if (status === 'APPROVED') {
            const bcrypt = require('bcryptjs')
            // Mot de passe par défaut : seller + 4 derniers caractères de l'ID ou phone
            const defaultPassword = 'Seller' + updated.phone.slice(-4)
            const hashedPassword = await bcrypt.hash(defaultPassword, 10)

            await prisma.user.upsert({
                where: { email: updated.email },
                update: {
                    role: 'SELLER',
                    fullName: updated.managerName,
                    phone: updated.phone,
                    city: updated.city
                },
                create: {
                    email: updated.email,
                    password: hashedPassword,
                    role: 'SELLER',
                    fullName: updated.managerName,
                    phone: updated.phone,
                    city: updated.city,
                    credits: 0 // Les vendeurs commencent avec 0 crédits d'échange
                }
            })
            
            // Note: En production, on enverrait un mail ici avec defaultPassword

        }

        revalidatePath('/admin/vendeurs')

        // Notification instantanée IndexNow lors d'un changement de statut vendeur
        import('@/lib/indexnow')
            .then(m => m.submitSellerProgramToIndexNow(`Mise à jour statut vendeur (${status})`))
            .catch(err => console.error('[IndexNow] Erreur notification statut vendeur:', err))

        return { success: true, request: updated }
    } catch (error) {
        console.error('Erreur updateSellerRequestStatus:', error)
        return { success: false, error: 'Impossible de mettre à jour le statut.' }
    }
}

export async function deleteSellerRequest(id: string) {
    try {
        await prisma.sellerRequest.delete({
            where: { id }
        })
        revalidatePath('/admin/vendeurs')

        // Notification instantanée IndexNow
        import('@/lib/indexnow')
            .then(m => m.submitSellerProgramToIndexNow('Suppression dossier vendeur'))
            .catch(err => console.error('[IndexNow] Erreur notification suppression vendeur:', err))

        return { success: true }
    } catch (error) {
        console.error('Erreur deleteSellerRequest:', error)
        return { success: false, error: 'Impossible de supprimer la demande.' }
    }
}

export async function updateSellerRequest(id: string, data: {
    storeName: string
    managerName: string
    email: string
    phone: string
    city: string
    stockSize: string
}) {
    try {
        const request = await prisma.sellerRequest.update({
            where: { id },
            data
        })
        revalidatePath('/admin/vendeurs')

        // Notification instantanée IndexNow
        import('@/lib/indexnow')
            .then(m => m.submitSellerProgramToIndexNow('Mise à jour informations vendeur'))
            .catch(err => console.error('[IndexNow] Erreur notification mise à jour vendeur:', err))

        return { success: true, request }
    } catch (error) {
        console.error('Erreur updateSellerRequest:', error)
        return { success: false, error: 'Impossible de mettre à jour la demande.' }
    }
}
