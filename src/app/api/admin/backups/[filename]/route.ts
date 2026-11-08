import { authorizeAdminApi } from '@/lib/api-authorization'
import { NextRequest, NextResponse } from 'next/server'
import { getBackupPath, deleteBackup } from '@/lib/admin/backup'
import { getAuthenticatedAdmin, hasAdminRole } from '@/lib/admin-auth'
import fs from 'fs'

export async function GET(
    req: NextRequest,
    props: { params: Promise<{ filename: string }> }
) {
    const accessDenied = await authorizeAdminApi(["ADMIN"])
    if (accessDenied) return accessDenied

    const params = await props.params;
    try {
        const admin = await getAuthenticatedAdmin()

        if (!admin) return new NextResponse('Authentification requise', { status: 401 })
        if (!hasAdminRole(admin, ['ADMIN'])) return new NextResponse('Accès interdit', { status: 403 })

        const filepath = getBackupPath(params.filename)
        if (!filepath) {
            return new NextResponse('Fichier non trouvé', { status: 404 })
        }

        const fileBuffer = fs.readFileSync(filepath)

        return new NextResponse(fileBuffer, {
            headers: {
                'Content-Type': 'application/sql',
                'Content-Disposition': `attachment; filename="${params.filename}"`
            }
        })
    } catch (error) {
        console.error('Erreur téléchargement backup:', error)
        return new NextResponse('Erreur serveur', { status: 500 })
    }
}

export async function DELETE(
    req: NextRequest,
    props: { params: Promise<{ filename: string }> }
) {
    const accessDenied = await authorizeAdminApi(["ADMIN"])
    if (accessDenied) return accessDenied

    const params = await props.params;
    try {
        const admin = await getAuthenticatedAdmin()

        if (!admin) return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
        if (!hasAdminRole(admin, ['ADMIN'])) return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })

        await deleteBackup(params.filename)
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Erreur suppression backup:', error)
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
    }
}
