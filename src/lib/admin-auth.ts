import 'server-only'

import type { UserRole } from '@prisma/client'
import { getAdminUser, isAuthenticated } from '@/lib/actions/auth'
import { prisma } from '@/lib/prisma'

export const ORDER_OPERATION_ROLES: readonly UserRole[] = [
    'ADMIN',
    'MANAGER',
    'SELLER',
    'CONFIRMATOR'
]

export async function getAuthenticatedAdmin() {
    if (!(await isAuthenticated())) return null

    const userId = await getAdminUser()
    if (!userId) return null

    return prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, role: true }
    })
}

export function hasAdminRole(
    user: Awaited<ReturnType<typeof getAuthenticatedAdmin>>,
    allowedRoles: readonly UserRole[]
) {
    return Boolean(user && allowedRoles.includes(user.role))
}
