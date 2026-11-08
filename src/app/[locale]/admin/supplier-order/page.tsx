import { requirePageRole } from '@/lib/page-authorization'
import { getSupplierOrderRecommendations, getStockStats } from "@/lib/server/supplier-order"
import { AlertTriangle, Package, TrendingUp, DollarSign, ShoppingCart, ArrowUp } from 'lucide-react'
import SupplierOrderExport from '@/components/admin/SupplierOrderExport'
import CopyTitlesButton from '@/components/admin/CopyTitlesButton'
import Link from 'next/link'
import { normalizeImage } from '@/lib/utils'

export const metadata = {
  title: 'Commande Fournisseur | Admin Riwaya',
}

export default async function SupplierOrderPage({
  searchParams,
  params,
}: {
  searchParams: Promise<{ periode?: string; filtre?: string }>
  params: Promise<{ locale: string }>
}) {
    await requirePageRole(["ADMIN","MANAGER"])

  const [sp, p] = await Promise.all([searchParams, params])
  const lang = p.locale
  const periode = parseInt(sp.periode || '30')
  const filtre = sp.filtre || 'TOUS'

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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 md:pb-6 border-b border-gray-100">
        <div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-black tracking-tighter mb-2 italic">
            Réapprovisionnement<span className="text-amber-500">.</span>
          </h1>
          <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[9px] md:text-[10px]">
            Analyse stock & ventes → commande fournisseur optimale
          </p>
        </div>
        <div className="w-full md:w-auto flex justify-start md:justify-end">
          <SupplierOrderExport recommendations={toOrder} />
        </div>
      </div>

      {/* Stats globales */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        {[
          { label: 'Titres actifs', value: stats.totalBooks, icon: Package, color: 'bg-gray-100', alert: false },
          { label: 'Rupture stock', value: stats.outOfStock, icon: AlertTriangle, color: 'bg-red-100', alert: stats.outOfStock > 0 },
          { label: 'Stock ≤ 5', value: stats.lowStock, icon: ArrowUp, color: 'bg-orange-100', alert: stats.lowStock > 0 },
          { label: 'Best-sellers', value: stats.bestSellers, icon: TrendingUp, color: 'bg-amber-100', alert: false },
          { label: 'Valeur (coût)', value: `${stats.totalStockValue.toFixed(0)} درهم`, icon: DollarSign, color: 'bg-blue-100', alert: false },
          { label: 'Valeur (vente)', value: `${stats.totalRetailValue.toFixed(0)} درهم`, icon: ShoppingCart, color: 'bg-green-100', alert: false },
        ].map((s, i) => (
          <div key={i} className={`${s.color} rounded-2xl md:rounded-3xl p-4 md:p-5 border flex flex-col items-start ${s.alert ? 'border-red-300 ring-2 ring-red-200' : 'border-transparent'}`}>
            <s.icon className={`w-4 h-4 md:w-5 md:h-5 mb-2 ${s.alert ? 'text-red-600' : 'text-gray-600'}`} />
            <p className={`text-lg md:text-xl font-black ${s.alert ? 'text-red-700' : 'text-black'}`}>{s.value}</p>
            <p className="text-[8px] md:text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Récapitulatif commande */}
      {toOrder.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl md:rounded-3xl p-5 md:p-6 flex flex-col md:flex-row gap-4 md:gap-6 items-start md:items-center justify-between">
          <div>
            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-amber-600 mb-1">Commande recommandée</p>
            <p className="text-xl md:text-2xl font-black text-black">{toOrder.length} titres · {totalQty} exemplaires</p>
            <p className="text-xs md:text-sm text-gray-600 font-bold mt-1 flex flex-col sm:flex-row sm:gap-2">
              <span>Coût estimé : <span className="text-red-600 font-black">{totalCost.toFixed(2)} درهم</span></span>
              <span className="hidden sm:inline">{' · '}</span>
              <span>Revenu potentiel : <span className="text-green-600 font-black">{totalRevenue.toFixed(2)} درهم</span></span>
            </p>
          </div>
          <div className="text-left md:text-right w-full md:w-auto pt-4 md:pt-0 border-t border-amber-200/50 md:border-0">
            <p className="text-[9px] md:text-xs font-black text-amber-700 uppercase tracking-widest">Marge estimée</p>
            <p className="text-4xl md:text-5xl font-black text-green-600">{marge}%</p>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center w-full">
          <div className="w-full xl:w-auto overflow-x-auto no-scrollbar pb-1">
            <div className="flex gap-2 p-1.5 bg-gray-100 rounded-[2rem] shadow-inner min-w-max">
              {(['TOUS', 'URGENT', 'WARNING', 'OK'] as const).map((f) => (
                <a
                  key={f}
                  href={`?filtre=${f}&periode=${periode}`}
                  className={`px-4 md:px-5 py-2 md:py-2.5 rounded-[1.5rem] text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all flex items-center ${
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
          </div>

          {(filtre === 'URGENT' || filtre === 'WARNING') && (
            <div className="w-full xl:w-auto">
              <CopyTitlesButton titles={filtered.map(r => r.title)} />
            </div>
          )}

          <div className="flex gap-2 items-center xl:ml-auto w-full xl:w-auto justify-between xl:justify-end border-t xl:border-0 border-gray-100 pt-4 xl:pt-0 mt-2 xl:mt-0">
            <span className="text-[9px] md:text-[10px] font-black uppercase text-gray-400">Période analyse</span>
            <div className="flex gap-2">
              {[7, 30, 90].map(p => (
                <a
                  key={p}
                  href={`?filtre=${filtre}&periode=${p}`}
                  className={`px-3 md:px-4 py-1.5 md:py-2 rounded-full text-[9px] md:text-[10px] font-black border transition-all ${
                    periode === p ? 'bg-black text-white border-black' : 'border-gray-200 text-gray-500 hover:border-black'
                  }`}
                >
                  {p}j
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Formule affichée */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 text-center">
        {[
          { formula: 'Ventes 30j ÷ 30', result: 'daily_sales', color: 'bg-blue-50 border-blue-100' },
          { formula: 'Stock ÷ daily_sales', result: 'days_of_stock', color: 'bg-amber-50 border-amber-100' },
          { formula: 'max(0, daily_sales × 30 − stock)', result: 'qté à commander', color: 'bg-green-50 border-green-100' },
        ].map((f, i) => (
          <div key={i} className={`${f.color} border rounded-2xl px-4 md:px-6 py-3 md:py-4`}>
            <p className="font-mono text-[10px] md:text-xs text-gray-500">{f.formula}</p>
            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-gray-700 mt-1">→ {f.result}</p>
          </div>
        ))}
      </div>

      {/* Vue Mobile (Cartes Premium) */}
      <div className="md:hidden space-y-3">

        {/* Bottom bar récapitulatif sticky mobile */}
        {toOrder.length > 0 && (
          <div className="sticky top-0 z-20 -mx-4 px-4 py-3 bg-white/95 backdrop-blur-sm border-b border-amber-100 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-amber-600">Commande</p>
                <p className="text-base font-black text-black">{toOrder.length} titres · {totalQty} ex.</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Marge</p>
                <p className="text-2xl font-black text-green-600">{marge}%</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Coût</p>
                <p className="text-sm font-black text-red-600">{totalCost.toFixed(0)} درهم</p>
              </div>
            </div>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="bg-white rounded-[2rem] p-8 text-center border border-gray-100 shadow-sm">
            <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 font-black uppercase tracking-widest text-[9px]">Aucun produit</p>
          </div>
        ) : filtered.map(book => {
          const sc = statusConfig[book.status]
          const isUrgent = book.status === 'URGENT'
          const isWarning = book.status === 'WARNING'
          return (
            <div
              key={book.id}
              className={`bg-white rounded-[1.5rem] border shadow-sm overflow-hidden ${
                isUrgent ? 'border-red-200' : isWarning ? 'border-orange-100' : 'border-gray-100'
              }`}
            >
              {/* Bande colorée urgence */}
              {(isUrgent || isWarning) && (
                <div className={`h-1 w-full ${isUrgent ? 'bg-red-500' : 'bg-orange-400'}`} />
              )}

              <div className="p-4">
                {/* Ligne principale : image + titre + badge */}
                <div className="flex gap-3 items-start mb-3">
                  <div className="w-12 h-16 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 shadow-sm">
                    {book.image && (
                      <img
                        src={normalizeImage(book.image)}
                        alt={book.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <Link href={`/${lang}/admin/books/${book.id}/edit`} className="font-black text-black text-sm leading-tight line-clamp-2 flex-1 hover:text-blue-600 transition-colors">
                        {book.isBestSeller && <span className="text-amber-500 mr-1">★</span>}
                        {book.title}
                      </Link>
                      {/* Badge statut compact */}
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase shrink-0 ${sc.bg} ${sc.text} border ${sc.border}`}>
                        <span className={`w-1 h-1 rounded-full ${sc.dot} ${isUrgent ? 'animate-pulse' : ''}`} />
                        {sc.label}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 font-bold italic truncate">{book.author}</p>
                  </div>
                </div>

                {/* Métriques en grille 4 colonnes compacte */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  <div className="bg-gray-50 rounded-xl p-2 text-center">
                    <p className="text-[7px] font-black text-gray-400 uppercase tracking-wider mb-0.5">Stock</p>
                    <p className={`text-base font-black leading-none ${book.stock === 0 ? 'text-red-600' : book.stock <= 5 ? 'text-orange-500' : 'text-black'}`}>
                      {book.stock}
                    </p>
                    <p className="text-[8px] text-amber-600 font-black mt-1 bg-amber-50 rounded-full px-1 py-0.5 inline-block border border-amber-100">Coût: {(book.stock * book.costPrice).toFixed(0)} درهم</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-2 text-center">
                    <p className="text-[7px] font-black text-gray-400 uppercase tracking-wider mb-0.5">Ventes</p>
                    <p className="text-base font-black text-black leading-none">{book.soldLast30Days}</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-2 text-center">
                    <p className="text-[7px] font-black text-blue-400 uppercase tracking-wider mb-0.5">j/vente</p>
                    <p className="text-xs font-black text-blue-700 leading-none">{book.dailySales.toFixed(1)}</p>
                  </div>
                  <div className={`rounded-xl p-2 text-center ${
                    book.daysOfStock < 7 ? 'bg-red-50' : book.daysOfStock < 20 ? 'bg-orange-50' : 'bg-green-50'
                  }`}>
                    <p className="text-[7px] font-black text-gray-400 uppercase tracking-wider mb-0.5">Jours</p>
                    <p className={`text-xs font-black leading-none ${
                      book.daysOfStock < 7 ? 'text-red-600' : book.daysOfStock < 20 ? 'text-orange-600' : 'text-green-600'
                    }`}>
                      {book.daysOfStock === 999 ? '∞' : `${book.daysOfStock}j`}
                    </p>
                  </div>
                </div>

                {/* Footer : revenu + quantité à commander */}
                {book.recommendedQty > 0 && (
                  <div className={`flex items-center justify-between pt-3 border-t ${isUrgent ? 'border-red-100' : 'border-gray-100'}`}>
                    <div>
                      <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Revenu estimé</p>
                      <p className="font-black text-green-600 text-sm">{book.estimatedRevenue.toFixed(0)} درهم</p>
                      <p className="text-[9px] text-gray-400">coût: {(book.recommendedQty * book.costPrice).toFixed(0)} درهم</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">À commander</p>
                      <span className={`flex items-center justify-center w-12 h-12 rounded-2xl font-black text-lg shadow-lg ${
                        isUrgent ? 'bg-red-600 text-white' : 'bg-black text-white'
                      }`}>
                        {book.recommendedQty}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>


      {/* Tableau (Desktop) */}
      <div className="hidden md:block bg-white rounded-2xl md:rounded-[3rem] border border-gray-100 shadow-xl shadow-black/5 overflow-hidden">
        <div className="overflow-auto custom-scrollbar max-h-[75vh]">
          <table className="w-full text-sm text-left whitespace-nowrap md:whitespace-normal min-w-[800px] relative">
            <thead className="bg-white/95 backdrop-blur-sm text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 sticky top-0 z-20 shadow-sm">
              <tr>
                <th className="px-6 py-5">Livre</th>
                <th className="px-6 py-5 text-center">Stock / Valeur</th>
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
                              src={normalizeImage(book.image)}
                              alt={book.title}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <Link href={`/${lang}/admin/books/${book.id}/edit`} className="font-black text-black text-xs leading-tight max-w-[180px] line-clamp-2 hover:text-blue-600 transition-colors block">
                            {book.isBestSeller && <span className="text-amber-500 mr-1">★</span>}
                            {book.title}
                          </Link>
                          <p className="text-[10px] text-gray-400 font-bold italic mt-0.5 truncate">{book.author}</p>
                        </div>
                      </div>
                    </td>

                    {/* Stock */}
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className={`text-lg font-black ${book.stock === 0 ? 'text-red-600' : book.stock <= 5 ? 'text-orange-500' : 'text-black'}`}>
                          {book.stock}
                        </span>
                        <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full mt-1 border border-amber-100">Coût: {(book.stock * book.costPrice).toFixed(0)} درهم</span>
                      </div>
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
                          <p className="font-black text-green-600">{book.estimatedRevenue.toFixed(0)} درهم</p>
                          <p className="text-[9px] text-gray-400 font-bold">coût: {(book.recommendedQty * book.costPrice).toFixed(0)} درهم</p>
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
