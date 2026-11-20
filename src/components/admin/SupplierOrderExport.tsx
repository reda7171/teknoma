'use client'

import { type SupplierBookRecommendation } from '@/lib/actions/supplier-order'
import { FileSpreadsheet } from 'lucide-react'

export default function SupplierOrderExport({
  recommendations,
}: {
  recommendations: SupplierBookRecommendation[]
}) {
  const handleExportExcel = () => {
    const headers = [
      'Titre du livre', 'Auteur', 'Catégorie', 'Stock actuel', 'Ventes (30j)',
      'Ventes/jour', 'Jours de stock', 'Statut', 'Qté recommandée',
      'Prix vente (MAD)', 'Prix revient (MAD)', 'Revenu estimé (MAD)', 'Coût estimé (MAD)'
    ]

    const rows = recommendations.map(r => `
      <tr>
        <td style="font-weight: bold;">${r.title}</td>
        <td>${r.author || '-'}</td>
        <td style="text-align: center;">${r.category || '-'}</td>
        <td style="text-align: center; mso-number-format:'0';">${r.stock}</td>
        <td style="text-align: center; mso-number-format:'0';">${r.soldLast30Days}</td>
        <td style="text-align: right; mso-number-format:'0.00';">${r.dailySales.toFixed(2)}</td>
        <td style="text-align: center;">${r.daysOfStock === 999 ? 'Infini' : r.daysOfStock}</td>
        <td style="text-align: center; font-weight: bold;">${r.status}</td>
        <td style="text-align: center; font-weight: bold; background-color: #ecfdf5; mso-number-format:'0';">${r.recommendedQty}</td>
        <td style="text-align: right; mso-number-format:'0.00';">${Number(r.price).toFixed(2)}</td>
        <td style="text-align: right; mso-number-format:'0.00';">${Number(r.costPrice).toFixed(2)}</td>
        <td style="text-align: right; mso-number-format:'0.00';">${r.estimatedRevenue.toFixed(2)}</td>
        <td style="text-align: right; font-weight: bold; mso-number-format:'0.00';">${(r.recommendedQty * r.costPrice).toFixed(2)}</td>
      </tr>
    `).join('')

    const excelTemplate = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 11pt; }
          table { border-collapse: collapse; width: 100%; }
          th { background-color: #1e293b; color: #ffffff; font-weight: bold; padding: 10px 8px; border: 1px solid #0f172a; text-align: center; }
          td { padding: 8px; border: 1px solid #e2e8f0; vertical-align: middle; }
          tr:nth-child(even) td { background-color: #f8fafc; }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
      </html>`

    const blob = new Blob([excelTemplate], { type: 'application/vnd.ms-excel;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `commande-fournisseur-${new Date().toISOString().slice(0, 10)}.xls`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (recommendations.length === 0) return null

  return (
    <button
      onClick={handleExportExcel}
      className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white font-black text-[10px] uppercase tracking-widest rounded-full hover:bg-gray-800 transition-all shadow-xl hover:-translate-y-0.5 cursor-pointer"
      title="Exporter la commande fournisseur en format Excel (.xls)"
    >
      <FileSpreadsheet className="w-4 h-4" />
      Exporter Excel ({recommendations.length} titres)
    </button>
  )
}
