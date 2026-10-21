import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import path from 'path'
import { getAuthenticatedAdmin, hasAdminRole } from '@/lib/admin-auth'

export async function POST(request: Request) {
    try {
        const admin = await getAuthenticatedAdmin()
        if (!admin) return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
        if (!hasAdminRole(admin, ['ADMIN'])) return NextResponse.json({ error: 'Acc\u00e8s interdit' }, { status: 403 })

        const body = await request.json()
        const bookId = body.bookId

        if (!bookId) {
            return NextResponse.json({ success: false, error: 'Veuillez sélectionner un livre' }, { status: 400 })
        }

        const scriptPath = path.join(process.cwd(), 'scripts', 'puppeteer_bot.ts')
        
        // On lance le processus en arrière-plan sans attendre sa fin, en passant l'ID via ENV
        exec(`npx tsx "${scriptPath}"`, { env: { ...process.env, BOOK_ID: bookId } }, (error) => {
            if (error) {
                console.error("Erreur lancement bot:", error)
            }
        })

        return NextResponse.json({ success: true, message: "Bot lancé en arrière-plan" })
    } catch (error) {
        console.error("Erreur API bot:", error)
        return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 })
    }
}
