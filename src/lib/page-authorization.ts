import 'server-only'
import type { UserRole } from '@prisma/client'
import { redirect, notFound } from 'next/navigation'
import { getLocale } from 'next-intl/server'
import { getAuthenticatedAdmin } from './admin-auth'

export async function requirePageRole(roles: readonly UserRole[] = ['ADMIN', 'MANAGER']) {
    const user = await getAuthenticatedAdmin()
    if (!user) redirect(`/${await getLocale()}/admin/login`)
    if (!roles.includes(user.role)) notFound()
    return user
}
