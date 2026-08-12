'use server'

import { prisma } from '@/lib/prisma'
import { verifyAdmin } from './auth'

/**
 * Données cashflow : entrées (commandes livrées) + sorties (dépenses)
 */
export async function getCashflowData(periode: number = 30) {
    await verifyAdmin()

    const since = new Date()
    since.setDate(since.getDate() - periode)

    const [deliveredOrders, expenses, pendingOrders, returnedOrders] = await Promise.all([
        // Entrées : commandes livrées
        prisma.order.findMany({
            where: { status: 'DELIVERED', createdAt: { gte: since } },
            select: { id: true, total: true, subtotal: true, discount: true, createdAt: true, paymentMethod: true },
            orderBy: { createdAt: 'asc' }
        }),
        // Sorties : dépenses
        prisma.expense.findMany({
            where: { date: { gte: since } },
            select: { id: true, title: true, amount: true, category: true, date: true, type: true },
            orderBy: { date: 'asc' }
        }),
        // En attente (revenu potentiel)
        prisma.order.aggregate({
            where: { status: { in: ['PENDING', 'CONFIRMED', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY'] } },
            _sum: { total: true },
            _count: true
        }),
        // Retournés (pertes)
        prisma.order.aggregate({
            where: { status: { in: ['RETURNED', 'FAILED'] }, createdAt: { gte: since } },
            _sum: { total: true },
            _count: true
        })
    ])

    // Calcul totaux
    const totalRevenue = deliveredOrders.reduce((s, o) => s + o.total, 0)
    const totalExpenses = expenses
        .filter(e => e.type === 'EXPENSE')
        .reduce((s, e) => s + e.amount, 0)
    const totalIncomeExtra = expenses
        .filter(e => e.type === 'INCOME')
        .reduce((s, e) => s + e.amount, 0)
    const netCashflow = totalRevenue + totalIncomeExtra - totalExpenses

    // Dépenses par catégorie
    const byCategory: Record<string, number> = {}
    expenses.filter(e => e.type === 'EXPENSE').forEach(e => {
        byCategory[e.category] = (byCategory[e.category] || 0) + e.amount
    })

    // Évolution jour par jour (pour le graphe)
    const dailyMap: Record<string, { revenue: number; expenses: number }> = {}
    deliveredOrders.forEach(o => {
        const day = o.createdAt.toISOString().split('T')[0]
        if (!dailyMap[day]) dailyMap[day] = { revenue: 0, expenses: 0 }
        dailyMap[day].revenue += o.total
    })
    expenses.forEach(e => {
        const day = e.date.toISOString().split('T')[0]
        if (!dailyMap[day]) dailyMap[day] = { revenue: 0, expenses: 0 }
        if (e.type === 'EXPENSE') dailyMap[day].expenses += e.amount
    })

    const daily = Object.entries(dailyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, v]) => ({ date, ...v, net: v.revenue - v.expenses }))

    return {
        totalRevenue,
        totalExpenses,
        totalIncomeExtra,
        netCashflow,
        byCategory,
        daily,
        ordersCount: deliveredOrders.length,
        pendingRevenue: pendingOrders._sum.total || 0,
        pendingCount: pendingOrders._count,
        returnedLoss: returnedOrders._sum.total || 0,
        returnedCount: returnedOrders._count,
        recentExpenses: expenses.slice(-10).reverse(),
        recentOrders: deliveredOrders.slice(-10).reverse(),
    }
}

/**
 * Créer une dépense manuelle
 */
export async function createExpense(data: {
    title: string
    amount: number
    category: string
    date: string
    description?: string
    type: 'EXPENSE' | 'INCOME'
}) {
    await verifyAdmin()
    const expense = await prisma.expense.create({
        data: {
            title: data.title,
            amount: data.amount,
            category: data.category as any,
            date: new Date(data.date),
            description: data.description,
            type: data.type as any,
        }
    })
    return expense
}

/**
 * Supprimer une dépense
 */
export async function deleteExpense(id: string) {
    await verifyAdmin()
    await prisma.expense.delete({ where: { id } })
}
