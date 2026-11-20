'use server'

import { prisma } from '@/lib/prisma'
import { cookies, headers } from 'next/headers'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import crypto from 'crypto'
import { JWT_SECRET } from '@/lib/jwt-secret'
import { rateLimit, getIpIdentifier } from '@/lib/rate-limit'
import { OAuth2Client } from 'google-auth-library'
import { getCached } from '@/lib/cache'
import { addGmailReaderToGoogleReviews } from '@/lib/actions/site-settings'

const RegisterSchema = z.object({
    fullName: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
    email: z.string().email('Email invalide'),
    phone: z.string().min(8, 'Le numéro de téléphone doit contenir au moins 8 chiffres'),
    password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
    city: z.string().min(2, 'La ville est requise'),
})

const LoginSchema = z.object({
    email: z.string().email('Email invalide'),
    password: z.string().min(1, 'Le mot de passe est requis'),
})

export type AuthResult =
    | { success: true; redirect: string }
    | { success: false; error: string }

/**
 * Inscription nouveau membre
 */
export async function register(formData: FormData): Promise<AuthResult> {
    const ip = await getIpIdentifier()
    const limiter = await rateLimit(`community_register_${ip}`, { limit: 3, windowMs: 60 * 60 * 1000 }) // 3 inscriptions par heure par IP

    if (!limiter.success) {
        return { success: false, error: 'Trop de tentatives d\'inscription. Veuillez réessayer plus tard.' }
    }

    const rawData = {
        fullName: formData.get('fullName'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        password: formData.get('password'),
        city: formData.get('city'),
    }

    try {
        const data = RegisterSchema.parse(rawData)

        // Vérifier si email existe déjà
        const existingUser = await prisma.user.findUnique({
            where: { email: data.email }
        })

        if (existingUser) {
            return { success: false, error: 'Cet email est déjà utilisé' }
        }

        // Hasher le mot de passe
        const hashedPassword = await bcrypt.hash(data.password, 10)

        // Créer l'utilisateur
        const user = await prisma.user.create({
            data: {
                fullName: data.fullName,
                email: data.email,
                phone: data.phone,
                password: hashedPassword,
                city: data.city,
                role: 'USER' as any, // Cast car enum généré peut-être pas à jour dans l'IDE
                credits: 10, // Cadeau de bienvenue (-10 Dhs dans le wallet)
            }
        })

        // Créer un bon de réduction et une notification de bienvenue
        try {
            const couponCode = `BIENVENUE-${Math.random().toString(36).substring(2,6).toUpperCase()}${user.id.substring(0,4).toUpperCase()}`
            await prisma.coupon.create({
                data: {
                    code: couponCode,
                    discount: 10,
                    type: 'FIXED_AMOUNT',
                    isActive: true,
                }
            })

            await prisma.notification.create({
                data: {
                    userId: user.id,
                    title: '🎁 Cadeau de bienvenue !',
                    message: `Bienvenue sur Tekno Store ! Vous avez reçu 10 Dhs dans votre wallet et un bon de réduction supplémentaire de 10 Dhs avec le code : ${couponCode}`,
                    type: 'SYSTEM' as any,
                }
            })
        } catch (err) {
            console.error('Failed to create welcome gift', err)
        }

        // Notification Telegram
        try {
            const { sendUserRegistrationNotification } = await import('@/lib/telegram')
            await sendUserRegistrationNotification({
                fullName: user.fullName || '',
                email: user.email,
                phone: user.phone || '',
                city: user.city || '',
                role: 'LECTEUR'
            })
        } catch (e) {
            console.error('Telegram notification error:', e)
        }

        // Enregistrer l'historique de connexion
        try {
            const headersList = await headers()
            const userAgent = headersList.get('user-agent')
            await prisma.loginHistory.create({
                data: {
                    userId: user.id,
                    ip: ip,
                    userAgent: userAgent
                }
            })
        } catch (e) {
            console.error('Error recording login history:', e)
        }

        // Auto-login
        if (user.email && (user.email.toLowerCase().endsWith('@gmail.com') || user.email.toLowerCase().endsWith('@googlemail.com'))) {
            addGmailReaderToGoogleReviews(user.email).catch(console.error)
        }
        await createSession(user.id)

        return { success: true, redirect: '/community?registered=true' }

    } catch (error) {
        if (error instanceof z.ZodError) {
            return { success: false, error: error.issues[0].message }
        }
        return { success: false, error: 'Une erreur est survenue lors de l\'inscription' }
    }
}

/**
 * Connexion membre
 */
export async function login(formData: FormData): Promise<AuthResult> {
    const ip = await getIpIdentifier()
    const limiter = await rateLimit(`community_login_${ip}`, { limit: 10, windowMs: 15 * 60 * 1000 }) // 10 essais par 15 min

    if (!limiter.success) {
        return { success: false, error: 'Trop de tentatives de connexion. Veuillez réessayer dans 15 minutes.' }
    }

    const rawData = {
        email: formData.get('email'),
        password: formData.get('password'),
    }

    try {
        const data = LoginSchema.parse(rawData)

        const user = await prisma.user.findUnique({
            where: { email: data.email }
        })

        if (!user) {
            return { success: false, error: 'Email ou mot de passe incorrect' }
        }

        const isValid = await bcrypt.compare(data.password, user.password)

        if (!isValid) {
            return { success: false, error: 'Email ou mot de passe incorrect' }
        }

        // Enregistrer l'historique de connexion
        try {
            const headersList = await headers()
            const userAgent = headersList.get('user-agent')
            await prisma.loginHistory.create({
                data: {
                    userId: user.id,
                    ip: ip,
                    userAgent: userAgent
                }
            })
        } catch (e) {
            console.error('Error recording login history:', e)
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

        return { success: true, redirect: '/community' }

    } catch (error) {
        return { success: false, error: 'Erreur de connexion' }
    }
}

/**
 * Déconnexion
 */
export async function logout() {
    const cookieStore = await cookies()
    cookieStore.delete('community-token')
}

/**
 * Connexion ou Inscription via OAuth (Google / Facebook)
 */
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
            return { success: true, redirect: '/community?registered=true' }
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

        return { success: true, redirect: '/community' }

    } catch (error) {
        console.error('OAuth Login Error:', error)
        return { success: false, error: 'Une erreur est survenue lors de l\'authentification' }
    }
}

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

/**
 * Connexion Google One Tap
 */
export async function googleOneTapLogin(credential: string): Promise<AuthResult> {
    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        })
        const payload = ticket.getPayload()
        if (!payload || !payload.email) {
            return { success: false, error: 'Token Google invalide' }
        }

        return await oauthLoginOrRegister({
            email: payload.email,
            fullName: payload.name || payload.email.split('@')[0],
            provider: 'google'
        })
    } catch (error) {
        console.error('Google One Tap Error:', error)
        return { success: false, error: 'Une erreur est survenue avec Google One Tap' }
    }
}

/**
 * Session Management (Basic)
 */
async function createSession(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { locale: true }
    })

    const timestamp = Date.now().toString()
    const payload = `${userId}:${timestamp}`
    const secret = JWT_SECRET

    let signature = ''
    if (typeof crypto !== 'undefined' && crypto.createHmac) {
        signature = crypto.createHmac('sha256', secret).update(payload).digest('hex')
    }

    const token = Buffer.from(`${payload}:${signature}`).toString('base64')

    const cookieStore = await cookies()
    cookieStore.set('community-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Forcer à false pour permettre la connexion via IP/HTTP sur VPS
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 jours
        path: '/',
    })

    if (user?.locale) {
        cookieStore.set('NEXT_LOCALE', user.locale, { path: '/', secure: process.env.NODE_ENV === 'production' })
    }
}

export async function getCommunityUser() {
    const cookieStore = await cookies()
    const token = cookieStore.get('community-token')

    if (!token) return null

    try {
        // Decode token format: userId:timestamp:signature
        const decoded = Buffer.from(token.value, 'base64').toString('utf-8')
        const [userId, timestamp, signature] = decoded.split(':')

        if (!userId || !timestamp || !signature) return null

        // Vérification signature
        const payload = `${userId}:${timestamp}`
        const secret = JWT_SECRET
        if (typeof crypto !== 'undefined' && crypto.createHmac) {
            const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex')
            const expectedBuffer = Buffer.from(expectedSignature)
            const suppliedBuffer = Buffer.from(signature)
            if (expectedBuffer.length !== suppliedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, suppliedBuffer)) return null
        }

        const tokenTime = Number(timestamp)
        const tokenAge = Date.now() - tokenTime
        const thirtyDays = 30 * 24 * 60 * 60 * 1000
        if (!Number.isFinite(tokenTime) || tokenAge < 0 || tokenAge > thirtyDays) return null

        const user = await prisma.user.findUnique({
            where: { id: userId }
        })

        return user
    } catch {
        return null
    }
}


export async function getUserOrderCount(user: any): Promise<number> {
    if (!user) return 0
    if (user.role === 'ADMIN') return 999

    const conditions: any[] = []
    if (user.email) conditions.push({ email: user.email })
    if (user.phone) conditions.push({ phone: user.phone })

    if (conditions.length === 0) return 0

    const orderCount = await prisma.order.count({
        where: {
            OR: conditions
        }
    })

    return orderCount
}

/**
 * Vérifie si un utilisateur community est éligible au système d'échange
 * Règle: Avoir passé au moins une commande (basé sur l'email ou le téléphone)
 * ET n'avoir jamais fait d'échange (1 seule fois)
 */
export async function checkExchangeEligibility(user: any): Promise<boolean> {
    if (!user) return false
    if (user.role === 'ADMIN') return true

    const orderCount = await getUserOrderCount(user)
    if (orderCount === 0) return false

    const exchangeCount = await prisma.exchange.count({
        where: {
            OR: [
                { requesterId: user.id },
                { responderId: user.id }
            ]
        }
    })

    return exchangeCount < 1
}

export async function getTopReaders(limit: number = 10) {
    return getCached(`community:top-readers:${limit}`, async () => {
        try {
            // Find users with their completed books count
            const users = await prisma.user.findMany({
                where: {
                    role: 'USER',
                },
                select: {
                    id: true,
                    fullName: true,
                    city: true,
                    image: true,
                    _count: {
                        select: {
                            readingList: {
                                where: {
                                    status: 'COMPLETED'
                                }
                            }
                        }
                    }
                }
            })

            // Sort in memory by the conditional count and take the top N
            return users
                .filter(u => u._count.readingList > 0)
                .sort((a, b) => b._count.readingList - a._count.readingList)
                .slice(0, limit)
                .map((reader, index) => ({
                    id: reader.id,
                    name: reader.fullName,
                    city: reader.city,
                    image: reader.image,
                    booksRead: reader._count.readingList,
                    rank: index + 1
                }))
        } catch (error) {
            console.error('Erreur getTopReaders:', error)
            return []
        }
    }, 600) // 10 minutes cache
}
