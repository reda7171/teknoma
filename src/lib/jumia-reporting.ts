export type JumiaReportOrder = {
    status?: unknown
    Status?: unknown
    createdAt?: unknown
    CreatedAt?: unknown
    created_at?: unknown
    orderDate?: unknown
    OrderDate?: unknown
    totalAmountLocal?: { value?: unknown } | null
    Price?: unknown
    GrandTotal?: unknown
}

const NON_REVENUE_STATUSES = new Set([
    'CANCELED',
    'CANCELLED',
    'FAILED',
    'DELIVERY_FAILED',
    'RETURNED',
    'RETURNED_TO_SELLER',
    'REFUNDED'
])

export function getJumiaOrderStatus(order: JumiaReportOrder) {
    return String(order.status || order.Status || 'UNKNOWN')
        .trim()
        .toUpperCase()
        .replace(/[\s-]+/g, '_')
}

export function isJumiaRevenueOrder(order: JumiaReportOrder) {
    return !NON_REVENUE_STATUSES.has(getJumiaOrderStatus(order))
}

export function getJumiaOrderAmount(order: JumiaReportOrder) {
    const amount = Number(order.totalAmountLocal?.value ?? order.Price ?? order.GrandTotal ?? 0)
    return Number.isFinite(amount) ? amount : 0
}

export function summarizeJumiaOrders(orders: JumiaReportOrder[]) {
    const statusCounts: Record<string, number> = {}
    let revenue = 0
    let excluded = 0

    for (const order of orders) {
        const status = getJumiaOrderStatus(order)
        statusCounts[status] = (statusCounts[status] || 0) + 1

        if (isJumiaRevenueOrder(order)) revenue += getJumiaOrderAmount(order)
        else excluded++
    }

    return {
        total: orders.length,
        valid: orders.length - excluded,
        excluded,
        revenue,
        statusCounts
    }
}
