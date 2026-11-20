import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

async function loadImage(imageUrl: string): Promise<Buffer> {
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        const response = await fetch(imageUrl, { next: { revalidate: 86400 } })
        if (!response.ok) throw new Error(`Unable to fetch pack image (${response.status})`)
        return Buffer.from(await response.arrayBuffer())
    }

    const relativePath = imageUrl.startsWith('/') ? imageUrl.slice(1) : imageUrl
    const publicDirectory = path.resolve(process.cwd(), 'public')
    const imagePath = path.resolve(publicDirectory, relativePath)

    if (!imagePath.startsWith(`${publicDirectory}${path.sep}`) || !fs.existsSync(imagePath)) {
        throw new Error('Pack image not found')
    }

    return fs.readFileSync(imagePath)
}

export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await props.params
        const pack = await prisma.pack.findUnique({
            where: { id },
            select: {
                image: true,
                books: {
                    orderBy: { id: 'asc' },
                    take: 1,
                    select: { book: { select: { image: true } } },
                },
            },
        })

        const sourceImages = [pack?.image, pack?.books[0]?.book.image]
            .filter((image): image is string => Boolean(image))
        if (sourceImages.length === 0) return new NextResponse('Not found', { status: 404 })

        let imageBuffer: Buffer | null = null
        for (const sourceImage of sourceImages) {
            try {
                imageBuffer = await loadImage(sourceImage)
                break
            } catch {
                // If the pack visual is missing, its first book cover remains
                // a valid, relevant fallback for Merchant Center.
            }
        }
        if (!imageBuffer) return new NextResponse('Not found', { status: 404 })

        const processedImage = await sharp(imageBuffer)
            .rotate()
            .resize(1500, 1500, {
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 1 },
                withoutEnlargement: false,
            })
            .flatten({ background: '#ffffff' })
            .jpeg({ quality: 92, mozjpeg: true })
            .toBuffer()

        return new NextResponse(processedImage, {
            headers: {
                'Content-Type': 'image/jpeg',
                'Cache-Control': 'public, max-age=31536000, immutable',
                'X-Content-Type-Options': 'nosniff',
            },
        })
    } catch (error) {
        console.error('Error generating Merchant Center pack image:', error)
        return new NextResponse('Not found', { status: 404 })
    }
}
