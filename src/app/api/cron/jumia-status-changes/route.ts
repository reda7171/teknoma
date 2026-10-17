import { NextResponse } from 'next/server'
import { JumiaAPI } from '@/lib/jumia-api'
import { prisma } from '@/lib/prisma'
import { escapeHtml, sendTelegramMessage } from '@/lib/telegram'

export const dynamic = 'force-dynamic'

const JOB_NAME = 'jumia-status-changes'
const STATE_KEY = 'jumia_order_status_snapshot_v1'
const MAX_PAGES = 100

type StatusSnapshot = Record<string, { status: string; number: string; observedAt: string }>
type JumiaOrder = Record<string, unknown> & {
    Statuses?: unknown[]
}
type StatusChange = { id: string; number: string; from: string; to: string }

function cronIsAuthorized(request: Request) {
    const expected = (process.env.CRON_SECRET || 'une_cle_secrete_pour_cron_2026').replace(/^["']|["']$/g, '')
    const { searchParams } = new URL(request.url)
    const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
        || searchParams.get('secret')
        || searchParams.get('token')

    return Boolean(supplied && supplied === expected)
}

function orderKey(order: JumiaOrder): string {
    return String(order.id || order.orderId || order.OrderId || order.number || order.orderNumber || '')
}

function orderNumber(order: JumiaOrder): string {
    return String(order.number || order.orderNumber || order.OrderNumber || orderKey(order))
}

function orderStatus(order: JumiaOrder): string {
    return String(order.status || order.Status || order.Statuses?.[0] || '').toUpperCase()
}

function statusHeader(toStatus: string): string {
    switch (toStatus) {
        case 'DELIVERED':
            return '✅ <b>Commande Jumia Livrée !</b>'
        case 'SHIPPED':
            return '🚚 <b>Commande Jumia Expédiée !</b>'
        case 'IN_TRANSIT':
        case 'OUT_FOR_DELIVERY':
            return '🛵 <b>Commande Jumia en cours de livraison</b>'
        case 'FAILED':
        case 'DELIVERY_FAILED':
            return '⚠️ <b>Échec de livraison Jumia</b>'
        case 'RETURNED':
            return '↩️ <b>Colis Jumia retourné</b>'
        case 'CANCELED':
            return '❌ <b>Commande Jumia annulée</b>'
        case 'READY_TO_SHIP':
            return '📦 <b>Commande Jumia prête à expédier</b>'
        default:
            return '🔄 <b>Statut commande Jumia modifié</b>'
    }
}

function statusLabel(status: string): string {
    const labels: Record<string, string> = {
        PENDING: 'En attente',
        READY_TO_SHIP: 'Prête à expédier',
        SHIPPED: 'Expédiée',
        IN_TRANSIT: 'En transit',
        OUT_FOR_DELIVERY: 'En cours de livraison',
        DELIVERED: 'Livrée',
        FAILED: 'Échec de livraison',
        DELIVERY_FAILED: 'Échec de livraison',
        RETURNED: 'Retournée',
        CANCELED: 'Annulée'
    }
    return labels[status] || status
}

function formatJumiaDateTime(date: Date): string {
    return date.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '')
}

function extractOrderItems(response: unknown): Record<string, unknown>[] {
    const containers = Array.isArray(response) ? response : [response]
    return containers.flatMap((container) => {
        if (!container || typeof container !== 'object') return []
        const value = container as Record<string, unknown>
        const data = value.data && typeof value.data === 'object'
            ? value.data as Record<string, unknown>
            : undefined
        const items = value.orderItems || value.items || data?.orderItems || data?.items
        return Array.isArray(items) ? items as Record<string, unknown>[] : []
    })
}

function formatOrderItems(items: Record<string, unknown>[]): string {
    if (items.length === 0) return '  • Articles indisponibles'

    return items.slice(0, 20).map((item) => {
        const product = item.product && typeof item.product === 'object'
            ? item.product as Record<string, unknown>
            : undefined
        const name = String(product?.name || item.name || item.productName || 'Article inconnu')
        const sku = String(product?.sellerSku || item.sellerSku || item.sku || '')
        const quantity = Number(item.quantity || 1)
        return `  • ${quantity} × ${escapeHtml(name)}${sku ? ` — <code>${escapeHtml(sku)}</code>` : ''}`
    }).join('\n')
}

export async function GET(request: Request) {
    if (!cronIsAuthorized(request)) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const startedAt = new Date()

    try {
        const jumia = await JumiaAPI.getInstance()
        if (!jumia) throw new Error('Jumia non configuré ou authentification impossible')

        const saved = await prisma.siteSettings.findUnique({ where: { key: STATE_KEY } })
        let previous: StatusSnapshot = {}
        if (saved?.value) {
            try {
                previous = JSON.parse(saved.value) as StatusSnapshot
            } catch {
                console.warn(`[${JOB_NAME}] Snapshot invalide, réinitialisation.`)
            }
        }

        const updatedBefore = formatJumiaDateTime(new Date())
        const updatedAfterDate = new Date()
        updatedAfterDate.setUTCDate(updatedAfterDate.getUTCDate() - 89)
        const updatedAfter = formatJumiaDateTime(updatedAfterDate)

        const orders: JumiaOrder[] = []
        let token: string | undefined
        let page = 0

        do {
            const response = await jumia.getOrdersUpdated({
                size: 300,
                token,
                updatedAfter,
                updatedBefore,
                sort: 'ASC'
            })
            orders.push(...(response?.orders || response?.data?.orders || []) as JumiaOrder[])
            token = response?.nextToken || response?.data?.nextToken || undefined
            page++
        } while (token && page < MAX_PAGES)

        if (token) throw new Error(`Pagination interrompue après ${MAX_PAGES} pages`)

        const now = new Date().toISOString()
        const current: StatusSnapshot = { ...previous }
        const changes: StatusChange[] = []

        for (const order of orders) {
            const key = orderKey(order)
            const status = orderStatus(order)
            if (!key || !status) continue

            const oldStatus = previous[key]?.status
            if (oldStatus && oldStatus !== status) {
                changes.push({ id: key, number: orderNumber(order), from: oldStatus, to: status })
            }

            current[key] = { status, number: orderNumber(order), observedAt: now }
        }

        const trimmed = Object.fromEntries(
            Object.entries(current)
                .sort(([, a], [, b]) => b.observedAt.localeCompare(a.observedAt))
                .slice(0, 5000)
        )

        for (const change of changes) {
            let itemsText = '  • Articles indisponibles'
            try {
                const itemsResponse = await jumia.getOrderItems(change.id)
                itemsText = formatOrderItems(extractOrderItems(itemsResponse))
            } catch (itemError) {
                console.warn(`[${JOB_NAME}] Articles indisponibles pour ${change.number}:`, itemError)
            }

            const header = statusHeader(change.to)
            const message = [
                header,
                '',
                `📦 <b>Commande :</b> <code>${escapeHtml(change.number)}</code>`,
                `⏮ <b>Avant :</b> ${escapeHtml(statusLabel(change.from))}`,
                `⏭ <b>Maintenant :</b> ${escapeHtml(statusLabel(change.to))}`,
                '',
                '📚 <b>Articles :</b>',
                itemsText
            ].join('\n')

            try {
                await sendTelegramMessage(message)
            } catch (tgErr) {
                console.error(`[${JOB_NAME}] Échec notification Telegram pour ${change.number}:`, tgErr)
            }
        }

        // Ne valider le nouvel état qu'après l'envoi de toutes les alertes. En cas
        // d'échec Telegram, le changement sera donc retenté au prochain passage.
        await prisma.siteSettings.upsert({
            where: { key: STATE_KEY },
            update: { value: JSON.stringify(trimmed) },
            create: { key: STATE_KEY, value: JSON.stringify(trimmed) }
        })

        const initialized = !saved?.value
        await prisma.cronLog.create({
            data: {
                jobName: JOB_NAME,
                status: 'SUCCESS',
                message: initialized
                    ? `Snapshot initialisé avec ${orders.length} commande(s), sans notification.`
                    : `${orders.length} commande(s) vérifiée(s), ${changes.length} changement(s) notifié(s).`,
                details: { orders: orders.length, changes: changes.length, pages: page, initialized }
            }
        })

        return NextResponse.json({
            success: true,
            initialized,
            inspectedCount: orders.length,
            changedCount: changes.length,
            pages: page
        })
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Erreur inconnue'
        await prisma.cronLog.create({
            data: {
                jobName: JOB_NAME,
                status: 'ERROR',
                message,
                details: { startedAt: startedAt.toISOString() }
            }
        }).catch(console.error)

        return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
}
