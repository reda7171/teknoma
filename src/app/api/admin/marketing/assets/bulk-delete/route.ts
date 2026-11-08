import { authorizeAdminApi } from '@/lib/api-authorization'
import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/actions/auth'
import { prisma } from '@/lib/prisma'
import fs from 'fs/promises'
import path from 'path'

export async function POST(req: NextRequest) {
    const accessDenied = await authorizeAdminApi(["ADMIN","MANAGER"])
    if (accessDenied) return accessDenied

    try {
        await verifyAdmin()

        const { filenames } = await req.json()
        if (!filenames || !Array.isArray(filenames) || filenames.length === 0) {
            return NextResponse.json({ error: 'Filenames array is required' }, { status: 400 })
        }

        const safeFilenames = filenames.map(f => path.basename(f))

        // Supprimer du système de fichiers
        for (const safeFilename of safeFilenames) {
            const filePath = path.join(process.cwd(), 'public', 'uploads', 'books', safeFilename)
            try {
                await fs.unlink(filePath)
            } catch (e) {
                console.warn(`File ${safeFilename} not found on disk, continuing...`)
            }
        }

        // Supprimer de la base de données
        try {
            await prisma.marketingAsset.deleteMany({
                where: { name: { in: safeFilenames } }
            })
        } catch (e) {
            console.warn(`Error deleting assets from DB`, e)
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
