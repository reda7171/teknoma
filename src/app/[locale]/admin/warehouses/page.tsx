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

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* En-tête */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                        <Warehouse className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900">Entrepôts</h1>
                        <p className="text-sm text-slate-500">{warehouses.length} entrepôt(s)</p>
                    </div>
                </div>
                <button
                    onClick={() => { setShowForm(true); setEditId(null); setForm({ name: '', location: '' }) }}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-700 transition-colors"
                >
                    <Plus className="w-4 h-4" /> Nouvel entrepôt
                </button>
            </div>

            {/* Formulaire */}
            {showForm && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-6">
                    <h2 className="text-lg font-black text-slate-900 mb-4">
                        {editId ? 'Modifier' : 'Nouvel entrepôt'}
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

            {/* Liste */}
            {loading ? (
                <div className="text-center py-20 text-slate-400">Chargement...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {warehouses.map(w => (
                        <div key={w.id} className={`bg-white rounded-2xl border p-6 transition-all ${w.active ? 'border-slate-200 hover:border-amber-200' : 'border-dashed border-slate-200 opacity-60'}`}>
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${w.active ? 'bg-amber-100' : 'bg-slate-100'}`}>
                                        <Package className={`w-5 h-5 ${w.active ? 'text-amber-600' : 'text-slate-400'}`} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-900">{w.name}</h3>
                                        <p className="text-sm text-slate-500">{w.location || 'Adresse non définie'}</p>
                                    </div>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full font-bold ${w.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                    {w.active ? 'Actif' : 'Inactif'}
                                </span>
                            </div>
                            <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                                <button
                                    onClick={() => { setEditId(w.id); setForm({ name: w.name, location: w.location || '' }); setShowForm(true) }}
                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                                >
                                    <Edit2 className="w-3 h-3" /> Modifier
                                </button>
                                <button
                                    onClick={() => toggleActive(w)}
                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                                >
                                    {w.active ? <ToggleRight className="w-3 h-3 text-green-600" /> : <ToggleLeft className="w-3 h-3" />}
                                    {w.active ? 'Désactiver' : 'Activer'}
                                </button>
                                <a
                                    href={`/fr/admin/inventory?warehouseId=${w.id}`}
                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors ml-auto"
                                >
                                    <Package className="w-3 h-3" /> Voir
                                </a>
                                <button
                                    onClick={() => resetStock(w)}
                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors ml-2"
                                    title="Remettre le stock à zéro"
                                >
                                    <RotateCcw className="w-3 h-3" /> RAZ
                                </button>
                                <button
                                    onClick={() => deleteWarehouse(w)}
                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors ml-2"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
