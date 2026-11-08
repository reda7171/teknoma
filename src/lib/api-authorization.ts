import 'server-only'
import type { UserRole } from '@prisma/client'
import { NextResponse } from 'next/server'
import { getAuthenticatedAdmin } from './admin-auth'

export async function authorizeAdminApi(roles: readonly UserRole[] = ['ADMIN', 'MANAGER']) {
    const user = await getAuthenticatedAdmin()
    if (!user) return NextResponse.json({ error: 'Authentification requise' }, { status: 401, headers: { 'Cache-Control': 'no-store' } })
    if (!roles.includes(user.role)) return NextResponse.json({ error: 'Accès interdit' }, { status: 403, headers: { 'Cache-Control': 'no-store' } })
    return null
}
