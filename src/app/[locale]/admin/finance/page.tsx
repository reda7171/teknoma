import { isAuthenticated } from '@/lib/actions/auth'
import { getExpenses, getFinancialStats, getChartData, getFinanceArchives, getInvoices } from '@/lib/actions/finance'
import { Plus, Trash2, TrendingUp, TrendingDown, Wallet, Archive } from 'lucide-react'
import ExpenseForm from '@/components/admin/ExpenseForm'
import ExpensesTable from '@/components/admin/ExpensesTable'
import InvoicesTable from '@/components/admin/InvoicesTable'
import JumiaPayoutsTable from '@/components/admin/JumiaPayoutsTable'
import MonthYearFilter from '@/components/admin/MonthYearFilter'
import FinanceChart from '@/components/admin/FinanceChart'
import ArchivePeriodButton from '@/components/admin/ArchivePeriodButton'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

export default async function FinancePage(props: { params: Promise<{ locale: string }>, searchParams?: Promise<{ month?: string, year?: string }> }) {
    const params = await props.params
    const searchParams = await props.searchParams
    const { locale } = params

    const isAuth = await isAuthenticated()
    if (!isAuth) {
        redirect(`/${locale}/admin/login`)
    }

    const filters = {
        month: searchParams?.month ? parseInt(searchParams.month) : undefined,
        year: searchParams?.year ? parseInt(searchParams.year) : new Date().getFullYear()
    }

    const expenses = await getExpenses(filters)
    const stats = await getFinancialStats(filters)
    const chartData = await getChartData(filters)
    const archives = await getFinanceArchives()
    const invoices = await getInvoices()

    // Chiffre d'Affaire
    const grossRevenue = stats.totalRevenue

    // Marge Brute = Chiffre d'Affaire - Coût de revient moyen des articles vendus
    const grossMargin = grossRevenue - stats.totalCostOfGoodsSold

    // Total des autres dépenses (hors achats de livres, car le coût des livres est déjà déduit via CostOfGoodsSold)
    const operatingExpenses = expenses
        .filter(e => e.type === 'EXPENSE' && e.category !== 'BOOKS_PURCHASE')
        .reduce((sum, e) => sum + e.amount, 0)

    // D'un point de vue Trésorerie : Balance = Revenus encaissés + Entrées Cash - Toutes les dépenses décaissées
    // (L'argent réel qui reste en poche ou en banque, en comptant le stock payé d'avance)
    const cashBalance = stats.totalRevenue + stats.totalIncomes - stats.totalExpenses

    // D'un point de vue Rentabilité (Bénéfice Net Réel) :
    // Bénéfice = CA - Coût des articles vendus (Livres + frais fixes 2.65/cmd) - Autres charges (Ads globales, Transport, Salaires, etc.)
    const netProfit = grossMargin - operatingExpenses

    return (
        <div className="space-y-12">
            {/* Header section style Riwaya */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-100">
                <div>
                    <h1 className="text-5xl lg:text-6xl font-black text-black tracking-tighter mb-2 italic">
                        Finance<span className="text-emerald-600">.</span>
                    </h1>
                    <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px]">
                        Rapports de rentabilité et gestion des flux
                    </p>
                </div>
                
                <div className="flex flex-col md:flex-row items-center gap-4">
                    <ArchivePeriodButton 
                        stats={{
                            netProfit,
                            revenue: grossRevenue,
                            expenses: operatingExpenses + stats.totalCostOfGoodsSold,
                            shareReda: netProfit / 2,
                            shareAmine: netProfit / 2,
                            ordersCount: stats.ordersCount || 0
                        }}
                    />
                    <div className="flex items-center gap-3 bg-emerald-50 px-6 py-3 rounded-2xl border border-emerald-100">
                        <Wallet className="w-5 h-5 text-emerald-600" />
                        <span className="text-emerald-600 text-[10px] font-black uppercase tracking-widest">
                            Solde: {cashBalance.toFixed(0)} درهم
                        </span>
                    </div>
                </div>
            </div>

            {/* Stats Cards Premium */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: "Chiffre d'Affaire", value: grossRevenue, icon: TrendingUp, color: "bg-black text-white", sub: "Ventes totales" },
                    { label: "Coût Vente", value: -stats.totalCostOfGoodsSold, icon: Wallet, color: "bg-orange-50 text-orange-600", sub: "Livres + Frais Fixes" },
                    { label: "Dépenses", value: -operatingExpenses, icon: TrendingDown, color: "bg-red-50 text-red-600", sub: "Hors achat stock" },
                    { label: "Bénéfice Net", value: netProfit, icon: TrendingUp, color: netProfit >= 0 ? "bg-emerald-600 text-white shadow-xl shadow-emerald-200" : "bg-red-600 text-white shadow-xl shadow-red-200", sub: "Rentabilité réelle" }
                ].map((stat, i) => (
                    <div key={i} className={`p-8 rounded-[2.5rem] border border-gray-100 bg-white relative overflow-hidden group transition-all hover:-translate-y-1 shadow-sm`}>
                        <div className="flex justify-between items-start mb-6">
                            <div className={`p-4 rounded-2xl ${stat.color} transition-transform group-hover:scale-110`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                                <p className="text-[9px] font-bold text-gray-300 uppercase tracking-tighter">{stat.sub}</p>
                            </div>
                        </div>
                        <p className={`text-3xl font-black tracking-tighter ${stat.value < 0 ? 'text-red-600' : 'text-black'}`}>
                            {stat.value.toFixed(0)} <span className="text-xs font-bold">درهم</span>
                        </p>
                    </div>
                ))}
            </div>

            {/* Chart Section */}
            <FinanceChart data={chartData} />

            {/* Partenaires (Reda & Amine) Premium Layout */}
            <div className="bg-black rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                
                <div className="relative z-10 space-y-8">
                    <div className="flex items-center gap-4">
                        <div className="w-2 h-8 bg-emerald-500 rounded-full" />
                        <h2 className="text-2xl font-black tracking-tight uppercase">Partage des Bénéfices <span className="text-emerald-500 text-sm">(50/50)</span></h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {[
                            { name: "Reda", part: netProfit / 2, initial: "R" },
                            { name: "Amine", part: netProfit / 2, initial: "A" }
                        ].map((user, i) => (
                            <div key={i} className="bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-[2rem] flex items-center justify-between group hover:bg-white/10 transition-all">
                                <div>
                                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2 italic">Part de {user.name}</p>
                                    <p className={`text-4xl font-black tracking-tighter ${user.part >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {user.part.toFixed(0)} <span className="text-sm">درهم</span>
                                    </p>
                                </div>
                                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-black font-black text-2xl shadow-xl transition-transform group-hover:rotate-12">
                                    {user.initial}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Expense Form Section */}
            <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-xl shadow-black/5">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-black">
                        <Plus className="w-6 h-6" />
                    </div>
                    <h2 className="text-2xl font-black text-black tracking-tight">Ajouter une transaction</h2>
                </div>
                <ExpenseForm />
            </div>

            {/* Invoices List */}
            <InvoicesTable invoices={invoices} />

            {/* Jumia Payouts List */}
            <JumiaPayoutsTable />

            {/* Expenses List Premium */}
            <ExpensesTable expenses={expenses} />

            {/* Archives Section */}
            {archives.length > 0 && (
                <div className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-xl shadow-black/5 mt-12">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-black">
                            <Archive className="w-6 h-6" />
                        </div>
                        <h2 className="text-2xl font-black text-black tracking-tight">Archives Financières</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {archives.map(archive => (
                            <div key={archive.id} className="border border-gray-100 rounded-[2rem] p-6 hover:shadow-lg transition-all bg-gray-50/50">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="font-black text-lg">{archive.periodName}</h3>
                                    <span className="text-[10px] font-black text-gray-400 bg-gray-200 px-3 py-1 rounded-full uppercase">
                                        {new Date(archive.createdAt).toLocaleDateString('fr-FR')}
                                    </span>
                                </div>
                                
                                <div className="space-y-3 mb-6">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500 font-medium">Commandes</span>
                                        <span className="font-bold">{archive.ordersCount}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500 font-medium">Chiffre d'Affaire</span>
                                        <span className="font-bold">{archive.revenue.toFixed(2)} درهم</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500 font-medium">Bénéfice Net</span>
                                        <span className="font-black text-emerald-600">{archive.netProfit.toFixed(2)} درهم</span>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-gray-200 flex justify-between text-xs">
                                    <div>
                                        <p className="text-gray-400 font-bold uppercase tracking-widest mb-1">Reda</p>
                                        <p className="font-black">{archive.shareReda.toFixed(2)} درهم</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-gray-400 font-bold uppercase tracking-widest mb-1">Amine</p>
                                        <p className="font-black">{archive.shareAmine.toFixed(2)} درهم</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
