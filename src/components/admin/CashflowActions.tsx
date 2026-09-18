'use client'

import { useState } from 'react'
import { createExpense, deleteExpense } from '@/lib/actions/cashflow'
import { useRouter } from 'next/navigation'
import { Plus, X, Trash2 } from 'lucide-react'

const CATEGORIES = [
    { value: 'BOOKS_PURCHASE', label: 'Achat livres', color: 'bg-blue-100 text-blue-700' },
    { value: 'TRANSPORT', label: 'Transport', color: 'bg-amber-100 text-amber-700' },
    { value: 'ADS', label: 'Publicité', color: 'bg-pink-100 text-pink-700' },
    { value: 'MARKETING', label: 'Marketing', color: 'bg-purple-100 text-purple-700' },
    { value: 'PACKAGING', label: 'Emballage', color: 'bg-orange-100 text-orange-700' },
    { value: 'SALARIES', label: 'Salaires', color: 'bg-red-100 text-red-700' },
    { value: 'OFFICE', label: 'Bureau', color: 'bg-gray-100 text-gray-700' },
    { value: 'GIFTS', label: 'Cadeaux', color: 'bg-green-100 text-green-700' },
    { value: 'CASHOUT', label: 'Retrait cash', color: 'bg-slate-100 text-slate-700' },
    { value: 'OTHER', label: 'Autre', color: 'bg-gray-100 text-gray-600' },
]

export function AddTransactionModal({ onClose }: { onClose: () => void }) {
    const router = useRouter()
    const [type, setType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE')
    const [form, setForm] = useState({
        title: '',
        amount: '',
        category: 'OTHER',
        date: new Date().toISOString().split('T')[0],
        description: '',
    })
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.title || !form.amount) return
        setLoading(true)
        await createExpense({
            title: form.title,
            amount: parseFloat(form.amount),
            category: type === 'INCOME' ? 'INCOME_CASH' : form.category,
            date: form.date,
            description: form.description,
            type,
        })
        router.refresh()
        onClose()
        setLoading(false)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h3 className="text-lg font-black text-black">Ajouter une transaction</h3>
                    <button aria-label="Fermer" onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Type toggle */}
                    <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl">
                        <button type="button" onClick={() => setType('EXPENSE')}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${type === 'EXPENSE' ? 'bg-red-500 text-white shadow-md' : 'text-gray-500'}`}>
                            Dépense (−)
                        </button>
                        <button type="button" onClick={() => setType('INCOME')}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${type === 'INCOME' ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-500'}`}>
                            Entrée (+)
                        </button>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Titre</label>
                        <input
                            type="text"
                            value={form.title}
                            onChange={e => setForm({ ...form, title: e.target.value })}
                            placeholder={type === 'EXPENSE' ? 'Ex: Achat 50 livres fournisseur' : 'Ex: Virement client'}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none text-sm font-bold"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Montant (درهم)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={form.amount}
                                onChange={e => setForm({ ...form, amount: e.target.value })}
                                placeholder="0.00"
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none text-sm font-black"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Date</label>
                            <input
                                type="date"
                                value={form.date}
                                onChange={e => setForm({ ...form, date: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none text-sm font-bold"
                            />
                        </div>
                    </div>

                    {type === 'EXPENSE' && (
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Catégorie</label>
                            <div className="flex flex-wrap gap-2">
                                {CATEGORIES.map(cat => (
                                    <button
                                        key={cat.value}
                                        type="button"
                                        onClick={() => setForm({ ...form, category: cat.value })}
                                        className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border-2 ${
                                            form.category === cat.value ? `${cat.color} border-current` : 'bg-gray-50 text-gray-400 border-transparent hover:bg-gray-100'
                                        }`}
                                    >
                                        {cat.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Note (optionnel)</label>
                        <textarea
                            value={form.description}
                            onChange={e => setForm({ ...form, description: e.target.value })}
                            rows={2}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black outline-none text-sm resize-none"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${
                            type === 'EXPENSE'
                                ? 'bg-red-500 hover:bg-red-600 text-white'
                                : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                        } disabled:opacity-50`}
                    >
                        {loading ? 'Enregistrement...' : `Ajouter ${type === 'EXPENSE' ? 'la dépense' : "l'entrée"}`}
                    </button>
                </form>
            </div>
        </div>
    )
}

export function DeleteExpenseButton({ id }: { id: string }) {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

    const handleDelete = async () => {
        if (!confirm('Supprimer cette transaction ?')) return
        setLoading(true)
        await deleteExpense(id)
        router.refresh()
        setLoading(false)
    }

    return (
        <button aria-label="Supprimer"
            onClick={handleDelete}
            disabled={loading}
            className="w-7 h-7 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 flex items-center justify-center transition-colors disabled:opacity-50 shrink-0"
        >
            <Trash2 className="w-3.5 h-3.5" />
        </button>
    )
}
