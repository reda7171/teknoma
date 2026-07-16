'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { verifyAdmin } from '@/lib/actions/auth'
import { ExpenseCategory, TransactionType } from '@prisma/client'

export async function createExpense(data: {
    title: string
    amount: number
    category: ExpenseCategory
    type?: TransactionType
    description?: string
    unitCost?: number
}) {
    await verifyAdmin()
    try {
        await prisma.expense.create({
            data: {
                ...data,
                date: new Date()
            }
        })
        revalidatePath('/admin/finance')
        return { success: true }
    } catch (error) {
        console.error(error)
        return { success: false, error: 'Erreur lors de la crǸation' }
    }
}

export async function updateExpense(id: string, data: {
    title: string
    amount: number
    category: ExpenseCategory
    type?: TransactionType
    description?: string
    unitCost?: number | null
}) {
    await verifyAdmin()
    try {
        await prisma.expense.update({
            where: { id },
            data
        })
        revalidatePath('/admin/finance')
        return { success: true }
    } catch (error) {
        console.error(error)
        return { success: false, error: 'Erreur lors de la modification' }
    }
}

export async function deleteExpense(id: string) {
    await verifyAdmin()
    try {
        await prisma.expense.delete({ where: { id } })
        revalidatePath('/admin/finance')
        return { success: true }
    } catch (error) {
        return { success: false, error: 'Erreur suppression' }
    }
}

export async function getPurchaseLots() {
    try {
        await verifyAdmin()
        return await prisma.expense.findMany({
            where: { 
                category: 'BOOKS_PURCHASE'
            },
            orderBy: { date: 'desc' }
        })
    } catch {
        return []
    }
}

export async function getExpenses(filters?: { month?: number, year?: number }) {
    await verifyAdmin()
    
    let where: any = {}
    
    if (filters?.month && filters?.year) {
        // Mois en JS: 0 = Janvier, 11 = Décembre
        // On veut le début du mois (ex: 1er Janvier) et la fin (ex: 31 Janvier)
        const start = new Date(filters.year, filters.month - 1, 1)
        const end = new Date(filters.year, filters.month, 0, 23, 59, 59, 999)
        where.date = { gte: start, lte: end }
    } else if (filters?.year) {
        const start = new Date(filters.year, 0, 1)
        const end = new Date(filters.year, 11, 31, 23, 59, 59, 999)
        where.date = { gte: start, lte: end }
    }

    return prisma.expense.findMany({
        where,
        orderBy: { date: 'desc' }
    })
}

export async function getFinancialStats(filters?: { month?: number, year?: number }) {
    await verifyAdmin()

    let expenseWhere: any = {}
    let orderWhere: any = { status: 'DELIVERED' }

    if (filters?.month && filters?.year) {
        const start = new Date(filters.year, filters.month - 1, 1)
        const end = new Date(filters.year, filters.month, 0, 23, 59, 59, 999)
        expenseWhere.date = { gte: start, lte: end }
        orderWhere.createdAt = { gte: start, lte: end }
    } else if (filters?.year) {
        const start = new Date(filters.year, 0, 1)
        const end = new Date(filters.year, 11, 31, 23, 59, 59, 999)
        expenseWhere.date = { gte: start, lte: end }
        orderWhere.createdAt = { gte: start, lte: end }
    }

    // Total Expenses
    const expensesAgg = await prisma.expense.aggregate({
        where: { type: 'EXPENSE', ...expenseWhere },
        _sum: { amount: true }
    })

    // Total Incomes
    const incomesAgg = await prisma.expense.aggregate({
        where: { type: 'INCOME', ...expenseWhere },
        _sum: { amount: true }
    })

    // Expenses by Category
    const byCategory = await prisma.expense.groupBy({
        by: ['category'],
        where: expenseWhere,
        _sum: { amount: true }
    })

    // Commands (Chiffre d'affaire) and Cost (Pour Marge)
    const orders = await prisma.order.findMany({
        where: orderWhere,
        include: {
            items: {
                include: {
                    book: { select: { costPrice: true } },
                    pack: { select: { costPrice: true } }
                }
            }
        }
    })

    let totalRevenue = 0
    let totalCostOfGoodsSold = 0
    let totalFixedCosts = 0

    for (const order of orders) {
        totalRevenue += order.total
        totalFixedCosts += 2.65 + (order.shippingFees || 0)
        for (const item of order.items) {
            // Utiliser le costPrice de l'item ou celui du produit s'il est  0
            const itemCost = ((item as any).costPrice && (item as any).costPrice > 0)
                ? (item as any).costPrice
                : ((item as any).book?.costPrice || (item as any).pack?.costPrice || 0)
            totalCostOfGoodsSold += itemCost * item.quantity
        }
    }

    return {
        totalExpenses: expensesAgg._sum.amount || 0,
        totalIncomes: incomesAgg._sum.amount || 0,
        totalRevenue: totalRevenue,
        totalCostOfGoodsSold: totalCostOfGoodsSold + totalFixedCosts, // On inclut dans le coǯt total de vente
        byCategory: byCategory.map(c => ({
            category: c.category,
            amount: c._sum.amount || 0
        }))
    }
}

export async function getChartData(filters?: { month?: number, year?: number }) {
    await verifyAdmin()

    let expenseWhere: any = {}
    let orderWhere: any = { status: 'DELIVERED' }

    if (filters?.month && filters?.year) {
        const start = new Date(filters.year, filters.month - 1, 1)
        const end = new Date(filters.year, filters.month, 0, 23, 59, 59, 999)
        expenseWhere.date = { gte: start, lte: end }
        orderWhere.createdAt = { gte: start, lte: end }
    } else if (filters?.year) {
        const start = new Date(filters.year, 0, 1)
        const end = new Date(filters.year, 11, 31, 23, 59, 59, 999)
        expenseWhere.date = { gte: start, lte: end }
        orderWhere.createdAt = { gte: start, lte: end }
    }

    const expenses = await prisma.expense.findMany({ where: expenseWhere })
    const orders = await prisma.order.findMany({
        where: orderWhere,
        include: {
            items: {
                include: {
                    book: { select: { costPrice: true } },
                    pack: { select: { costPrice: true } }
                }
            }
        }
    })

    const isMonthView = !!(filters?.month && filters?.year)
    const dataMap = new Map<string, { name: string, revenue: number, profit: number }>()

    if (isMonthView) {
        const daysInMonth = new Date(filters!.year!, filters!.month!, 0).getDate()
        for (let i = 1; i <= daysInMonth; i++) {
            dataMap.set(i.toString(), { name: `${i}`, revenue: 0, profit: 0 })
        }
    } else {
        const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
        months.forEach((m, i) => {
            dataMap.set(i.toString(), { name: m, revenue: 0, profit: 0 })
        })
    }

    for (const order of orders) {
        let totalCost = 2.65 + (order.shippingFees || 0)
        for (const item of order.items) {
            const itemCost = ((item as any).costPrice && (item as any).costPrice > 0)
                ? (item as any).costPrice
                : ((item as any).book?.costPrice || (item as any).pack?.costPrice || 0)
            totalCost += itemCost * item.quantity
        }
        
        const dateKey = isMonthView ? order.createdAt.getDate().toString() : order.createdAt.getMonth().toString()
        const entry = dataMap.get(dateKey)
        if (entry) {
            entry.revenue += order.total
            entry.profit += (order.total - totalCost)
        }
    }

    for (const exp of expenses) {
        const dateKey = isMonthView ? exp.date.getDate().toString() : exp.date.getMonth().toString()
        const entry = dataMap.get(dateKey)
        if (entry) {
            if (exp.type === 'EXPENSE' && exp.category !== 'BOOKS_PURCHASE') {
                entry.profit -= exp.amount
            } else if (exp.type === 'INCOME') {
                entry.profit += exp.amount
            }
        }
    }

    return Array.from(dataMap.values())
}
