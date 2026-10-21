import { NextResponse } from "next/server"
import { JumiaAPI } from "@/lib/jumia-api"
import { getAuthenticatedAdmin, hasAdminRole } from '@/lib/admin-auth'

// Export commandes Jumia du mois en CSV
export async function GET(req: Request) {
    try {
        const admin = await getAuthenticatedAdmin()
        if (!admin) return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
        if (!hasAdminRole(admin, ['ADMIN'])) return NextResponse.json({ error: 'Acc\u00e8s interdit' }, { status: 403 })

        const url = new URL(req.url)
        const monthParam = url.searchParams.get("month") // Format: YYYY-MM (optionnel)

        const jumia = await JumiaAPI.getInstance()
        if (!jumia) {
            return NextResponse.json({ error: "Jumia non configuré" }, { status: 503 })
        }

        // Calculer début/fin du mois
        let startDate: Date
        if (monthParam) {
            const [year, month] = monthParam.split('-').map(Number)
            startDate = new Date(year, month - 1, 1)
        } else {
            const now = new Date()
            startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        }
        const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0)

        const createdAfter = startDate.toISOString().split('T')[0]
        const createdBefore = endDate.toISOString().split('T')[0]

        // Récupérer toutes les commandes (jusqu'à 500)
        let allOrders: any[] = []
        let nextToken: string | undefined = undefined

        for (let i = 0; i < 5; i++) {
            const response = await jumia.getOrders(100, nextToken, undefined, createdAfter, createdBefore)
            const orders = response?.orders || response?.data?.orders || []
            allOrders = allOrders.concat(orders)
            nextToken = response?.nextToken || response?.data?.nextToken
            if (!nextToken || orders.length === 0) break
        }

        // Générer CSV
        const headers = ['Numéro', 'Date', 'Client', 'Statut', 'Montant (درهم)', 'Produits']
        const rows = allOrders.map((o: any) => {
            const orderId = o.number || o.orderId || ''
            const date = o.createdAt ? new Date(o.createdAt).toLocaleDateString('fr-FR') : ''
            const customer = `${o.customerFirstName || ''} ${o.customerLastName || ''}`.trim()
            const status = o.status || ''
            const amount = o.totalAmountLocal?.value || '0'
            const products = (o.items || []).map((i: any) => i.name || i.Name || '').join(' | ')
            return [orderId, date, customer, status, amount, products]
                .map(v => `"${String(v).replace(/"/g, '""')}"`)
                .join(',')
        })

        const csv = [headers.join(','), ...rows].join('\n')
        const monthLabel = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`

        return new NextResponse(csv, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="jumia_commandes_${monthLabel}.csv"`
            }
        })
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
