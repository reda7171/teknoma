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
    try {
        await verifyAdmin()
        const { id } = await params

        const post = await prisma.post.findUnique({
            where: { id },
            select: { id: true, coverImage: true }
        })

        if (!post || !post.coverImage) {
            return NextResponse.json({ success: false, error: 'Article ou image introuvable' }, { status: 404 })
        }

        if (post.coverImage.toLowerCase().endsWith('.webp')) {
            return NextResponse.json({ success: true, message: 'Déjà en WEBP' })
        }

        if (post.coverImage.startsWith('http://') || post.coverImage.startsWith('https://')) {
            return NextResponse.json({ success: false, error: 'URL externe non supportée' }, { status: 400 })
        }

        const publicDir = path.join(process.cwd(), 'public')
        const currentFilePath = path.join(publicDir, post.coverImage)

        if (!fs.existsSync(currentFilePath)) {
            return NextResponse.json({ success: false, error: 'Fichier physique introuvable' }, { status: 404 })
        }

        const newFileName = `${path.basename(post.coverImage, path.extname(post.coverImage))}.webp`
        const newRelativePath = path.join(path.dirname(post.coverImage), newFileName).replace(/\\/g, '/')
        const newFilePath = path.join(publicDir, newRelativePath)

        await sharp(currentFilePath)
            .webp({ quality: 80 })
            .toFile(newFilePath)

        try {
            await fs.promises.unlink(currentFilePath)
        } catch (e) {
            console.error('Erreur suppression ancienne image:', e)
        }

        await prisma.post.update({
            where: { id },
            data: { coverImage: newRelativePath }
        })

        return NextResponse.json({ success: true, url: newRelativePath })
    } catch (e: any) {
        console.error('Erreur compression WEBP:', e)
        return NextResponse.json({ success: false, error: e.message }, { status: 500 })
    }
}
