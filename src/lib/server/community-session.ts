import 'server-only'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import crypto from 'node:crypto'
import { createSessionToken } from '@/lib/session-token'

export async function createSession(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { locale: true, password: true, isBanned: true }
    })

    if (!user || user.isBanned) throw new Error('Acc�s interdit')
    const token = createSessionToken(userId, user.password, 'community')

    const cookieStore = await cookies()
    cookieStore.set('community-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
    })
    cookieStore.set('riwaya_authenticated', '1', {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
    })

    if (user?.locale) {
        cookieStore.set('NEXT_LOCALE', user.locale, { path: '/', secure: process.env.NODE_ENV === 'production' })
    }
}
