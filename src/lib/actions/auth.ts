'use server'

import { prisma } from '@/lib/prisma'
import { cookies, headers } from 'next/headers'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { getJwtSecret } from '@/lib/jwt-secret'
import { z } from 'zod'
import crypto from 'crypto'
import { createAuditLog } from "@/lib/server/audit"
import { rateLimit, getIpIdentifier } from '@/lib/rate-limit'
import { sendTelegramMessage } from '@/lib/telegram'
import { createSessionToken, readSessionSubject, verifySessionToken } from '@/lib/session-token'

const LoginSchema = z.object({
    email: z.string().email('Email invalide'),
    password: z.string().min(1, 'Le mot de passe est requis'),
})

const ADMIN_LOGIN_ROLES = ['ADMIN', 'MANAGER', 'CONFIRMATOR', 'BLOG_MODERATOR']
const DIRECT_PORTAL_ROLES = ['SELLER', 'INFLUENCER']
const APPROVAL_TTL_MS = 10 * 60 * 1000

export type LoginResult =
    | { success: true; redirect: string }
    | { success: true; pendingApproval: true; requestId: string }
    | { success: false; error: string }

/**
 * Connexion admin
 */
export async function login(formData: FormData): Promise<LoginResult> {
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const ip = await getIpIdentifier()
    const limiter = await rateLimit(`login_${ip}`, { limit: 5, windowMs: 2 * 60 * 60 * 1000 }) // 5 essais par 2 heures

    if (!limiter.success) {
        sendTelegramMessage(`🚨 *Alerte Sécurité*\nTrop de tentatives de connexion bloquées (blocage 2h).\n🌐 IP: ${ip || 'Inconnue'}`).catch(console.error)
        return { success: false, error: "Trop de tentatives. Veuillez réessayer dans 2 heures." }
    }

    try {
        const validatedData = LoginSchema.parse({ email, password })

        // Rechercher l'utilisateur
        const user = await prisma.user.findUnique({
            where: { email: validatedData.email },
        })

        if (!user) {
            sendTelegramMessage(`⚠️ *Tentative de connexion échouée*\nEmail inconnu: ${validatedData.email}\n🌐 IP: ${ip || 'Inconnue'}`).catch(console.error)
            return {
                success: false,
                error: 'Email ou mot de passe incorrect',
            }
        }

        // Vérifier le mot de passe
        const isPasswordValid = await bcrypt.compare(validatedData.password, user.password)

        if (!isPasswordValid) {
            sendTelegramMessage(`⚠️ *Tentative de connexion échouée*\nMot de passe incorrect pour: ${validatedData.email}\n🌐 IP: ${ip || 'Inconnue'}`).catch(console.error)
            return {
                success: false,
                error: 'Email ou mot de passe incorrect',
            }
        }

        if (!ADMIN_LOGIN_ROLES.includes(user.role) && !DIRECT_PORTAL_ROLES.includes(user.role)) {
            return { success: false, error: 'Accès non autorisé pour ce compte' }
        }

        // Sécurisation OWASP: Token signé avec HMAC
        const token = createSessionToken(user.id, user.password, 'admin')

        const isProd = process.env.NODE_ENV === 'production'

        if (user.role !== 'INFLUENCER' && user.role !== 'SELLER') {
            // Créer une requête d'approbation
            const request = await prisma.adminAuthRequest.create({
                data: {
                    email: user.email,
                    ip: ip || 'Inconnue',
                    status: 'PENDING'
                }
            })

            const text = `🔐 <b>Demande d'accès Admin</b>\n\n` +
            `👤 <b>Utilisateur:</b> ${user.email}\n` +
            `🕒 <b>Date:</b> ${new Date().toLocaleString('fr-FR')}\n` +
            `🌐 <b>IP:</b> ${ip || 'Inconnue'}`

            const replyMarkup = {
                inline_keyboard: [
                    [
                        { text: '✅ Approuver', callback_data: `auth_approve:${request.id}` },
                        { text: '❌ Refuser', callback_data: `auth_reject:${request.id}` }
                    ]
                ]
            }

            try {
                await sendTelegramMessage(text, undefined, undefined, replyMarkup)
            } catch (e) {
                console.error('Erreur notification Telegram admin login:', e)
            }

            return {
                success: true,
                pendingApproval: true,
                requestId: request.id
            } as any
        }

        const cookieStore = await cookies()
        cookieStore.set('admin-token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Forcer à false pour permettre l'accès admin via IP/HTTP
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 jours
            path: '/',
        })

        // Stocker l'email pour l'audit (non sensible)
        cookieStore.set('admin-email', user.email, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
        })

        // Stocker le rôle pour le middleware
        cookieStore.set('admin-role', user.role, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
        })

        await createAuditLog({
            action: 'LOGIN',
            entity: 'AUTH',
            details: `Connexion réussie: ${user.email}`
        })

        // Enregistrer l'historique de connexion (standard)
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

        if (user.role === 'SELLER') {
            try {
                const { notifyAdminOnSellerLogin } = await import('@/lib/whatsapp')
                notifyAdminOnSellerLogin(user, ip).catch(console.error)
            } catch (notifyErr) {
                console.error('Error triggering seller login notification:', notifyErr)
            }
        }

        return {
            success: true,
            redirect: user.role === 'INFLUENCER' ? '/influencer' : (user.role === 'SELLER' ? '/seller' : '/admin'),
        }
    } catch (error) {
        console.error('Erreur lors de la connexion:', error)

        if (error instanceof z.ZodError) {
            return {
                success: false,
                error: error.issues[0].message,
            }
        }

        return {
            success: false,
            error: 'Une erreur est survenue lors de la connexion',
        }
    }
}

export async function checkApprovalStatus(requestId: string): Promise<LoginResult | { success: false, pending: true }> {
    const request = await prisma.adminAuthRequest.findUnique({ where: { id: requestId } })
    if (!request) return { success: false, error: 'Requête introuvable' }

    const approvalCutoff = new Date(Date.now() - APPROVAL_TTL_MS)
    if (request.createdAt < approvalCutoff) {
        return { success: false, error: 'Demande expirée, veuillez vous reconnecter' }
    }

    if (request.status === 'PENDING') return { success: false, pending: true }
    if (request.status === 'REJECTED') return { success: false, error: 'Accès refusé par le super admin' }

    if (request.status === 'APPROVED') {
        const claimed = await prisma.adminAuthRequest.updateMany({
            where: { id: requestId, status: 'APPROVED', createdAt: { gte: approvalCutoff } },
            data: { status: 'CONSUMED' }
        })
        if (claimed.count !== 1) {
            return { success: false, error: 'Demande déjà utilisée ou expirée' }
        }

        const user = await prisma.user.findUnique({ where: { email: request.email } })
        if (!user) return { success: false, error: 'Utilisateur introuvable' }
        if (!ADMIN_LOGIN_ROLES.includes(user.role)) {
            return { success: false, error: 'Rôle administrateur non autorisé' }
        }

        const token = createSessionToken(user.id, user.password, 'admin')

        const cookieStore = await cookies()
        cookieStore.set('admin-token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
        })
        cookieStore.set('admin-email', user.email, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
        })
        cookieStore.set('admin-role', user.role, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
        })

        await createAuditLog({
            action: 'LOGIN',
            entity: 'AUTH',
            details: `Connexion réussie: ${user.email} (Approuvée via Telegram)`
        })

        try {
            const headersList = await headers()
            const userAgent = headersList.get('user-agent')
            await prisma.loginHistory.create({
                data: {
                    userId: user.id,
                    ip: request.ip,
                    userAgent: userAgent
                }
            })
        } catch (e) {
            console.error('Error recording login history:', e)
        }

        return {
            success: true,
            redirect: '/admin',
        }
    }
    return { success: false, error: 'Statut inconnu' }
}

/**
 * Déconnexion admin
 */
export async function logout() {
    try {
        const userId = await getAdminUser()
        if (userId) {
            const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } })
            if (user?.email) {
                const { getWhatsAppAgents } = await import('@/lib/whatsapp-presence')
                const agents = await getWhatsAppAgents().catch(() => [])
                const agent = agents.find(a => a.email.trim().toLowerCase() === user.email.trim().toLowerCase())
                if (agent) {
                    const { setWhatsAppAvailability } = await import('@/lib/actions/whatsapp-presence')
                    await setWhatsAppAvailability(agent.id, false).catch(() => {})
                }
            }
        }
    } catch {
        // ignore presence error on logout
    }

    await createAuditLog({
        action: 'LOGOUT',
        entity: 'AUTH'
    })
    const cookieStore = await cookies()
    cookieStore.set('admin-token', '', { maxAge: 0, path: '/' })
    cookieStore.set('admin-email', '', { maxAge: 0, path: '/' })
    cookieStore.set('admin-role', '', { maxAge: 0, path: '/' })
}

/**
 * Vérifier si l'utilisateur est authentifié avec une validation basique du token
 */
export async function isAuthenticated(): Promise<boolean> {
    try {
        const token = (await cookies()).get('admin-token')?.value
        if (!token) return false
        const id = readSessionSubject(token)
        if (!id) return false
        const user = await prisma.user.findUnique({ where: { id }, select: { password: true, role: true, isBanned: true } })
        if (!user || user.isBanned || !['ADMIN', 'MANAGER', 'SELLER', 'CONFIRMATOR', 'BLOG_MODERATOR', 'INFLUENCER'].includes(user.role)) return false
        return verifySessionToken(token, user.password, 'admin', 7 * 24 * 60 * 60 * 1000)
    } catch { return false }
}

/**
 * Assurer que l'utilisateur est un admin (lance une erreur sinon)
 * À utiliser au début des Server Actions sensibles
 */
export async function verifyAdmin(allowedRoles: readonly string[] = ['ADMIN', 'MANAGER']) {
    const isAuth = await isAuthenticated()

    if (!isAuth) {
        throw new Error('Non autorisé - Accès administrateur requis')
    }

    const userId = await getAdminUser()
    if (!userId) {
        throw new Error('Non autorisé - Session administrateur invalide')
    }

    // Re-read the role for every protected operation so demotions and
    // revocations take effect immediately. Role cookies are only UI hints.
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
    })
    if (!user || !allowedRoles.includes(user.role)) {
        throw new Error('Interdit - Permission administrateur requise')
    }
}

export async function getAdminUser() {
    if (!(await isAuthenticated())) return null

    const cookieStore = await cookies()
    const token = cookieStore.get('admin-token')?.value

    if (!token) return null

    try {
        const decoded = Buffer.from(token, 'base64').toString('ascii')
        const [userId] = decoded.split(':')
        return userId || null
    } catch {
        return null
    }
}

export async function getAdminRole() {
    const userId = await getAdminUser()
    if (!userId) return null

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true }
    })
    return user?.role || null
}

export async function resetPassword(email: string, newPassword: string, token?: string): Promise<{ success: boolean; error?: string }> {
    try {
        const privileged = (await getAdminRole()) === 'ADMIN'
        if (!email || !newPassword) {
            return { success: false, error: 'Email et mot de passe requis' }
        }
        if (newPassword.length < 12 || Buffer.byteLength(newPassword) > 72) {
            return { success: false, error: 'Le mot de passe doit contenir au moins 12 caractères' }
        }

        const user = await prisma.user.findUnique({ where: { email } })
        if (!user) {
            return { success: false, error: 'Utilisateur introuvable' }
        }

        if (!privileged) {
            if (!token) return { success: false, error: 'Lien invalide' }
            const payload = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'], audience: 'password-setup' })
            const version = crypto.createHash('sha256').update(user.password).digest('hex')
            if (typeof payload === 'string' || payload.sub !== user.id || payload.ver !== version) return { success: false, error: 'Lien invalide' }
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10)

        const changed = await prisma.user.updateMany({ where: { id: user.id, password: user.password }, data: { password: hashedPassword } })
        if (changed.count !== 1) return { success: false, error: 'Lien expir?' }

        await createAuditLog({
            action: 'UPDATE',
            entity: 'AUTH',
            details: `Réinitialisation du mot de passe pour: ${email}`
        })

        return { success: true }
    } catch (error) {
        console.error('Erreur lors de la réinitialisation du mot de passe:', error)
        return { success: false, error: 'Une erreur est survenue' }
    }
}


export async function createPasswordSetupToken(email: string) {
    await verifyAdmin(['ADMIN'])
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, password: true } })
    if (!user) throw new Error('Compte introuvable')
    return jwt.sign({ ver: crypto.createHash('sha256').update(user.password).digest('hex') }, getJwtSecret(), { algorithm: 'HS256', subject: user.id, audience: 'password-setup', expiresIn: '24h' })
}
