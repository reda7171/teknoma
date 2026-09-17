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

        const book = await prisma.book.findUnique({
            where: { id },
            select: { id: true, image: true }
        })

        if (!book || !book.image) {
            return NextResponse.json({ success: false, error: 'Livre ou image introuvable' }, { status: 404 })
        }

        // If it's already a webp, nothing to do
        if (book.image.toLowerCase().endsWith('.webp')) {
            return NextResponse.json({ success: true, message: 'Déjà en WEBP' })
        }

        // Must be a local file
        if (book.image.startsWith('http://') || book.image.startsWith('https://')) {
            return NextResponse.json({ success: false, error: 'URL externe non supportée pour la compression locale' }, { status: 400 })
        }

        const publicDir = path.join(process.cwd(), 'public')
        const currentFilePath = path.join(publicDir, book.image)

        if (!fs.existsSync(currentFilePath)) {
            return NextResponse.json({ success: false, error: 'Fichier physique introuvable' }, { status: 404 })
        }

        // Convert to webp
        const newFileName = `${path.basename(book.image, path.extname(book.image))}.webp`
        const newRelativePath = path.join(path.dirname(book.image), newFileName).replace(/\\/g, '/')
        const newFilePath = path.join(publicDir, newRelativePath)

        await sharp(currentFilePath)
            .webp({ quality: 80 })
            .toFile(newFilePath)

        // Delete old file
        try {
            await fs.promises.unlink(currentFilePath)
        } catch (e) {
            console.error('Erreur lors de la suppression de l\'ancienne image:', e)
        }

        // Update database
        await prisma.book.update({
            where: { id },
            data: { image: newRelativePath }
        })

        return NextResponse.json({ success: true, url: newRelativePath })
    } catch (e: any) {
        console.error('Erreur compression WEBP:', e)
        return NextResponse.json({ success: false, error: e.message }, { status: 500 })
    }
}
