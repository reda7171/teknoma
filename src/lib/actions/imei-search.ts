'use server'

import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/actions/auth'

export interface ImeiSearchResult {
    serialNumber: string
    source: 'UNIT_RECORD' | 'ORDER_ITEM' | 'CATALOG_BARCODE'
    status: 'AVAILABLE' | 'SOLD' | 'DEFECTIVE'
    notes?: string | null
    warranty: {
        status: 'ACTIVE' | 'EXPIRED' | 'NOT_STARTED' | 'DEFECTIVE'
        durationMonths: number
        startDate: string | null
        endDate: string | null
        daysRemaining?: number
    }
    product: {
        id: string
        title: string
        author: string
        image: string
        price: number
        stock: number
        category?: string | null
        isbn?: string | null
    } | null
    order: {
        id: string
        fullName: string
        phone: string
        city: string
        address: string
        total: number
        status: string
        createdAt: string
        invoiceNumber?: string | null
        paymentMethod?: string | null
    } | null
}

function calculateWarranty(startDateInput: Date | null, unitStatus: string) {
    if (unitStatus === 'DEFECTIVE') {
        return {
            status: 'DEFECTIVE' as const,
            durationMonths: 12,
            startDate: startDateInput ? startDateInput.toISOString() : null,
            endDate: null,
            daysRemaining: 0
        }
    }

    if (!startDateInput) {
        return {
            status: 'NOT_STARTED' as const,
            durationMonths: 12,
            startDate: null,
            endDate: null,
            daysRemaining: 365
        }
    }

    const start = new Date(startDateInput)
    const end = new Date(start)
    end.setFullYear(end.getFullYear() + 1) // 12 months

    const now = new Date()
    const diffMs = end.getTime() - now.getTime()
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

    const status = daysRemaining > 0 ? ('ACTIVE' as const) : ('EXPIRED' as const)

    return {
        status,
        durationMonths: 12,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        daysRemaining: Math.max(0, daysRemaining)
    }
}

export async function searchImeiQuick(rawQuery: string): Promise<ImeiSearchResult[]> {
    await verifyAdmin()
    const query = rawQuery?.trim()
    if (!query || query.length < 2) return []

    const results: ImeiSearchResult[] = []
    const seenSerials = new Set<string>()

    // 1. Recherche dans les numéros de série unitaires (ProductSerialNumber)
    const serialUnits = await prisma.productSerialNumber.findMany({
        where: {
            serialNumber: { contains: query }
        },
        include: {
            product: {
                select: {
                    id: true,
                    title: true,
                    author: true,
                    image: true,
                    price: true,
                    stock: true,
                    category: true,
                    isbn: true
                }
            }
        },
        take: 10
    })

    // Récupérer les commandes associées pour les unités vendues
    const orderIds = serialUnits.map(u => u.orderId).filter(Boolean) as string[]
    const linkedOrders = orderIds.length > 0
        ? await prisma.order.findMany({
            where: { id: { in: orderIds } },
            select: {
                id: true,
                fullName: true,
                phone: true,
                city: true,
                address: true,
                total: true,
                status: true,
                createdAt: true,
                invoiceNumber: true,
                paymentMethod: true
            }
        })
        : []

    const orderMap = new Map(linkedOrders.map(o => [o.id, o]))

    for (const unit of serialUnits) {
        seenSerials.add(unit.serialNumber.toLowerCase())
        const orderData = unit.orderId ? orderMap.get(unit.orderId) : null
        const startDate = unit.soldAt || (orderData ? orderData.createdAt : null)

        results.push({
            serialNumber: unit.serialNumber,
            source: 'UNIT_RECORD',
            status: unit.status as any,
            notes: unit.notes,
            warranty: calculateWarranty(startDate, unit.status),
            product: unit.product,
            order: orderData
                ? {
                    ...orderData,
                    createdAt: orderData.createdAt.toISOString()
                }
                : null
        })
    }

    // 2. Recherche dans les lignes de commande (OrderItem) ayant un serialNumber
    const orderItems = await prisma.orderItem.findMany({
        where: {
            serialNumber: { contains: query }
        },
        include: {
            order: {
                select: {
                    id: true,
                    fullName: true,
                    phone: true,
                    city: true,
                    address: true,
                    total: true,
                    status: true,
                    createdAt: true,
                    invoiceNumber: true,
                    paymentMethod: true
                }
            },
            book: {
                select: {
                    id: true,
                    title: true,
                    author: true,
                    image: true,
                    price: true,
                    stock: true,
                    category: true,
                    isbn: true
                }
            }
        },
        take: 10
    })

    for (const item of orderItems) {
        if (!item.serialNumber) continue
        if (seenSerials.has(item.serialNumber.toLowerCase())) continue
        seenSerials.add(item.serialNumber.toLowerCase())

        const orderData = item.order
        const startDate = orderData ? orderData.createdAt : null

        results.push({
            serialNumber: item.serialNumber,
            source: 'ORDER_ITEM',
            status: 'SOLD',
            notes: 'Attribué lors de la préparation de commande',
            warranty: calculateWarranty(startDate, 'SOLD'),
            product: item.book,
            order: orderData
                ? {
                    ...orderData,
                    createdAt: orderData.createdAt.toISOString()
                }
                : null
        })
    }

    // 3. Recherche dans le code-barres / IMEI principal du catalogue (Book.isbn)
    const booksWithIsbn = await prisma.book.findMany({
        where: {
            isbn: { contains: query }
        },
        select: {
            id: true,
            title: true,
            author: true,
            image: true,
            price: true,
            stock: true,
            category: true,
            isbn: true
        },
        take: 5
    })

    for (const b of booksWithIsbn) {
        if (!b.isbn) continue
        if (seenSerials.has(b.isbn.toLowerCase())) continue
        seenSerials.add(b.isbn.toLowerCase())

        results.push({
            serialNumber: b.isbn,
            source: 'CATALOG_BARCODE',
            status: b.stock > 0 ? 'AVAILABLE' : 'SOLD',
            notes: 'Code-barres / IMEI référence modèle',
            warranty: calculateWarranty(null, 'AVAILABLE'),
            product: b,
            order: null
        })
    }

    return results
}
