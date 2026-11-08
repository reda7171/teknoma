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

        const publicDir = path.join(process.cwd(), 'public')
        const uploadsDir = path.join(publicDir, 'uploads', 'books')
        if (!fs.existsSync(uploadsDir)) {
            await fs.promises.mkdir(uploadsDir, { recursive: true })
        }

        let inputBuffer: Buffer
        let oldFilePathToDelete: string | null = null

        if (book.image.startsWith('http://') || book.image.startsWith('https://')) {
            const res = await fetch(book.image, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) RiwayaBot/1.0',
                    'Accept': 'image/avif,image/webp,image/*,*/*'
                }
            })
            if (!res.ok) {
                return NextResponse.json({
                    success: false,
                    error: `Impossible de récupérer l'image distante (${res.status})`
                }, { status: 400 })
            }
            const arrayBuf = await res.arrayBuffer()
            inputBuffer = Buffer.from(arrayBuf)
        } else {
            const localRel = book.image.startsWith('/') ? book.image.slice(1) : book.image
            const currentFilePath = path.join(publicDir, localRel)
            if (!fs.existsSync(currentFilePath)) {
                return NextResponse.json({ success: false, error: 'Fichier physique introuvable' }, { status: 404 })
            }
            inputBuffer = await fs.promises.readFile(currentFilePath)
            oldFilePathToDelete = currentFilePath
        }

        // Convert to webp
        const cleanBookId = book.id.replace(/[^a-zA-Z0-9_-]/g, '')
        const newFileName = `book-${cleanBookId}-${Date.now()}.webp`
        const newFilePath = path.join(uploadsDir, newFileName)
        const newRelativePath = `/uploads/books/${newFileName}`

        await sharp(inputBuffer)
            .webp({ quality: 80, effort: 4 })
            .toFile(newFilePath)

        // Delete old local file if existing
        if (oldFilePathToDelete && oldFilePathToDelete !== newFilePath) {
            try {
                await fs.promises.unlink(oldFilePathToDelete)
            } catch (e) {
                console.warn('Erreur lors de la suppression de l\'ancienne image:', e)
            }
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
