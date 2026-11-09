'use server'

import { prisma } from '@/lib/prisma'
import { verifyAdmin } from './auth'
import { getSetting } from '@/lib/server/site-settings'

export interface RoasDataPoint {
    name: string
    period: string
    revenue: number
    adSpend: number
    roas: number
    orders: number
}

export interface RoasEvolutionResult {
    points: RoasDataPoint[]
    totalRevenue: number
    totalAdSpend: number
    averageRoas: number
    netMargin: number
    deliveredOrdersCount: number
}

/**
 * Calcule l'évolution hebdomadaire du ROAS net (Recettes COD réelles vs Dépenses publicitaires)
 * sur les 8 dernières semaines.
 */
export async function getRoasEvolutionMetrics(weeks = 8): Promise<RoasEvolutionResult> {
    await verifyAdmin()

    const dailyBudgetSetting = await getSetting('google_ads_daily_budget')
    const fallbackDailyBudget = dailyBudgetSetting ? parseFloat(dailyBudgetSetting) : 150

    const now = new Date()
    const points: RoasDataPoint[] = []

    let totalRevenue = 0
    let totalAdSpend = 0
    let deliveredOrdersCount = 0

    for (let i = weeks - 1; i >= 0; i--) {
        const start = new Date(now)
        start.setDate(now.getDate() - (i + 1) * 7)
        start.setHours(0, 0, 0, 0)

        const end = new Date(now)
        end.setDate(now.getDate() - i * 7)
        end.setHours(23, 59, 59, 999)

        // Commandes livrées et encaissées (Revenus réels COD)
        const orders = await prisma.order.findMany({
            where: {
                status: 'DELIVERED',
                updatedAt: { gte: start, lte: end }
            },
            select: { total: true }
        })

        const revenue = Math.round(orders.reduce((sum, o) => sum + (o.total || 0), 0))
        const ordersCount = orders.length

        // Dépenses publicitaires réelles saisies en compta (Category: ADS)
        const adExpenses = await prisma.expense.findMany({
            where: {
                category: 'ADS',
                date: { gte: start, lte: end }
            },
            select: { amount: true }
        })

        let adSpend = Math.round(adExpenses.reduce((sum, e) => sum + (e.amount || 0), 0))

        // Si aucune dépense manuelle n'a été saisie sur la semaine, utiliser l'estimation du budget Google Ads
        if (adSpend === 0) {
            adSpend = Math.round(fallbackDailyBudget * 7)
        }

        const roas = adSpend > 0 ? parseFloat((revenue / adSpend).toFixed(2)) : 0

        totalRevenue += revenue
        totalAdSpend += adSpend
        deliveredOrdersCount += ordersCount

        const label = `Sem. -${i === 0 ? 'En cours' : i}`
        const periodStr = `${start.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} - ${end.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}`

        points.push({
            name: label,
            period: periodStr,
            revenue,
            adSpend,
            roas,
            orders: ordersCount
        })
    }

    const averageRoas = totalAdSpend > 0 ? parseFloat((totalRevenue / totalAdSpend).toFixed(2)) : 0
    const netMargin = totalRevenue - totalAdSpend

    return {
        points,
        totalRevenue,
        totalAdSpend,
        averageRoas,
        netMargin,
        deliveredOrdersCount
    }
}

