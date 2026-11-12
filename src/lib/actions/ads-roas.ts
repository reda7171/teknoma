'use server'

import { prisma } from '@/lib/prisma'
import { verifyAdmin } from './auth'
import { getSetting } from '@/lib/server/site-settings'

export type RoasSpendSource = 'IMPORTED' | 'ACCOUNTING' | 'ESTIMATED'

export interface RoasDataPoint {
    name: string
    period: string
    revenue: number
    adSpend: number
    metaSpend: number
    googleSpend: number
    spendSource: RoasSpendSource
    roas: number
    orders: number
}

export interface RoasEvolutionResult {
    points: RoasDataPoint[]
    totalRevenue: number
    totalAdSpend: number
    metaSpendTotal: number
    googleSpendTotal: number
    averageRoas: number
    netMargin: number
    deliveredOrdersCount: number
    spendSource: RoasSpendSource
    lastSyncedAt: string | null
}

interface WeekWindow {
    start: Date
    end: Date
    label: string
    period: string
}

function overlapDays(aStart: number, aEnd: number, bStart: number, bEnd: number): number {
    const start = Math.max(aStart, bStart)
    const end = Math.min(aEnd, bEnd)
    if (end <= start) return 0
    return (end - start) / (24 * 60 * 60 * 1000)
}

/**
 * Répartit proportionnellement les dépenses importées d'une plateforme (last_7d, last_30d, maximum)
 * sur les fenêtres hebdomadaires sans double comptage.
 */
function allocatePlatformSpendByWeek(
    rows: Array<{ platform: string; datePreset: string; spendMad: number; dateStart: string | null }>,
    platform: 'META' | 'GOOGLE',
    windows: WeekWindow[],
    nowMs: number
): number[] {
    const result = new Array<number>(windows.length).fill(0)
    const platRows = rows.filter((r) => r.platform === platform)
    if (platRows.length === 0 || windows.length === 0) return result

    const sum7d = platRows
        .filter((r) => r.datePreset === 'last_7d')
        .reduce((s, r) => s + (r.spendMad || 0), 0)
    const sum30d = platRows
        .filter((r) => r.datePreset === 'last_30d')
        .reduce((s, r) => s + (r.spendMad || 0), 0)
    const maxRows = platRows.filter((r) => r.datePreset === 'maximum')
    const sumMax = maxRows.reduce((s, r) => s + (r.spendMad || 0), 0)

    const dayMs = 24 * 60 * 60 * 1000
    const start7d = nowMs - 7 * dayMs
    const start30d = nowMs - 30 * dayMs
    const lastIdx = windows.length - 1

    if (sum7d > 0) {
        result[lastIdx] += sum7d
        const remaining30d = Math.max(0, sum30d - sum7d)
        if (remaining30d > 0) {
            const overlaps = windows.map((w) => overlapDays(w.start.getTime(), w.end.getTime(), start30d, start7d))
            const totalOv = overlaps.reduce((a, b) => a + b, 0)
            if (totalOv > 0) {
                windows.forEach((_, idx) => {
                    result[idx] += (remaining30d * overlaps[idx]) / totalOv
                })
            }
        }
    } else if (sum30d > 0) {
        const overlaps = windows.map((w) => overlapDays(w.start.getTime(), w.end.getTime(), start30d, nowMs))
        const totalOv = overlaps.reduce((a, b) => a + b, 0)
        if (totalOv > 0) {
            windows.forEach((_, idx) => {
                result[idx] += (sum30d * overlaps[idx]) / totalOv
            })
        }
    }

    const baseRecent = Math.max(sum30d, sum7d)
    const remainingOlder = Math.max(0, sumMax - baseRecent)
    if (remainingOlder > 0) {
        const oldestHorizon = windows[0].start.getTime()
        let activeOlderStart = oldestHorizon
        for (const r of maxRows) {
            if (r.dateStart) {
                const parsed = Date.parse(r.dateStart)
                if (Number.isFinite(parsed) && parsed > oldestHorizon && parsed < start30d) {
                    activeOlderStart = parsed
                    break
                }
            }
        }
        const overlaps = windows.map((w) => overlapDays(w.start.getTime(), w.end.getTime(), activeOlderStart, start30d))
        const totalOv = overlaps.reduce((a, b) => a + b, 0)
        if (totalOv > 0) {
            windows.forEach((_, idx) => {
                result[idx] += (remainingOlder * overlaps[idx]) / totalOv
            })
        }
    }

    return result.map((v) => Math.round(v))
}

/**
 * Calcule l'évolution hebdomadaire du ROAS net (Recettes COD réelles vs dépenses Meta/Google Ads réelles).
 */
export async function getRoasEvolutionMetrics(weeks = 8): Promise<RoasEvolutionResult> {
    await verifyAdmin()

    const dailyBudgetSetting = await getSetting('google_ads_daily_budget')
    const fallbackDailyBudget = dailyBudgetSetting ? parseFloat(dailyBudgetSetting) : 150

    const now = new Date()
    const nowMs = now.getTime()
    const windows: WeekWindow[] = []

    for (let i = weeks - 1; i >= 0; i--) {
        const start = new Date(now)
        start.setDate(now.getDate() - (i + 1) * 7)
        start.setHours(0, 0, 0, 0)

        const end = new Date(now)
        end.setDate(now.getDate() - i * 7)
        end.setHours(23, 59, 59, 999)

        windows.push({
            start,
            end,
            label: `Sem. -${i === 0 ? 'En cours' : i}`,
            period: `${start.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} - ${end.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}`,
        })
    }

    const horizonStart = windows[0].start
    const horizonEnd = windows[windows.length - 1].end

    const [orders, adExpenses, importedRows] = await Promise.all([
        prisma.order.findMany({
            where: {
                status: 'DELIVERED',
                updatedAt: { gte: horizonStart, lte: horizonEnd },
            },
            select: { total: true, updatedAt: true },
        }),
        prisma.expense.findMany({
            where: {
                category: 'ADS',
                date: { gte: horizonStart, lte: horizonEnd },
            },
            select: { amount: true, date: true },
        }),
        prisma.adCampaignSpend.findMany({
            where: {
                NOT: [
                    { campaignId: { startsWith: 'seed_meta_' } },
                    { campaignId: { startsWith: 'seed_google_' } },
                ],
            },
            select: {
                platform: true,
                datePreset: true,
                spendMad: true,
                dateStart: true,
                syncedAt: true,
            },
        }),
    ])

    const hasImportedData = importedRows.some((r) => r.spendMad > 0)
    const hasAccountingData = adExpenses.some((e) => (e.amount || 0) > 0)
    const metaWeekly = allocatePlatformSpendByWeek(importedRows, 'META', windows, nowMs)
    const googleWeekly = allocatePlatformSpendByWeek(importedRows, 'GOOGLE', windows, nowMs)

    const latestSyncMs = importedRows.reduce(
        (max, r) => Math.max(max, r.syncedAt ? r.syncedAt.getTime() : 0),
        0
    )

    let totalRevenue = 0
    let totalAdSpend = 0
    let metaSpendTotal = 0
    let googleSpendTotal = 0
    let deliveredOrdersCount = 0

    const points: RoasDataPoint[] = windows.map((win, idx) => {
        const sMs = win.start.getTime()
        const eMs = win.end.getTime()

        const weekOrders = orders.filter((o) => {
            const t = o.updatedAt.getTime()
            return t >= sMs && t <= eMs
        })
        const revenue = Math.round(weekOrders.reduce((sum, o) => sum + (o.total || 0), 0))
        const ordersCount = weekOrders.length

        const manualSpend = Math.round(
            adExpenses
                .filter((e) => {
                    const t = e.date.getTime()
                    return t >= sMs && t <= eMs
                })
                .reduce((sum, e) => sum + (e.amount || 0), 0)
        )

        const metaSpend = metaWeekly[idx] || 0
        const googleSpend = googleWeekly[idx] || 0
        const importedTotal = metaSpend + googleSpend

        let adSpend = 0
        let weekSource: RoasSpendSource = 'ESTIMATED'
        if (importedTotal > 0) {
            adSpend = importedTotal
            weekSource = 'IMPORTED'
        } else if (manualSpend > 0) {
            adSpend = manualSpend
            weekSource = 'ACCOUNTING'
        } else if (hasImportedData || hasAccountingData) {
            adSpend = 0
            weekSource = hasImportedData ? 'IMPORTED' : 'ACCOUNTING'
        } else {
            adSpend = Math.round(fallbackDailyBudget * 7)
            weekSource = 'ESTIMATED'
        }

        const roas = adSpend > 0 ? parseFloat((revenue / adSpend).toFixed(2)) : 0

        totalRevenue += revenue
        totalAdSpend += adSpend
        metaSpendTotal += metaSpend
        googleSpendTotal += googleSpend
        deliveredOrdersCount += ordersCount

        return {
            name: win.label,
            period: win.period,
            revenue,
            adSpend,
            metaSpend,
            googleSpend,
            spendSource: weekSource,
            roas,
            orders: ordersCount,
        }
    })

    const averageRoas = totalAdSpend > 0 ? parseFloat((totalRevenue / totalAdSpend).toFixed(2)) : 0
    const netMargin = totalRevenue - totalAdSpend
    const overallSource: RoasSpendSource = hasImportedData
        ? 'IMPORTED'
        : hasAccountingData
          ? 'ACCOUNTING'
          : 'ESTIMATED'

    return {
        points,
        totalRevenue,
        totalAdSpend,
        metaSpendTotal,
        googleSpendTotal,
        averageRoas,
        netMargin,
        deliveredOrdersCount,
        spendSource: overallSource,
        lastSyncedAt: latestSyncMs > 0 ? new Date(latestSyncMs).toISOString() : null,
    }
}
