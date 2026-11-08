import { authorizeAdminApi } from '@/lib/api-authorization'
import { NextResponse } from 'next/server'
import { listBackups, createBackup } from '@/lib/admin/backup'
import { getAuthenticatedAdmin, hasAdminRole } from '@/lib/admin-auth'

async function authorize() {
    const admin = await getAuthenticatedAdmin()
    if (!admin) return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
    if (!hasAdminRole(admin, ['ADMIN'])) return NextResponse.json({ error: 'Acc\u00e8s interdit' }, { status: 403 })
    return null
}

export async function GET() {
    const accessDenied = await authorizeAdminApi(["ADMIN"])
    if (accessDenied) return accessDenied

    try {
        const denied = await authorize()
        if (denied) return denied

        const backups = await listBackups()
        return NextResponse.json({ success: true, backups })
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Erreur serveur'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}

export async function POST() {
    const accessDenied = await authorizeAdminApi(["ADMIN"])
    if (accessDenied) return accessDenied

    try {
        const denied = await authorize()
        if (denied) return denied

        const result = await createBackup()
        return NextResponse.json({ success: true, ...result })
    } catch (error: unknown) {
        console.error('API Backup POST Error:', error)
        const message = error instanceof Error ? error.message : 'Erreur serveur'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
