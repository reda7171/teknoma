import { authorizeAdminApi } from '@/lib/api-authorization'
import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import path from 'path'
import { getAuthenticatedAdmin, hasAdminRole } from '@/lib/admin-auth'
import { prisma } from '@/lib/prisma'
import { generateFacebookWatermarkedImage, FacebookWatermarkConfig } from '@/lib/facebook-watermark'

export async function POST(request: Request) {
    const accessDenied = await authorizeAdminApi(["ADMIN","MANAGER"])
    if (accessDenied) return accessDenied

    try {
        const admin = await getAuthenticatedAdmin()
        if (!admin) return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
        if (!hasAdminRole(admin, ['ADMIN'])) return NextResponse.json({ error: 'Accès interdit' }, { status: 403 })

        const body = await request.json()
        const rawIds: string[] = Array.isArray(body.bookIds)
            ? body.bookIds
            : (body.bookId ? [body.bookId] : [])
        const bookIds = rawIds.filter(Boolean)

        if (bookIds.length === 0) {
            return NextResponse.json({ success: false, error: 'Veuillez sélectionner au moins un livre.' }, { status: 400 })
        }

        const watermark = body.watermark as FacebookWatermarkConfig | undefined

        // Si le filigrane est activé, générer les images avec filigrane avant le lancement du bot
        if (watermark?.enabled) {
            const books = await prisma.book.findMany({
                where: { id: { in: bookIds } },
                select: { id: true, title: true, price: true, image: true }
            })

            for (const b of books) {
                if (b.image) {
                    await generateFacebookWatermarkedImage(b, watermark)
                }
            }
        }

        const scriptPath = path.join(process.cwd(), 'scripts', 'puppeteer_bot.ts')

        // On lance le processus en arrière-plan sans attendre sa fin
        const childEnv = {
            ...process.env,
            BOOK_ID: bookIds[0],
            BOOK_IDS: bookIds.join(','),
            USE_WATERMARK: watermark?.enabled ? 'true' : 'false'
        }

        exec(`npx tsx "${scriptPath}"`, { env: childEnv }, (error) => {
            if (error) {
                console.error("Erreur lancement bot:", error)
            }
        })

        return NextResponse.json({
            success: true,
            count: bookIds.length,
            message: `Bot Facebook lancé pour ${bookIds.length} livre(s).`
        })
    } catch (error: any) {
        console.error("Erreur API bot:", error)
        return NextResponse.json({ success: false, error: error.message || 'Erreur serveur' }, { status: 500 })
    }
}
