import { authorizeAdminApi } from '@/lib/api-authorization'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/actions/auth'
import path from 'path'
import fs from 'fs'
import sharp from 'sharp'

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const accessDenied = await authorizeAdminApi(["ADMIN","MANAGER"])
    if (accessDenied) return accessDenied

    try {
        await verifyAdmin()
        const { id } = await params

        const asset = await prisma.marketingAsset.findUnique({
            where: { id },
            select: { id: true, url: true }
        })

        if (!asset || !asset.url) {
            return NextResponse.json({ success: false, error: 'Asset ou image introuvable' }, { status: 404 })
        }

        if (asset.url.toLowerCase().endsWith('.webp')) {
            return NextResponse.json({ success: true, message: 'Déjà en WEBP' })
        }

        if (asset.url.startsWith('http://') || asset.url.startsWith('https://')) {
            return NextResponse.json({ success: false, error: 'URL externe non supportée' }, { status: 400 })
        }

        const publicDir = path.join(process.cwd(), 'public')
        const currentFilePath = path.join(publicDir, asset.url)

        if (!fs.existsSync(currentFilePath)) {
            return NextResponse.json({ success: false, error: 'Fichier physique introuvable' }, { status: 404 })
        }

        const newFileName = `${path.basename(asset.url, path.extname(asset.url))}.webp`
        const newRelativePath = path.join(path.dirname(asset.url), newFileName).replace(/\\/g, '/')
        const newFilePath = path.join(publicDir, newRelativePath)

        await sharp(currentFilePath)
            .webp({ quality: 80 })
            .toFile(newFilePath)

        try {
            await fs.promises.unlink(currentFilePath)
        } catch (e) {
            console.error('Erreur suppression ancienne image:', e)
        }

        await prisma.marketingAsset.update({
            where: { id },
            data: { url: newRelativePath }
        })

        return NextResponse.json({ success: true, url: newRelativePath })
    } catch (e: any) {
        console.error('Erreur compression WEBP:', e)
        return NextResponse.json({ success: false, error: e.message }, { status: 500 })
    }
}
