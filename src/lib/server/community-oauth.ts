import 'server-only'
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import { rateLimit, getIpIdentifier } from '@/lib/rate-limit'
import { addGmailReaderToGoogleReviews } from '@/lib/server/site-settings'
import { createSession } from './community-session'
import type { AuthResult } from '@/lib/actions/community-auth'

export async function oauthLoginOrRegister({ email, fullName, provider }: { email: string, fullName: string, provider: 'google' | 'facebook' }): Promise<AuthResult> {
    const ip = await getIpIdentifier()
    const limiter = await rateLimit(`community_oauth_${ip}`, { limit: 10, windowMs: 15 * 60 * 1000 })

    if (!limiter.success) {
        return { success: false, error: 'Trop de tentatives. Veuillez réessayer plus tard.' }
    }

    try {
        let user = await prisma.user.findUnique({
            where: { email }
        })

        if (!user) {
            // Générer un mot de passe aléatoire très complexe (64 chars) pour sécuriser le compte
            const randomPassword = crypto.randomBytes(32).toString('hex')
            const hashedPassword = await bcrypt.hash(randomPassword, 10)

            user = await prisma.user.create({
                data: {
                    fullName,
                    email,
                    password: hashedPassword,
                    role: 'USER' as any,
                    credits: 10,
                }
            })

            // Notification Telegram Optionnelle
            try {
                const { sendUserRegistrationNotification } = await import('@/lib/telegram')
                await sendUserRegistrationNotification({
                    fullName: user.fullName || '',
                    email: user.email,
                    phone: `OAuth (${provider})`,
                    city: 'Inconnue',
                    role: `LECTEUR (${provider})`
                })
            } catch (e) {
                console.error('Telegram notification error:', e)
            }

            // Inscription automatique à la newsletter pour les nouveaux inscrits OAuth
            try {
                await prisma.newsletterSubscriber.create({
                    data: { email: user.email }
                })
            } catch (e) {
                console.error('Error adding new OAuth user to newsletter:', e)
            }

            if (provider === 'google' || (user.email && (user.email.toLowerCase().endsWith('@gmail.com') || user.email.toLowerCase().endsWith('@googlemail.com')))) {
                addGmailReaderToGoogleReviews(user.email).catch(console.error)
            }
            await createSession(user.id)
            return { success: true, redirect: '/community?registered=true&gmail_reward=true' }
        }

        // Historique
        try {
            const headersList = await headers()
            const userAgent = headersList.get('user-agent')
            await prisma.loginHistory.create({
                data: {
                    userId: user.id,
                    ip: ip,
                    userAgent: `${userAgent} (${provider} OAuth)`
                }
            })
        } catch (e) {
            console.error('Error recording login history:', e)
        }

        // Inscription à la newsletter (Automatique pour Google/OAuth)
        try {
            const existingSub = await prisma.newsletterSubscriber.findUnique({
                where: { email: user.email }
            })
            if (!existingSub) {
                await prisma.newsletterSubscriber.create({
                    data: { email: user.email }
                })
            }
        } catch (e) {
            console.error('Error adding OAuth user to newsletter:', e)
        }

        if (provider === 'google' || (user.email && (user.email.toLowerCase().endsWith('@gmail.com') || user.email.toLowerCase().endsWith('@googlemail.com')))) {
            addGmailReaderToGoogleReviews(user.email).catch(console.error)
        }
        await createSession(user.id)

        if (user.role === 'SELLER') {
            try {
                const { notifyAdminOnSellerLogin } = await import('@/lib/whatsapp')
                notifyAdminOnSellerLogin(user, ip).catch(console.error)
            } catch (notifyErr) {
                console.error('Error triggering seller login notification:', notifyErr)
            }
            return { success: true, redirect: '/seller' }
        }
        if (user.role === 'INFLUENCER' || user.role === 'influencer' as any) {
            return { success: true, redirect: '/influencer' }
        }

        const isGmail = provider === 'google' || (user.email && (user.email.toLowerCase().endsWith('@gmail.com') || user.email.toLowerCase().endsWith('@googlemail.com')))
        return { success: true, redirect: isGmail ? '/community?gmail_reward=true' : '/community' }

    } catch (error) {
        console.error('OAuth Login Error:', error)
        return { success: false, error: 'Une erreur est survenue lors de l\'authentification' }
    }
}
