import { NextResponse } from "next/server"
import { JumiaAPI } from "@/lib/jumia-api"
import { prisma } from "@/lib/prisma"

export const maxDuration = 300 // max execution time 5 mins (Vercel)
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    try {
        const url = new URL(req.url)
        const token = url.searchParams.get("token")
        
        // Sécurité (optionnelle mais recommandée)
        if (process.env.CRON_SECRET && token !== process.env.CRON_SECRET) {
            return new NextResponse("Unauthorized", { status: 401 })
        }

        const jumia = await JumiaAPI.getInstance()
        if (!jumia) {
            return NextResponse.json({ success: false, error: "Jumia API non configurée" })
        }

        // Récupérer tous les produits synchronisés avec Jumia
        const [books, packs, accessories] = await Promise.all([
            prisma.book.findMany({
                where: { isSyncedWithJumia: true, sellerSku: { not: null }, jumiaProductSid: { not: null } }
            }),
            prisma.pack.findMany({
                where: { isSyncedWithJumia: true, sellerSku: { not: null }, jumiaProductSid: { not: null } }
            }),
            prisma.extraProduct.findMany({
                where: { isSyncedWithJumia: true, sellerSku: { not: null }, jumiaProductSid: { not: null } }
            })
        ])

        const updates: any[] = []

        // Formater les mises à jour
        books.forEach(book => {
            if (book.jumiaProductSid && book.sellerSku) {
                updates.push({
                    id: book.jumiaProductSid,
                    sellerSku: book.sellerSku,
                    stock: book.stock
                })
            }
        })

        packs.forEach(pack => {
            if (pack.jumiaProductSid && pack.sellerSku) {
                updates.push({
                    id: pack.jumiaProductSid,
                    sellerSku: pack.sellerSku,
                    stock: pack.stock
                })
            }
        })

        accessories.forEach(accessory => {
            if (accessory.jumiaProductSid && accessory.sellerSku) {
                updates.push({
                    id: accessory.jumiaProductSid,
                    sellerSku: accessory.sellerSku,
                    stock: accessory.stock
                })
            }
        })

        if (updates.length === 0) {
            await prisma.cronLog.create({
                data: {
                    jobName: "sync-stock",
                    status: "SUCCESS",
                    message: "Aucun produit à synchroniser",
                }
            })
            return NextResponse.json({ success: true, message: "Aucun produit à synchroniser", updates: [] })
        }

        // Envoyer à Jumia par lots de 500 pour éviter de surcharger le payload d'un coup (optionnel, Jumia gère de gros feeds, mais c'est plus prudent)
        const BATCH_SIZE = 500
        const feedIds = []
        for (let i = 0; i < updates.length; i += BATCH_SIZE) {
            const batch = updates.slice(i, i + BATCH_SIZE)
            const result = await jumia.updateProductsStock(batch)
            if (result && result.feedId) {
                feedIds.push(result.feedId)
            }
        }

        await prisma.cronLog.create({
            data: {
                jobName: "sync-stock",
                status: "SUCCESS",
                message: `Synchronisation de ${updates.length} produits lancée`,
                details: { feedIds }
            }
        })

        return NextResponse.json({ 
            success: true, 
            message: `Synchronisation de ${updates.length} produits lancée`,
            feedIds
        })

    } catch (error: any) {
        console.error("Erreur cron sync-stock:", error)
        
        await prisma.cronLog.create({
            data: {
                jobName: "sync-stock",
                status: "ERROR",
                message: error.message || "Erreur inconnue",
                details: { stack: error.stack }
            }
        }).catch(e => console.error("Erreur log cron:", e))

        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
