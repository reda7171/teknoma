import { NextResponse } from 'next/server'
import { getAllSettings } from '@/lib/actions/site-settings'
import { getAuthenticatedAdmin, hasAdminRole } from '@/lib/admin-auth'

export async function GET() {
    try {
        const admin = await getAuthenticatedAdmin()
        if (!admin) return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
        if (!hasAdminRole(admin, ['ADMIN'])) return NextResponse.json({ error: 'Acc\u00e8s interdit' }, { status: 403 })
        const settings = await getAllSettings()
        return NextResponse.json({ success: true, settings })
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Erreur serveur'
        return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
}
