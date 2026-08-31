'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath, unstable_noStore as noStore } from 'next/cache'
import { verifyAdmin } from '@/lib/actions/auth'
import { ExpenseCategory, TransactionType } from '@prisma/client'
import { getSetting } from '@/lib/actions/site-settings'
import { sendTelegramMessage } from '@/lib/telegram'

export async function createExpense(data: {
    title: string
    amount: number
    category: ExpenseCategory
    type?: TransactionType
    description?: string
    unitCost?: number
    orderIds?: string[]
    orderFraisMap?: Record<string, number>
    date?: string | Date
}) {
    await verifyAdmin()
    try {
        if (data.type === 'INCOME' && data.category === 'INCOME_DELIVERY') {
            const existing = await prisma.expense.findFirst({
                where: {
                    title: data.title,
                    type: 'INCOME',
                    category: 'INCOME_DELIVERY'
                }
            })
            if (existing) {
                return { success: false, error: 'Une facture de livraison avec ce numéro existe déjà.' }
            }
        }

        const expense = await prisma.expense.create({
            data: {
                title: data.title,
                amount: Number(data.amount) || 0,
                category: data.category,
                type: data.type,
                description: data.description,
                unitCost: data.unitCost,
                date: data.date ? new Date(data.date) : new Date()
            }
        })

        if (data.orderIds && data.orderIds.length > 0) {
            // Associer la dépense aux commandes
            await prisma.order.updateMany({
                where: { id: { in: data.orderIds } },
                data: { expenseId: expense.id, isPaid: true }
            })
            
            // Mettre à jour les frais de livraison si fournis
            if (data.orderFraisMap) {
                const updatePromises = Object.entries(data.orderFraisMap).map(([orderId, frais]) => {
                    return prisma.order.update({
                        where: { id: orderId },
                        data: { shippingFees: frais }
                    })
                })
                await Promise.all(updatePromises)
            }
        }
        revalidatePath('/admin/finance')

        // Send Notification if it's an Income / Invoice
        if (data.type === 'INCOME') {
            const shouldNotify = await getSetting('telegram_notify_invoices') === 'true'
            if (shouldNotify) {
                const categoryLabel = data.category === 'INCOME_DELIVERY' ? 'Livraison' : data.category === 'INCOME_JUMIA' ? 'Jumia' : 'Virement'
                await sendTelegramMessage(`🧾 <b>Nouvelle Facture Saisie</b>\n\n📌 <b>Titre:</b> ${data.title}\n💵 <b>Montant:</b> ${data.amount} DH\n📂 <b>Catégorie:</b> ${categoryLabel}\n📦 <b>Commandes liées:</b> ${data.orderIds?.length || 0}`)
            }
        }

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
    date?: string | Date
}) {
    await verifyAdmin()
    try {
        const updateData: any = { ...data, amount: Number(data.amount) || 0 }
        if (data.date) {
            updateData.date = new Date(data.date)
        }
        await prisma.expense.update({
            where: { id },
            data: updateData
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
    
    let where: any = { financeArchiveId: null }
    
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

export async function getUninvoicedDeliveredOrders(currentExpenseId?: string) {
    noStore()
    await verifyAdmin()
    try {
        const orders = await prisma.order.findMany({
            where: {
                status: 'DELIVERED',
                ...(currentExpenseId 
                    ? { OR: [{ expenseId: null }, { expenseId: currentExpenseId }] }
                    : { expenseId: null }
                )
            },
            orderBy: { updatedAt: 'desc' },
            select: {
                id: true,
                trackingID: true,
                fullName: true,
                total: true,
                shippingFees: true,
                shippingCompany: true,
                expenseId: true
            }
        })
        return orders
    } catch (error: any) {
        console.error("Error in getUninvoicedDeliveredOrders:", error)
        throw error
    }
}

export async function getInvoices() {
    await verifyAdmin()
    return prisma.expense.findMany({
        where: {
            category: {
                in: ['INCOME_DELIVERY', 'INCOME_JUMIA']
            }
        },
        orderBy: { date: 'desc' },
        include: {
            orders: {
                select: {
                    id: true,
                    trackingID: true,
                    fullName: true,
                    total: true,
                    shippingCompany: true
                }
            }
        }
    })
}

export async function getFinancialStats(filters?: { month?: number, year?: number }) {
    await verifyAdmin()

    let expenseWhere: any = { financeArchiveId: null }
    let orderWhere: any = { status: 'DELIVERED', financeArchiveId: null }

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
        ordersCount: orders.length,
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

    let expenseWhere: any = { financeArchiveId: null }
    let orderWhere: any = { status: 'DELIVERED', financeArchiveId: null }

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
            dataMap.set(i.toString(), { name: `${i}`, revenue: 0, profit: 0, jumia: 0 })
        }
    } else {
        const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
        months.forEach((m, i) => {
            dataMap.set(i.toString(), { name: m, revenue: 0, profit: 0, jumia: 0 })
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
                if (exp.category === 'INCOME_JUMIA') {
                    entry.jumia += exp.amount
                }
            }
        }
    }

    return Array.from(dataMap.values())
}

export async function archiveCurrentPeriod(data: { name: string, netProfit: number, revenue: number, expenses: number, shareReda: number, shareAmine: number, ordersCount: number }) {
    await verifyAdmin()
    
    // Create archive record
    const archive = await prisma.financeArchive.create({
        data: {
            periodName: data.name,
            startDate: new Date(), // Just as placeholder, real start date would be last archive end date but it's okay for now
            revenue: data.revenue,
            expenses: data.expenses,
            netProfit: data.netProfit,
            shareReda: data.shareReda,
            shareAmine: data.shareAmine,
            ordersCount: data.ordersCount
        }
    })

    // Update all current DELIVERED orders
    await prisma.order.updateMany({
        where: { status: 'DELIVERED', financeArchiveId: null },
        data: { financeArchiveId: archive.id }
    })

    // Update all current expenses
    await prisma.expense.updateMany({
        where: { financeArchiveId: null },
        data: { financeArchiveId: archive.id }
    })

    revalidatePath('/admin/finance')
    return { success: true }
}

export async function getFinanceArchives() {
    await verifyAdmin()
    return prisma.financeArchive.findMany({
        orderBy: { createdAt: 'desc' }
    })
}
