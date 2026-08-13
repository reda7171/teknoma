import { getCashflowData } from '@/lib/actions/cashflow'
import { TrendingUp, TrendingDown, Wallet, Clock, AlertTriangle, ArrowUpRight, ArrowDownRight, ShoppingBag } from 'lucide-react'
import CashflowAddButton from '@/components/admin/CashflowAddButton'
import { DeleteExpenseButton } from '@/components/admin/CashflowActions'

export const metadata = { title: 'Cashflow | Admin Riwaya' }

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
    BOOKS_PURCHASE: { label: 'Achat livres', color: 'bg-blue-100 text-blue-700' },
    TRANSPORT: { label: 'Transport', color: 'bg-amber-100 text-amber-700' },
    ADS: { label: 'Publicité', color: 'bg-pink-100 text-pink-700' },
    MARKETING: { label: 'Marketing', color: 'bg-purple-100 text-purple-700' },
    PACKAGING: { label: 'Emballage', color: 'bg-orange-100 text-orange-700' },
    SALARIES: { label: 'Salaires', color: 'bg-red-100 text-red-700' },
    OFFICE: { label: 'Bureau', color: 'bg-gray-100 text-gray-700' },
    GIFTS: { label: 'Cadeaux', color: 'bg-green-100 text-green-700' },
    CASHOUT: { label: 'Retrait', color: 'bg-slate-100 text-slate-700' },
    INCOME_CASH: { label: 'Entrée cash', color: 'bg-emerald-100 text-emerald-700' },
    INCOME_DELIVERY: { label: 'Livraison', color: 'bg-teal-100 text-teal-700' },
    INCOME_JUMIA: { label: 'Jumia', color: 'bg-cyan-100 text-cyan-700' },
    OTHER: { label: 'Autre', color: 'bg-gray-100 text-gray-600' },
}

export default async function CashflowPage({
    searchParams,
}: {
    searchParams: Promise<{ periode?: string }>
}) {
    const params = await searchParams
    const periode = parseInt(params.periode || '30')

    const data = await getCashflowData(periode)

    const isPositive = data.netCashflow >= 0
    const maxDailyRevenue = Math.max(...data.daily.map(d => d.revenue), 1)
    const maxDailyExpense = Math.max(...data.daily.map(d => d.expenses), 1)
    const maxBar = Math.max(maxDailyRevenue, maxDailyExpense)

    return (
        <div className="space-y-10">

            {/* En-tête */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-100">
                <div>
                    <h1 className="text-5xl lg:text-7xl font-black text-black tracking-tighter mb-2 italic">
                        Cashflow<span className="text-emerald-500">.</span>
                    </h1>
                    <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px]">
                        Trésorerie · Entrées vs Sorties d'argent
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Sélecteur période */}
                    <div className="flex gap-1.5 p-1 bg-gray-100 rounded-2xl">
                        {[7, 30, 90, 365].map(p => (
                            <a
                                key={p}
                                href={`?periode=${p}`}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                    periode === p ? 'bg-white text-black shadow-md' : 'text-gray-400 hover:text-black'
                                }`}
                            >
                                {p === 365 ? '1an' : `${p}j`}
                            </a>
                        ))}
                    </div>
                    <CashflowAddButton />
                </div>
            </div>

            {/* 4 KPIs principaux */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

                {/* Solde Net */}
                <div className={`col-span-2 lg:col-span-1 rounded-[2.5rem] p-8 relative overflow-hidden ${
                    isPositive ? 'bg-emerald-500' : 'bg-red-500'
                } text-white`}>
                    <div className="absolute top-6 right-6 opacity-20">
                        {isPositive
                            ? <TrendingUp className="w-16 h-16" />
                            : <TrendingDown className="w-16 h-16" />
                        }
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-80">Solde Net</p>
                    <p className="text-4xl font-black tracking-tighter">
                        {isPositive ? '+' : ''}{data.netCashflow.toFixed(0)}
                    </p>
                    <p className="text-xs font-bold opacity-70 mt-1">درهم · {periode} derniers jours</p>
                    <p className="text-[10px] font-bold mt-3 opacity-80">
                        {isPositive ? '✅ Trésorerie positive' : '⚠️ Trésorerie négative'}
                    </p>
                </div>

                {/* Entrées */}
                <div className="bg-white rounded-[2.5rem] p-6 border border-gray-100 shadow-xl relative overflow-hidden">
                    <ArrowUpRight className="absolute top-5 right-5 w-8 h-8 text-emerald-100" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Entrées</p>
                    <p className="text-3xl font-black text-emerald-600">{(data.totalRevenue + data.totalIncomeExtra).toFixed(0)}</p>
                    <p className="text-xs text-gray-400 font-bold mt-1">درهم</p>
                    <div className="mt-3 space-y-0.5">
                        <p className="text-[10px] text-gray-400 font-bold">📦 {data.ordersCount} commandes livrées</p>
                        {data.totalIncomeExtra > 0 && (
                            <p className="text-[10px] text-gray-400 font-bold">+ {data.totalIncomeExtra.toFixed(0)} درهم autres entrées</p>
                        )}
                    </div>
                </div>

                {/* Sorties */}
                <div className="bg-white rounded-[2.5rem] p-6 border border-gray-100 shadow-xl relative overflow-hidden">
                    <ArrowDownRight className="absolute top-5 right-5 w-8 h-8 text-red-100" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Sorties</p>
                    <p className="text-3xl font-black text-red-500">{data.totalExpenses.toFixed(0)}</p>
                    <p className="text-xs text-gray-400 font-bold mt-1">درهم</p>
                    <p className="mt-3 text-[10px] text-gray-400 font-bold">
                        {Object.keys(data.byCategory).length} catégories de dépenses
                    </p>
                </div>

                {/* En attente */}
                <div className="bg-white rounded-[2.5rem] p-6 border border-gray-100 shadow-xl relative overflow-hidden">
                    <Clock className="absolute top-5 right-5 w-8 h-8 text-amber-100" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">En attente</p>
                    <p className="text-3xl font-black text-amber-500">{data.pendingRevenue.toFixed(0)}</p>
                    <p className="text-xs text-gray-400 font-bold mt-1">درهم · {data.pendingCount} commandes</p>
                    <p className="mt-3 text-[10px] text-amber-600 font-bold">
                        💰 Revenu potentiel
                    </p>
                </div>
            </div>

            {/* Alerte retours */}
            {data.returnedLoss > 0 && (
                <div className="flex items-center gap-4 bg-red-50 border border-red-100 rounded-2xl p-4">
                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                    <div>
                        <p className="text-sm font-black text-red-700">
                            {data.returnedLoss.toFixed(0)} درهم perdus sur {data.returnedCount} commandes retournées/échouées
                        </p>
                        <p className="text-xs text-red-500 font-bold">Ces montants ne sont pas comptabilisés dans les entrées</p>
                    </div>
                </div>
            )}

            {/* Graphe barres journalières */}
            {data.daily.length > 0 && (
                <div className="bg-white rounded-[3rem] border border-gray-100 shadow-xl p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Évolution journalière</p>
                            <h2 className="text-2xl font-black text-black">Entrées vs Sorties</h2>
                        </div>
                        <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest">
                            <span className="flex items-center gap-1.5 text-emerald-600">
                                <span className="w-3 h-3 rounded-full bg-emerald-500" /> Entrées
                            </span>
                            <span className="flex items-center gap-1.5 text-red-500">
                                <span className="w-3 h-3 rounded-full bg-red-400" /> Sorties
                            </span>
                        </div>
                    </div>

                    <div className="overflow-x-auto no-scrollbar">
                        <div className="flex items-end gap-2 min-w-max pb-4" style={{ minHeight: '200px' }}>
                            {data.daily.map((day, i) => (
                                <div key={day.date} className="flex flex-col items-center gap-1 group">
                                    <div className="flex items-end gap-0.5 h-40">
                                        {/* Barre entrées */}
                                        <div
                                            className="w-4 bg-emerald-500 rounded-t-lg transition-all group-hover:bg-emerald-400 relative"
                                            style={{ height: `${Math.max((day.revenue / maxBar) * 160, 2)}px` }}
                                            title={`${day.revenue.toFixed(0)} درهم entrées`}
                                        />
                                        {/* Barre sorties */}
                                        <div
                                            className="w-4 bg-red-400 rounded-t-lg transition-all group-hover:bg-red-300 relative"
                                            style={{ height: `${Math.max((day.expenses / maxBar) * 160, 2)}px` }}
                                            title={`${day.expenses.toFixed(0)} درهم sorties`}
                                        />
                                    </div>
                                    <p className="text-[8px] font-bold text-gray-400 rotate-45 origin-left mt-2 w-8 truncate">
                                        {day.date.slice(5)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Dépenses par catégorie */}
                <div className="bg-white rounded-[3rem] border border-gray-100 shadow-xl p-8">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Répartition</p>
                    <h2 className="text-2xl font-black text-black mb-6">Dépenses par catégorie</h2>

                    {Object.keys(data.byCategory).length === 0 ? (
                        <p className="text-gray-300 font-bold text-sm text-center py-8">Aucune dépense</p>
                    ) : (
                        <div className="space-y-4">
                            {Object.entries(data.byCategory)
                                .sort(([, a], [, b]) => b - a)
                                .map(([cat, amount]) => {
                                    const config = CATEGORY_LABELS[cat] || { label: cat, color: 'bg-gray-100 text-gray-600' }
                                    const pct = data.totalExpenses > 0 ? (amount / data.totalExpenses * 100) : 0
                                    return (
                                        <div key={cat}>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${config.color}`}>
                                                    {config.label}
                                                </span>
                                                <div className="text-right">
                                                    <span className="font-black text-black text-sm">{amount.toFixed(0)} درهم</span>
                                                    <span className="text-gray-400 text-[10px] font-bold ml-1.5">{pct.toFixed(0)}%</span>
                                                </div>
                                            </div>
                                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-black rounded-full transition-all duration-500"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    )
                                })}
                        </div>
                    )}
                </div>

                {/* Transactions récentes */}
                <div className="bg-white rounded-[3rem] border border-gray-100 shadow-xl p-8">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Historique</p>
                    <h2 className="text-2xl font-black text-black mb-6">Dernières transactions</h2>

                    <div className="space-y-2">
                        {/* Dernières dépenses */}
                        {data.recentExpenses.length === 0 ? (
                            <p className="text-gray-300 font-bold text-sm text-center py-8">Aucune transaction</p>
                        ) : (
                            data.recentExpenses.map((exp: any) => {
                                const config = CATEGORY_LABELS[exp.category] || { label: exp.category, color: 'bg-gray-100 text-gray-600' }
                                const isIncome = exp.type === 'INCOME'
                                return (
                                    <div key={exp.id} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 transition-colors group">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm ${config.color} shrink-0`}>
                                            {isIncome ? '↑' : '↓'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-black text-black text-sm truncate">{exp.title}</p>
                                            <p className="text-[10px] text-gray-400 font-bold">
                                                {new Date(exp.date).toLocaleDateString('fr-FR')} · {config.label}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`font-black text-sm ${isIncome ? 'text-emerald-600' : 'text-red-500'}`}>
                                                {isIncome ? '+' : '-'}{exp.amount.toFixed(0)} درهم
                                            </span>
                                            <DeleteExpenseButton id={exp.id} />
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Dernières commandes livrées */}
            <div className="bg-white rounded-[3rem] border border-gray-100 shadow-xl p-8">
                <div className="flex items-center gap-3 mb-6">
                    <ShoppingBag className="w-5 h-5 text-gray-400" />
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Détail entrées</p>
                        <h2 className="text-xl font-black text-black">Commandes livrées récentes</h2>
                    </div>
                </div>

                {data.recentOrders.length === 0 ? (
                    <p className="text-gray-300 font-bold text-sm text-center py-8">Aucune commande livrée sur la période</p>
                ) : (
                    <div className="space-y-2">
                        {data.recentOrders.map((order: any) => (
                            <div key={order.id} className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 transition-colors">
                                <div>
                                    <p className="font-black text-black text-sm font-mono">#{order.id.slice(-8).toUpperCase()}</p>
                                    <p className="text-[10px] text-gray-400 font-bold">
                                        {new Date(order.createdAt).toLocaleDateString('fr-FR')} · {order.paymentMethod}
                                    </p>
                                </div>
                                <span className="font-black text-emerald-600">+{order.total.toFixed(0)} درهم</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

        </div>
    )
}
