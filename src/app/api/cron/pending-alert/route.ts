import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendTelegramMessage } from "@/lib/telegram"

// Alerte commandes web non traitées depuis > 2h
export async function GET(req: Request) {
    try {
        const url = new URL(req.url)
        const token = url.searchParams.get("token")
        
        if (process.env.CRON_SECRET && token !== process.env.CRON_SECRET) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const twoHoursAgo = new Date()
        twoHoursAgo.setHours(twoHoursAgo.getHours() - 2)

        // Commandes PENDING depuis > 2h
        const staleOrders = await prisma.order.findMany({
            where: {
                status: 'PENDING',
                createdAt: { lte: twoHoursAgo }
            },
            select: {
                id: true,
                fullName: true,
                phone: true,
                city: true,
                total: true,
                createdAt: true
            },
            orderBy: { createdAt: 'asc' },
            take: 10
        })

        if (staleOrders.length === 0) {
            return NextResponse.json({ success: true, message: 'Aucune commande en attente.' })
        }

        const lines = staleOrders.map(o => {
            const age = Math.round((Date.now() - new Date(o.createdAt).getTime()) / 3600000)
            return `⏳ <b>${o.fullName}</b> | ${o.city} | ${o.total.toFixed(2)} درهم\n📞 ${o.phone} | Il y a ${age}h`
        }).join('\n\n')

        const replyMarkup = {
            inline_keyboard: staleOrders.slice(0, 5).map(o => ([
                { text: `✅ Confirmer ${o.fullName.split(' ')[0]}`, callback_data: `os:${o.id}:CONFIRMED` }
            ]))
        }

        const msg = `🚨 <b>${staleOrders.length} Commande(s) Web En Attente > 2h !</b>\n\n${lines}`

        await sendTelegramMessage(msg, undefined, undefined, replyMarkup)

        return NextResponse.json({ success: true, count: staleOrders.length })
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 })
    }
}
