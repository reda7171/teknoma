import { prisma } from '@/lib/prisma'
import { getAdminUser, getAdminRole } from '@/lib/actions/auth'
import { getCommunityUser } from '@/lib/actions/community-auth'
import { redirect } from 'next/navigation'

export type SellerSession = {
    userId: string
    role: string
    user: {
        id: string
        fullName: string | null
        email: string
        role: string
        image?: string | null
    }
}

/**
 * Récupère la session du vendeur (depuis admin-token ou community-token)
 */
export async function getSellerSession(): Promise<SellerSession | null> {
    try {
        const adminId = await getAdminUser()
        const adminRole = await getAdminRole()

        if (adminId && adminRole === 'SELLER') {
            const user = await prisma.user.findUnique({
                where: { id: adminId },
                select: { id: true, fullName: true, email: true, role: true, image: true, isBanned: true }
            })
            if (user && user.role === 'SELLER' && !user.isBanned) {
                return {
                    userId: user.id,
                    role: user.role,
                    user: {
                        id: user.id,
                        fullName: user.fullName,
                        email: user.email,
                        role: user.role,
                        image: user.image
                    }
                }
            }
        }

        const commUser = await getCommunityUser()
        if (commUser && commUser.role === 'SELLER') {
            return {
                userId: commUser.id,
                role: commUser.role,
                user: {
                    id: commUser.id,
                    fullName: commUser.fullName,
                    email: commUser.email,
                    role: commUser.role,
                    image: commUser.image
                }
            }
        }

        return null
    } catch {
        return null
    }
}

/**
 * Garantit qu'un vendeur est authentifié, sinon redirige vers la page de login
 */
export async function requireSellerSession(locale: string): Promise<SellerSession> {
    const session = await getSellerSession()
    if (!session) {
        redirect(`/${locale}/admin/login`)
    }
    return session
}
