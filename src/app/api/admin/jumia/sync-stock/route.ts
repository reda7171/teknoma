import { NextResponse } from 'next/server'
import { syncBooksStockToJumia } from '@/lib/actions/jumia'
import { getAuthenticatedAdmin, hasAdminRole } from '@/lib/admin-auth'

export async function POST() {
    try {
        const admin = await getAuthenticatedAdmin()
        if (!admin) return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
        if (!hasAdminRole(admin, ['ADMIN'])) return NextResponse.json({ error: 'Acc\u00e8s interdit' }, { status: 403 })

        const result = await syncBooksStockToJumia()
        return NextResponse.json(result)
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Erreur serveur'
        return NextResponse.json({ success: false, message }, { status: 500 })
    }
}
