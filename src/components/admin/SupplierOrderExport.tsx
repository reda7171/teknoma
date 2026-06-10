'use client'

import { type SupplierBookRecommendation } from '@/lib/actions/supplier-order'
import { Download } from 'lucide-react'

export default function SupplierOrderExport({
  recommendations,
}: {
  recommendations: SupplierBookRecommendation[]
}) {
  const handleExportCSV = () => {
    const headers = ['Titre', 'Auteur', 'Catégorie', 'Stock', 'Ventes 30j', 'daily_sales', 'days_of_stock', 'Statut', 'Qté à commander', 'Prix vente', 'Prix revient', 'Revenu estimé', 'Coût estimé']
    const rows = recommendations.map(r => [
      `"${r.title}"`,
      `"${r.author}"`,
      r.category || '',
      r.stock,
      r.soldLast30Days,
      r.dailySales.toFixed(2),
      r.daysOfStock === 999 ? 'Infini' : r.daysOfStock,
      r.status,
      r.recommendedQty,
      r.price,
      r.costPrice,
      r.estimatedRevenue.toFixed(2),
      (r.recommendedQty * r.costPrice).toFixed(2),
    ])

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `commande-fournisseur-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (recommendations.length === 0) return null

  return (
    <button
      onClick={handleExportCSV}
      className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white font-black text-[10px] uppercase tracking-widest rounded-full hover:bg-gray-800 transition-all shadow-xl hover:-translate-y-0.5"
    >
      <Download className="w-4 h-4" />
      Exporter CSV ({recommendations.length} titres)
    </button>
  )
}
