import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendTelegramMessage } from '@/lib/telegram'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

function isOrphanLocalImage(imageUrl: string | null | undefined): boolean {
    if (!imageUrl || typeof imageUrl !== 'string') return false
    const trimmed = imageUrl.trim()
    if (!trimmed) return false

    // Ignorer les images externes ou en base64
    if (trimmed.startsWith('data:image')) return false
    if ((trimmed.startsWith('http://') || trimmed.startsWith('https://')) && !trimmed.includes('/uploads/')) {
        return false
    }

    if (!trimmed.includes('/uploads/') && !trimmed.startsWith('uploads/')) {
        return false
    }

    // Nettoyer l'URL pour obtenir le chemin relatif public/
    const cleanPath = trimmed
        .replace(/^https?:\/\/[^\/]+/, '')
        .split('?')[0]
        .split('#')[0]

    const normalizedRelPath = cleanPath.startsWith('/') ? cleanPath.slice(1) : cleanPath
    const decodedRelPath = decodeURIComponent(normalizedRelPath)

    const fullPath1 = path.join(process.cwd(), 'public', normalizedRelPath)
    const fullPath2 = path.join(process.cwd(), 'public', decodedRelPath)

    try {
        const exists1 = fs.existsSync(fullPath1)
        const exists2 = fs.existsSync(fullPath2)
        return !exists1 && !exists2
    } catch {
        return false
    }
}

export async function cleanOrphanImages() {
    const details: Array<{ type: string; id: string; name: string; orphanUrl: string }> = []
    let cleanedBooks = 0
    let cleanedPacks = 0
    let cleanedAccessories = 0
    let cleanedPosts = 0

    // 1. Nettoyage des Livres
    const books = await prisma.book.findMany({
        where: {
            OR: [
                { image: { contains: '/uploads/' } },
                { image: { startsWith: 'uploads/' } }
            ]
        },
        select: { id: true, title: true, image: true }
    })

    for (const book of books) {
        if (isOrphanLocalImage(book.image)) {
            await prisma.book.updateMany({
                where: { id: book.id },
                data: { image: '/book-placeholder.png' }
            })
            cleanedBooks++
            details.push({
                type: 'BOOK',
                id: book.id,
                name: book.title,
                orphanUrl: book.image
            })
        }
    }

    // 2. Nettoyage des Packs
    const packs = await prisma.pack.findMany({
        where: {
            OR: [
                { image: { contains: '/uploads/' } },
                { image: { startsWith: 'uploads/' } }
            ]
        },
        select: { id: true, name: true, image: true }
    })

    for (const pack of packs) {
        if (isOrphanLocalImage(pack.image)) {
            await prisma.pack.updateMany({
                where: { id: pack.id },
                data: { image: null }
            })
            cleanedPacks++
            details.push({
                type: 'PACK',
                id: pack.id,
                name: pack.name,
                orphanUrl: pack.image || ''
            })
        }
    }

    // 3. Nettoyage des Accessoires
    const accessories = await prisma.extraProduct.findMany({
        where: {
            OR: [
                { image: { contains: '/uploads/' } },
                { image: { startsWith: 'uploads/' } }
            ]
        },
        select: { id: true, name: true, image: true }
    })

    for (const acc of accessories) {
        if (isOrphanLocalImage(acc.image)) {
            await prisma.extraProduct.updateMany({
                where: { id: acc.id },
                data: { image: '/book-placeholder.png' }
            })
            cleanedAccessories++
            details.push({
                type: 'ACCESSORY',
                id: acc.id,
                name: acc.name,
                orphanUrl: acc.image || ''
            })
        }
    }

    // 4. Nettoyage des Articles de Blog
    const posts = await prisma.post.findMany({
        where: {
            OR: [
                { image: { contains: '/uploads/' } },
                { image: { startsWith: 'uploads/' } }
            ]
        },
        select: { id: true, title: true, image: true }
    })

    for (const post of posts) {
        if (isOrphanLocalImage(post.image)) {
            await prisma.post.updateMany({
                where: { id: post.id },
                data: { image: '/placeholder.png' }
            })
            cleanedPosts++
            details.push({
                type: 'POST',
                id: post.id,
                name: post.title,
                orphanUrl: post.image || ''
            })
        }
    }

    const totalCleaned = cleanedBooks + cleanedPacks + cleanedAccessories + cleanedPosts

    // Notification Telegram si des orphelins ont été nettoyés
    if (totalCleaned > 0) {
        const msg = `🧹 <b>Nettoyage Nocturne des Images Orphelines</b>\n\n` +
            `• Livres nettoyés : <b>${cleanedBooks}</b>\n` +
            `• Packs nettoyés : <b>${cleanedPacks}</b>\n` +
            `• Accessoires nettoyés : <b>${cleanedAccessories}</b>\n` +
            `• Articles blog nettoyés : <b>${cleanedPosts}</b>\n` +
            `• <b>Total : ${totalCleaned} URL(s) orpheline(s) corrigée(s)</b>\n\n` +
            `✅ Base de données synchronisée et erreurs 404 évitées.`

        sendTelegramMessage(msg).catch(console.error)
    }

    return {
        success: true,
        timestamp: new Date().toISOString(),
        cleaned: {
            books: cleanedBooks,
            packs: cleanedPacks,
            accessories: cleanedAccessories,
            posts: cleanedPosts,
            total: totalCleaned
        },
        details
    }
}

export async function GET(req: Request) {
    try {
        const url = new URL(req.url)
        const token = url.searchParams.get('token')
        const authHeader = req.headers.get('authorization')
        const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null

        const expectedToken = process.env.CRON_SECRET?.replace(/^["']|["']$/g, '')
        if (expectedToken && token !== expectedToken && bearerToken !== expectedToken) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const result = await cleanOrphanImages()
        return NextResponse.json(result)
    } catch (error: any) {
        console.error('Erreur cron clean-orphan-images:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

export async function POST(req: Request) {
    return GET(req)
}
