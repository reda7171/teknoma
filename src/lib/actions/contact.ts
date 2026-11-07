'use server'

import { z } from 'zod'
import { rateLimit, getIpIdentifier } from '@/lib/rate-limit'
import { sanitizeInput } from '@/lib/security'
import { transporter } from '@/lib/email'
import { sendTelegramMessage } from '@/lib/telegram'
import { getAllSettings } from '@/lib/actions/site-settings'

const ContactSchema = z.object({
    fullName: z.string().min(2, 'Le nom doit comporter au moins 2 caractères').max(100),
    email: z.string().email('Adresse email invalide').max(150),
    subject: z.string().min(2, 'L\'objet doit comporter au moins 2 caractères').max(200),
    message: z.string().min(10, 'Le message doit comporter au moins 10 caractères').max(2000),
    honeypot: z.string().optional(),
})

export type ContactInput = z.infer<typeof ContactSchema>

export async function sendContactMessage(input: ContactInput) {
    try {
        const ip = await getIpIdentifier()
        const limiter = await rateLimit(`contact_${ip}`, { limit: 5, windowMs: 60000 * 15 }) // 5 messages par 15 min max
        if (!limiter.success) {
            return { success: false, error: 'Trop de messages envoyés. Veuillez patienter un instant.' }
        }

        const parsed = ContactSchema.safeParse(input)
        if (!parsed.success) {
            return { success: false, error: parsed.error.issues[0]?.message || 'Données invalides' }
        }

        // Piège à robots anti-spam sans friction utilisateur
        if (parsed.data.honeypot) {
            return { success: true }
        }

        const data = {
            fullName: sanitizeInput(parsed.data.fullName),
            email: sanitizeInput(parsed.data.email),
            subject: sanitizeInput(parsed.data.subject),
            message: sanitizeInput(parsed.data.message),
        }

        const settings = await getAllSettings()
        const recipientEmail = settings.contact_email || process.env.SMTP_USER || 'contact@riwaya.store'

        // 1. Envoi par email via SMTP Nodemailer
        try {
            await transporter.sendMail({
                from: `"Riwaya Contact" <${process.env.SMTP_USER || 'contact@riwaya.store'}>`,
                to: recipientEmail,
                replyTo: data.email,
                subject: `[Contact Riwaya] ${data.subject}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 12px;">
                        <h2 style="color: #000; margin-bottom: 16px;">Nouveau message de contact</h2>
                        <p><strong>Nom complet :</strong> ${data.fullName}</p>
                        <p><strong>Email :</strong> <a href="mailto:${data.email}">${data.email}</a></p>
                        <p><strong>Objet :</strong> ${data.subject}</p>
                        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 15px;">
                            <p style="white-space: pre-wrap; margin: 0;">${data.message}</p>
                        </div>
                    </div>
                `,
            })
        } catch (emailErr) {
            console.error('[Contact] Erreur envoi SMTP:', emailErr)
        }

        // 2. Notification Telegram pour l'équipe
        try {
            const telegramText = `📩 <b>Nouveau Message de Contact</b>\n\n` +
                `👤 <b>Nom :</b> ${data.fullName}\n` +
                `📧 <b>Email :</b> ${data.email}\n` +
                `📌 <b>Objet :</b> ${data.subject}\n\n` +
                `💬 <b>Message :</b>\n${data.message}`
            await sendTelegramMessage(telegramText).catch(console.error)
        } catch (tgErr) {
            console.error('[Contact] Erreur notification Telegram:', tgErr)
        }

        return { success: true }
    } catch (err: any) {
        console.error('[Contact] Erreur globale:', err)
        return { success: false, error: 'Une erreur est survenue lors de l\'envoi du message.' }
    }
}

