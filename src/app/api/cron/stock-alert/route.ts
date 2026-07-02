import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendTelegramMessage } from "@/lib/telegram"

// Alerte stock critique — à appeler via cron toutes les heures
export async function GET(req: Request) {
    try {
        const url = new URL(req.url)
        const token = url.searchParams.get("token")
        
        if (process.env.CRON_SECRET && token !== process.env.CRON_SECRET) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        // Seuil configurable via SiteSettings (par défaut: 3)
        const seuil_setting = await prisma.siteSettings.findUnique({ where: { key: 'stock_alert_threshold' } })
        const threshold = parseInt(seuil_setting?.value || '3', 10)

        // Livres avec stock critique
        const criticalBooks = await prisma.book.findMany({
            where: { stock: { lte: threshold }, active: true },
            select: { id: true, title: true, stock: true },
            orderBy: { stock: 'asc' },
            take: 20
        })

        if (criticalBooks.length === 0) {
            return NextResponse.json({ success: true, message: 'Aucun stock critique.' })
        }

        const lines = criticalBooks
            .map(b => `📖 <b>${b.title}</b> → Stock: <b>${b.stock}</b>${b.stock === 0 ? ' ⛔ ÉPUISÉ' : ''}`)
            .join('\n')

        const msg = `⚠️ <b>Alerte Stock Critique</b>\n\n${criticalBooks.length} livre(s) avec stock ≤ ${threshold} :\n\n${lines}`

        await sendTelegramMessage(msg)

        return NextResponse.json({ success: true, count: criticalBooks.length })
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 })
    }
}
