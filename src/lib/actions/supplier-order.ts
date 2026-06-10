'use server'

import { prisma } from '@/lib/prisma'

export type SupplierBookRecommendation = {
  id: string
  title: string
  author: string
  category: string | null
  price: number
  costPrice: number
  stock: number
  totalSold: number
  soldLast30Days: number
  soldLast7Days: number
  dailySales: number       // sales_last_30_days / 30
  daysOfStock: number      // stock / daily_sales
  revenueGenerated: number
  isBestSeller: boolean
  status: 'URGENT' | 'WARNING' | 'OK'
  recommendedQty: number   // max(0, (daily_sales * 30) - stock)
  estimatedRevenue: number
  image: string
}

/**
 * Analyse stock + ventes → recommandations commande fournisseur
 *
 * Formules exactes :
 *   daily_sales            = sales_last_30_days / 30
 *   days_of_stock          = stock / daily_sales
 *   recommended_order_qty  = max(0, (daily_sales * 30) - stock)
 *
 * Statuts :
 *   days_of_stock < 7   → URGENT
 *   7 ≤ days < 20       → WARNING
 *   days ≥ 20           → OK
 *
 * Tri final : URGENT → WARNING → OK
 */
export async function getSupplierOrderRecommendations(
  periodeJours: number = 30
): Promise<SupplierBookRecommendation[]> {
  const dateDebut = new Date()
  dateDebut.setDate(dateDebut.getDate() - periodeJours)

  const dateDerniere7Jours = new Date()
  dateDerniere7Jours.setDate(dateDerniere7Jours.getDate() - 7)

  const books = await prisma.book.findMany({
    where: { active: true },
    select: {
      id: true,
      title: true,
      author: true,
      category: true,
      price: true,
      costPrice: true,
      stock: true,
      isBestSeller: true,
      image: true,
      orderItems: {
        where: {
          order: {
            status: { notIn: ['CANCELLED', 'RETURNED'] }
          }
        },
        select: {
          quantity: true,
          price: true,
          order: {
            select: { createdAt: true }
          }
        }
      }
    }
  })

  const statusOrder = { URGENT: 0, WARNING: 1, OK: 2 }

  const recommendations: SupplierBookRecommendation[] = books
    .map((book) => {
      // Ventes totales
      const totalSold = book.orderItems.reduce((s, i) => s + i.quantity, 0)

      // Ventes sur la période choisie (défaut 30j)
      const soldLast30Days = book.orderItems
        .filter(i => new Date(i.order.createdAt) >= dateDebut)
        .reduce((s, i) => s + i.quantity, 0)

      // Ventes 7 derniers jours (informatif)
      const soldLast7Days = book.orderItems
        .filter(i => new Date(i.order.createdAt) >= dateDerniere7Jours)
        .reduce((s, i) => s + i.quantity, 0)

      const revenueGenerated = book.orderItems.reduce(
        (s, i) => s + i.quantity * i.price, 0
      )

      // ── Formules principales ───────────────────────────
      const dailySales = parseFloat((soldLast30Days / 30).toFixed(2))

      // Si aucune vente : days_of_stock = Infinity (pas de risque de rupture)
      const daysOfStock = dailySales > 0
        ? Math.round(book.stock / dailySales)
        : 9999

      // recommended_order_quantity = max(0, (daily_sales * 30) - stock)
      const recommendedQty = Math.max(
        0,
        Math.ceil(dailySales * 30 - book.stock)
      )
      // ─────────────────────────────────────────────────

      // Règles de décision
      let status: SupplierBookRecommendation['status']
      if (daysOfStock < 7) status = 'URGENT'
      else if (daysOfStock < 20) status = 'WARNING'
      else status = 'OK'

      // Cas rupture totale avec ventes → toujours URGENT
      if (book.stock === 0 && soldLast30Days > 0) status = 'URGENT'

      const estimatedRevenue = recommendedQty * book.price

      return {
        id: book.id,
        title: book.title,
        author: book.author,
        category: book.category,
        price: book.price,
        costPrice: book.costPrice,
        stock: book.stock,
        totalSold,
        soldLast30Days,
        soldLast7Days,
        dailySales,
        daysOfStock: daysOfStock === 9999 ? 999 : daysOfStock,
        revenueGenerated,
        isBestSeller: book.isBestSeller,
        status,
        recommendedQty,
        estimatedRevenue,
        image: book.image
      }
    })
    // Tri : URGENT → WARNING → OK, puis par ventes 30j décroissant
    .sort((a, b) => {
      const diff = statusOrder[a.status] - statusOrder[b.status]
      return diff !== 0 ? diff : b.soldLast30Days - a.soldLast30Days
    })

  return recommendations
}

/**
 * Stats globales du stock
 */
export async function getStockStats() {
  const books = await prisma.book.findMany({
    where: { active: true },
    select: { stock: true, price: true, costPrice: true, isBestSeller: true }
  })

  return {
    totalBooks: books.length,
    outOfStock: books.filter(b => b.stock === 0).length,
    lowStock: books.filter(b => b.stock > 0 && b.stock <= 5).length,
    totalStockValue: books.reduce((s, b) => s + b.stock * b.costPrice, 0),
    totalRetailValue: books.reduce((s, b) => s + b.stock * b.price, 0),
    bestSellers: books.filter(b => b.isBestSeller).length,
  }
}
