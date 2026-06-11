import { getSupplierOrderRecommendations, getStockStats } from '@/lib/actions/supplier-order'
import { AlertTriangle, Package, TrendingUp, DollarSign, ShoppingCart, ArrowUp } from 'lucide-react'
import SupplierOrderExport from '@/components/admin/SupplierOrderExport'
import CopyTitlesButton from '@/components/admin/CopyTitlesButton'

export const metadata = {
  title: 'Commande Fournisseur | Admin Riwaya',
}

export default async function SupplierOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string; filtre?: string }>
}) {
  const params = await searchParams
  const periode = parseInt(params.periode || '30')
  const filtre = params.filtre || 'TOUS'

  const [recommendations, stats] = await Promise.all([
    getSupplierOrderRecommendations(periode),
    getStockStats()
  ])

  const filtered = filtre === 'TOUS'
    ? recommendations
    : recommendations.filter(r => r.status === filtre)

  // Récapitulatif commande : seulement les produits avec qté > 0
  const toOrder = filtered.filter(r => r.recommendedQty > 0)
  const totalQty = toOrder.reduce((s, r) => s + r.recommendedQty, 0)
  const totalCost = toOrder.reduce((s, r) => s + r.recommendedQty * r.costPrice, 0)
  const totalRevenue = toOrder.reduce((s, r) => s + r.estimatedRevenue, 0)
  const marge = totalCost > 0 ? ((totalRevenue - totalCost) / totalCost * 100).toFixed(0) : '0'

  const statusConfig = {
    URGENT:  { label: 'Urgent',   bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-200',    dot: 'bg-red-500'    },
    WARNING: { label: 'Warning',  bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
    OK:      { label: 'OK',       bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-200',  dot: 'bg-green-500'  },
  }

  return (
    <div className="space-y-10">

      {/* En-tête */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-100">
        <div>
          <h1 className="text-5xl lg:text-6xl font-black text-black tracking-tighter mb-2 italic">
            Réapprovisionnement<span className="text-amber-500">.</span>
          </h1>
          <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px]">
            Analyse stock & ventes → commande fournisseur optimale
          </p>
        </div>
        <SupplierOrderExport recommendations={toOrder} />
      </div>

      {/* Stats globales */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Titres actifs', value: stats.totalBooks, icon: Package, color: 'bg-gray-100', alert: false },
          { label: 'Rupture stock', value: stats.outOfStock, icon: AlertTriangle, color: 'bg-red-100', alert: stats.outOfStock > 0 },
          { label: 'Stock ≤ 5', value: stats.lowStock, icon: ArrowUp, color: 'bg-orange-100', alert: stats.lowStock > 0 },
          { label: 'Best-sellers', value: stats.bestSellers, icon: TrendingUp, color: 'bg-amber-100', alert: false },
          { label: 'Valeur (coût)', value: `${stats.totalStockValue.toFixed(0)} MAD`, icon: DollarSign, color: 'bg-blue-100', alert: false },
          { label: 'Valeur (vente)', value: `${stats.totalRetailValue.toFixed(0)} MAD`, icon: ShoppingCart, color: 'bg-green-100', alert: false },
        ].map((s, i) => (
          <div key={i} className={`${s.color} rounded-3xl p-5 border ${s.alert ? 'border-red-300 ring-2 ring-red-200' : 'border-transparent'}`}>
            <s.icon className={`w-5 h-5 mb-2 ${s.alert ? 'text-red-600' : 'text-gray-600'}`} />
            <p className={`text-xl font-black ${s.alert ? 'text-red-700' : 'text-black'}`}>{s.value}</p>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Récapitulatif commande */}
      {toOrder.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-6 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-1">Commande recommandée</p>
            <p className="text-2xl font-black text-black">{toOrder.length} titres · {totalQty} exemplaires</p>
            <p className="text-sm text-gray-600 font-bold mt-1">
              Coût estimé : <span className="text-red-600 font-black">{totalCost.toFixed(2)} MAD</span>
              {' · '}
              Revenu potentiel : <span className="text-green-600 font-black">{totalRevenue.toFixed(2)} MAD</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-black text-amber-700 uppercase tracking-widest">Marge estimée</p>
            <p className="text-5xl font-black text-green-600">{marge}%</p>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="flex gap-2 p-1.5 bg-gray-100 rounded-[2rem] shadow-inner">
          {(['TOUS', 'URGENT', 'WARNING', 'OK'] as const).map((f) => (
            <a
              key={f}
              href={`?filtre=${f}&periode=${periode}`}
              className={`px-5 py-2.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${
                filtre === f ? 'bg-white text-black shadow-md' : 'text-gray-500 hover:text-black'
              }`}
            >
              {f}
              {f !== 'TOUS' && (
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-white text-[8px] ${
                  f === 'URGENT' ? 'bg-red-500' : f === 'WARNING' ? 'bg-orange-400' : 'bg-green-500'
                }`}>
                  {recommendations.filter(r => r.status === f).length}
                </span>
              )}
            </a>
          ))}
        </div>

        {(filtre === 'URGENT' || filtre === 'WARNING') && (
          <CopyTitlesButton titles={filtered.map(r => r.title)} />
        )}

        <div className="flex gap-2 items-center ml-auto">
          <span className="text-[10px] font-black uppercase text-gray-400">Période analyse</span>
          {[7, 30, 90].map(p => (
            <a
              key={p}
              href={`?filtre=${filtre}&periode=${p}`}
              className={`px-4 py-2 rounded-full text-[10px] font-black border transition-all ${
                periode === p ? 'bg-black text-white border-black' : 'border-gray-200 text-gray-500 hover:border-black'
              }`}
            >
              {p}j
            </a>
          ))}
        </div>
      </div>

      {/* Formule affichée */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
        {[
          { formula: 'Ventes 30j ÷ 30', result: 'daily_sales', color: 'bg-blue-50 border-blue-100' },
          { formula: 'Stock ÷ daily_sales', result: 'days_of_stock', color: 'bg-amber-50 border-amber-100' },
          { formula: 'max(0, daily_sales × 30 − stock)', result: 'qté à commander', color: 'bg-green-50 border-green-100' },
        ].map((f, i) => (
          <div key={i} className={`${f.color} border rounded-2xl px-6 py-4`}>
            <p className="font-mono text-xs text-gray-500">{f.formula}</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-700 mt-1">→ {f.result}</p>
          </div>
        ))}
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-[3rem] border border-gray-100 shadow-xl shadow-black/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50/50 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
              <tr>
                <th className="px-6 py-5">Livre</th>
                <th className="px-6 py-5 text-center">Stock</th>
                <th className="px-6 py-5 text-center">Ventes 30j</th>
                <th className="px-6 py-5 text-center">daily_sales</th>
                <th className="px-6 py-5 text-center">days_of_stock</th>
                <th className="px-6 py-5 text-center">Statut</th>
                <th className="px-6 py-5 text-center">Qté à commander</th>
                <th className="px-6 py-5 text-right">Revenu estimé</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-24 text-center">
                    <Package className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">Aucun produit</p>
                  </td>
                </tr>
              ) : filtered.map((book) => {
                const sc = statusConfig[book.status]
                const isUrgent = book.status === 'URGENT'
                return (
                  <tr key={book.id} className={`hover:bg-gray-50/30 transition-colors group ${isUrgent ? 'bg-red-50/40' : ''}`}>

                    {/* Livre */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-12 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 shadow-sm">
                          {book.image && (
                            <img
                              src={book.image.startsWith('data:') || book.image.startsWith('http') ? book.image : `/uploads/${book.id}`}
                              alt={book.title}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-black text-xs leading-tight max-w-[180px] line-clamp-2">
                            {book.isBestSeller && <span className="text-amber-500 mr-1">★</span>}
                            {book.title}
                          </p>
                          <p className="text-[10px] text-gray-400 font-bold italic mt-0.5 truncate">{book.author}</p>
                        </div>
                      </div>
                    </td>

                    {/* Stock */}
                    <td className="px-6 py-4 text-center">
                      <span className={`text-lg font-black ${book.stock === 0 ? 'text-red-600' : book.stock <= 5 ? 'text-orange-500' : 'text-black'}`}>
                        {book.stock}
                      </span>
                    </td>

                    {/* Ventes 30j */}
                    <td className="px-6 py-4 text-center">
                      <span className="font-black text-black">{book.soldLast30Days}</span>
                    </td>

                    {/* daily_sales */}
                    <td className="px-6 py-4 text-center">
                      <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-lg font-bold">
                        {book.dailySales.toFixed(2)}
                      </span>
                    </td>

                    {/* days_of_stock */}
                    <td className="px-6 py-4 text-center">
                      <span className={`font-mono text-xs px-2 py-1 rounded-lg font-bold ${
                        book.daysOfStock < 7 ? 'bg-red-100 text-red-700' :
                        book.daysOfStock < 20 ? 'bg-orange-100 text-orange-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {book.daysOfStock === 999 ? '∞' : `${book.daysOfStock}j`}
                      </span>
                    </td>

                    {/* Statut */}
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${sc.bg} ${sc.text} border ${sc.border}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} ${isUrgent ? 'animate-pulse' : ''}`} />
                        {sc.label}
                      </span>
                    </td>

                    {/* Qté recommandée */}
                    <td className="px-6 py-4 text-center">
                      {book.recommendedQty > 0 ? (
                        <span className={`inline-flex items-center justify-center w-10 h-10 rounded-2xl font-black text-sm shadow-lg ${
                          isUrgent ? 'bg-red-600 text-white' : 'bg-black text-white'
                        }`}>
                          {book.recommendedQty}
                        </span>
                      ) : (
                        <span className="text-gray-300 font-bold text-lg">—</span>
                      )}
                    </td>

                    {/* Revenu estimé */}
                    <td className="px-6 py-4 text-right">
                      {book.recommendedQty > 0 ? (
                        <div>
                          <p className="font-black text-green-600">{book.estimatedRevenue.toFixed(0)} MAD</p>
                          <p className="text-[9px] text-gray-400 font-bold">coût: {(book.recommendedQty * book.costPrice).toFixed(0)} MAD</p>
                        </div>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
