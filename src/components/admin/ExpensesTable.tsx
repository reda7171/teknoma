'use client'

import { useState } from 'react'
import { Wallet, Search, Filter } from 'lucide-react'
import ExpenseRowActions from '@/components/admin/ExpenseRowActions'

interface Expense {
    id: string
    title: string
    description: string | null
    amount: number
    category: string
    date: Date
    type: string
}

export default function ExpensesTable({ expenses }: { expenses: Expense[] }) {
    const [searchTerm, setSearchTerm] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('ALL')

    const categories = Array.from(new Set(expenses.map(e => e.category)))

    const filteredExpenses = expenses.filter(expense => {
        const matchesSearch = expense.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              (expense.description && expense.description.toLowerCase().includes(searchTerm.toLowerCase()))
        const matchesCategory = categoryFilter === 'ALL' || expense.category === categoryFilter

        return matchesSearch && matchesCategory
    })

    return (
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-xl shadow-black/5 overflow-hidden">
            <div className="px-10 py-8 border-b border-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50">
                <div className="flex items-center gap-3">
                    <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Historique des Flux Financiers</h2>
                    <div className="text-[10px] font-black text-red-600 bg-red-50 px-4 py-1.5 rounded-full uppercase tracking-widest border border-red-100">
                        {filteredExpenses.length} Transactions
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    {/* Filter by Category */}
                    <div className="relative w-full sm:w-auto">
                        <Filter className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <select 
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="w-full sm:w-auto pl-10 pr-8 py-3 bg-white border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-black focus:outline-none focus:ring-2 focus:ring-black/5 appearance-none cursor-pointer"
                        >
                            <option value="ALL">Toutes catégories</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    {/* Search Input */}
                    <div className="relative w-full sm:w-64">
                        <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                        <input 
                            type="text" 
                            placeholder="RECHERCHER..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-black placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-black/5"
                        />
                    </div>
                </div>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-white text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 border-b border-gray-50">
                        <tr>
                            <th className="px-10 py-6">Date</th>
                            <th className="px-10 py-6">Opération</th>
                            <th className="px-10 py-6">Catégorie</th>
                            <th className="px-10 py-6 text-right">Montant</th>
                            <th className="px-10 py-6 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredExpenses.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-10 py-24 text-center text-gray-400">
                                    <div className="flex flex-col items-center justify-center">
                                        <Wallet className="w-16 h-16 mb-4 opacity-10" />
                                        <p className="font-black uppercase tracking-widest text-[10px]">Aucune transaction trouvée</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredExpenses.map((expense) => (
                                <tr key={expense.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <td className="px-10 py-6">
                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            {new Date(expense.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </div>
                                    </td>
                                    <td className="px-10 py-6">
                                        <div className="flex flex-col">
                                            <span className="font-black text-black uppercase tracking-tight text-xs">{expense.title}</span>
                                            {expense.description && (
                                                <span className="text-[10px] font-bold text-gray-400 mt-1 italic italic">"{expense.description}"</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-10 py-6">
                                        <span className="px-3 py-1 bg-gray-100 text-gray-500 text-[9px] font-black rounded-full uppercase tracking-widest border border-gray-200">
                                            {expense.category}
                                        </span>
                                    </td>
                                    <td className="px-10 py-6 text-right">
                                        <span className={`font-black text-sm tracking-tighter ${expense.type === 'INCOME' ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {expense.type === 'INCOME' ? '+' : '-'}{expense.amount.toFixed(0)} MAD
                                        </span>
                                    </td>
                                    <td className="px-10 py-6 text-right">
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                            <ExpenseRowActions expense={expense} />
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
