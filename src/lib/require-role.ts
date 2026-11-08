import 'server-only'
import type { UserRole } from '@prisma/client'
import { getAuthenticatedAdmin } from './admin-auth'

export async function requireRole(roles: readonly UserRole[] = ['ADMIN', 'MANAGER']) {
    const user = await getAuthenticatedAdmin()
    if (!user || !roles.includes(user.role)) throw new Error('Accès interdit')
    return user
}
