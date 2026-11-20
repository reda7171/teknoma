import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedAdmin, hasAdminRole } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { generateFacebookWatermarkedImage, FacebookWatermarkConfig } from '@/lib/facebook-watermark'
import fsPromises from 'fs/promises'

export async function POST(req: NextRequest) {
    try {
        const admin = await getAuthenticatedAdmin()
        if (!admin) return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
        if (!hasAdminRole(admin, ['ADMIN'])) return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })

        const body = await req.json()
        const { bookId, watermark } = body as { bookId: string, watermark: FacebookWatermarkConfig }

        if (!bookId) {
            return NextResponse.json({ error: 'ID de livre manquant' }, { status: 400 })
        }

        const book = await prisma.book.findUnique({
            where: { id: bookId },
            select: { id: true, title: true, price: true, image: true }
        })

        if (!book || !book.image) {
            return NextResponse.json({ error: 'Livre ou image introuvable' }, { status: 404 })
        }

        const result = await generateFacebookWatermarkedImage(book, watermark)
        if (!result) {
            return NextResponse.json({ error: 'Échec de la génération du filigrane' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            url: result.relativeUrl
        })
    } catch (error: any) {
        console.error('Erreur API watermark:', error)
        return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 })
    }
}

export async function GET(req: NextRequest) {
    try {
        const admin = await getAuthenticatedAdmin()
        if (!admin) return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
        if (!hasAdminRole(admin, ['ADMIN'])) return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })

        const { searchParams } = new URL(req.url)
        const bookId = searchParams.get('bookId')

        if (!bookId) {
            return new NextResponse('ID manquant', { status: 400 })
        }

        const book = await prisma.book.findUnique({
            where: { id: bookId },
            select: { id: true, title: true, price: true, image: true }
        })

        if (!book || !book.image) {
            return new NextResponse('Livre introuvable', { status: 404 })
        }

        const watermark: FacebookWatermarkConfig = {
            enabled: searchParams.get('enabled') !== 'false',
            text: searchParams.get('text') || undefined,
            showPrice: searchParams.get('showPrice') !== 'false',
            position: (searchParams.get('position') as any) || 'bottom',
            color: searchParams.get('color') || '#0f172a',
            opacity: parseFloat(searchParams.get('opacity') || '0.92')
        }

        const result = await generateFacebookWatermarkedImage(book, watermark)
        if (!result) {
            return new NextResponse('Impossible de générer le filigrane', { status: 500 })
        }

        const fileBuffer = await fsPromises.readFile(result.absolutePath)
        const filename = `petsunivers_fb_${book.id}.jpg`

        return new NextResponse(fileBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'image/jpeg',
                'Content-Disposition': `attachment; filename="${filename}"`
            }
        })
    } catch (error: any) {
        return new NextResponse(error.message || 'Erreur serveur', { status: 500 })
    }
}
