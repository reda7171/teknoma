import { authorizeAdminApi } from '@/lib/api-authorization'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedAdmin, hasAdminRole } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
    const accessDenied = await authorizeAdminApi(["ADMIN"])
    if (accessDenied) return accessDenied

    try {
        const admin = await getAuthenticatedAdmin()
        if (!admin) return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
        if (!hasAdminRole(admin, ['ADMIN'])) return NextResponse.json({ error: 'Acc\u00e8s interdit' }, { status: 403 })
        const { query } = await req.json()

        if (!query || typeof query !== 'string') {
            return NextResponse.json({ success: false, error: 'Query is required' }, { status: 400 })
        }

        const normalizedQuery = query.trim().replace(/;\s*$/, '')
        const upperQuery = normalizedQuery.toUpperCase()
        const allowedPrefixes = ['SELECT', 'SHOW', 'DESCRIBE', 'EXPLAIN']

        if (
            !allowedPrefixes.some(prefix => upperQuery === prefix || upperQuery.startsWith(`${prefix} `))
            || normalizedQuery.includes(';')
        ) {
            return NextResponse.json({
                success: false,
                error: 'Seules les requêtes SQL de lecture sont autorisées.'
            }, { status: 403 })
        }

        const result = await prisma.$queryRawUnsafe<unknown[]>(normalizedQuery)

        // Ensure BigInts are converted to string to avoid JSON serialization errors
        const serializedResult = JSON.parse(JSON.stringify(result, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ))

        return NextResponse.json({ success: true, data: serializedResult })
    } catch (err) {
        console.error('SQL TERMINAL ERROR:', err)
        return NextResponse.json({ success: false, error: 'Erreur lors de la requête SQL' }, { status: 500 })
    }
}
