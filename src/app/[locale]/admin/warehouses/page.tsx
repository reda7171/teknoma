'use client'

import { useState, useEffect } from 'react'
import { Warehouse, Plus, Edit2, ToggleLeft, ToggleRight, Package, Save, X, Trash2, RotateCcw } from 'lucide-react'

interface WarehouseData {
    id: string
    name: string
    location: string | null
    active: boolean
    createdAt: string
    _count?: { stocks: number }
    movementsFrom?: { id: string }[]
}

export default function WarehousesPage() {
    const [warehouses, setWarehouses] = useState<WarehouseData[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editId, setEditId] = useState<string | null>(null)
    const [form, setForm] = useState({ name: '', location: '' })
    const [saving, setSaving] = useState(false)

    const load = async () => {
        setLoading(true)
        const res = await fetch('/api/admin/warehouses')
        const data = await res.json()
        setWarehouses(data)
        setLoading(false)
    }

    useEffect(() => { load() }, [])

    const save = async () => {
        if (!form.name.trim()) return
        setSaving(true)
        if (editId) {
            await fetch(`/api/admin/warehouses/${editId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })
        } else {
            await fetch('/api/admin/warehouses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })
        }
        setSaving(false)
        setShowForm(false)
        setEditId(null)
        setForm({ name: '', location: '' })
        load()
    }

    const toggleActive = async (w: WarehouseData) => {
        await fetch(`/api/admin/warehouses/${w.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ active: !w.active }),
        })
        load()
    }

    const deleteWarehouse = async (w: WarehouseData) => {
        if (!confirm(`Voulez-vous vraiment supprimer l'entrepôt "${w.name}" ? Cette action est irréversible et supprimera tout le stock associé !`)) return
        await fetch(`/api/admin/warehouses/${w.id}`, {
            method: 'DELETE',
        })
        load()
    }

    const resetStock = async (w: WarehouseData) => {
        if (!confirm(`Voulez-vous vraiment remettre à zéro (0) TOUT le stock de l'entrepôt "${w.name}" ? Cette action est irréversible !`)) return
        setLoading(true)
        await fetch(`/api/admin/warehouses/${w.id}/reset-stock`, {
            method: 'POST',
        })
        alert(`Le stock de l'entrepôt "${w.name}" a été réinitialisé avec succès.`)
        load()
    }

    // Totaux globaux
    const totalRefs = warehouses.reduce((s, w) => s + (w._count?.stocks ?? 0), 0)
    const totalOrders = warehouses.reduce((s, w) => s + (w.movementsFrom?.length ?? 0), 0)
    const activeCount = warehouses.filter(w => w.active).length

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-8">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center shadow-sm">
                        <Warehouse className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900">Entrepôts</h1>
                        <p className="text-sm text-slate-500">{warehouses.length} entrepôt(s) configuré(s)</p>
                    </div>
                </div>
                <button
                    onClick={() => { setShowForm(true); setEditId(null); setForm({ name: '', location: '' }) }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-700 transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4" /> Nouvel entrepôt
                </button>
            </div>

            {/* Bannière de stats globales */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
                    <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                        <ToggleRight className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Actifs</p>
                        <p className="text-2xl font-black text-slate-900">{activeCount}</p>
                    </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
                    <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <Package className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Références totales</p>
                        <p className="text-2xl font-black text-slate-900">{totalRefs}</p>
                    </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
                    <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <RotateCcw className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Sorties stock</p>
                        <p className="text-2xl font-black text-slate-900">{totalOrders}</p>
                    </div>
                </div>
            </div>

            {/* Formulaire */}
            {showForm && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                    <h2 className="text-lg font-black text-slate-900 mb-4">
                        {editId ? 'Modifier l\'entrepôt' : 'Nouvel entrepôt'}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="text-sm font-bold text-slate-700 mb-1 block">Nom *</label>
                            <input
                                value={form.name}
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                placeholder="ex: Entrepôt Casablanca"
                                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 bg-white"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-bold text-slate-700 mb-1 block">Adresse</label>
                            <input
                                value={form.location}
                                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                                placeholder="ex: Casablanca, Maarif"
                                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 bg-white"
                            />
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={save} disabled={saving} className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-700 transition-colors disabled:opacity-50">
                            <Save className="w-4 h-4" /> {saving ? 'Enregistrement...' : 'Enregistrer'}
                        </button>
                        <button onClick={() => setShowForm(false)} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors">
                            <X className="w-4 h-4" /> Annuler
                        </button>
                    </div>
                </div>
            )}

            {/* Grille entrepôts */}
            {loading ? (
                <div className="text-center py-20 text-slate-400">Chargement...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {warehouses.map(w => {
                        const orderCount = w.movementsFrom?.length ?? 0
                        const refCount = w._count?.stocks ?? 0
                        return (
                            <div key={w.id} className={`bg-white rounded-2xl border transition-all flex flex-col ${w.active ? 'border-slate-200 hover:border-amber-300 hover:shadow-md' : 'border-dashed border-slate-200 opacity-55'}`}>
                                {/* Header carte */}
                                <div className="p-5 flex items-start justify-between border-b border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${w.active ? 'bg-amber-100' : 'bg-slate-100'}`}>
                                            <Warehouse className={`w-6 h-6 ${w.active ? 'text-amber-600' : 'text-slate-400'}`} />
                                        </div>
                                        <div>
                                            <h3 className="font-black text-slate-900 text-base">{w.name}</h3>
                                            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                                                <span>📍</span> {w.location || 'Adresse non définie'}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider flex-shrink-0 ${w.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                        {w.active ? 'Actif' : 'Inactif'}
                                    </span>
                                </div>

                                {/* Stats */}
                                <div className="px-5 py-4 grid grid-cols-2 gap-3">
                                    <div className="bg-amber-50 rounded-xl p-3 text-center">
                                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Références</p>
                                        <p className="text-2xl font-black text-amber-700 mt-0.5">{refCount}</p>
                                    </div>
                                    <div className="bg-slate-50 rounded-xl p-3 text-center">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sorties</p>
                                        <p className="text-2xl font-black text-slate-700 mt-0.5">{orderCount}</p>
                                    </div>
                                </div>

                                {/* Barre de capacité */}
                                {totalOrders > 0 && (
                                    <div className="px-5 pb-4">
                                        <div className="flex justify-between text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-widest">
                                            <span>Contribution</span>
                                            <span>{totalOrders > 0 ? Math.round((orderCount / totalOrders) * 100) : 0}%</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-amber-400 rounded-full transition-all"
                                                style={{ width: `${totalOrders > 0 ? (orderCount / totalOrders) * 100 : 0}%` }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="px-5 py-4 border-t border-slate-100 mt-auto flex flex-wrap gap-2">
                                    <button
                                        onClick={() => { setEditId(w.id); setForm({ name: w.name, location: w.location || '' }); setShowForm(true) }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                                    >
                                        <Edit2 className="w-3 h-3" /> Modifier
                                    </button>
                                    <button
                                        onClick={() => toggleActive(w)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                                    >
                                        {w.active ? <ToggleRight className="w-3 h-3 text-green-600" /> : <ToggleLeft className="w-3 h-3" />}
                                        {w.active ? 'Désactiver' : 'Activer'}
                                    </button>
                                    <a
                                        href={`/fr/admin/inventory?warehouseId=${w.id}`}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors ml-auto"
                                    >
                                        <Package className="w-3 h-3" /> Inventaire
                                    </a>
                                    <button
                                        onClick={() => resetStock(w)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
                                        title="Remettre le stock à zéro"
                                    >
                                        <RotateCcw className="w-3 h-3" /> RAZ
                                    </button>
                                    <button
                                        onClick={() => deleteWarehouse(w)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
