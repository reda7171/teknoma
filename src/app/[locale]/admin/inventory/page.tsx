'use client'

import { useState, useEffect, useCallback } from 'react'
import { Package, ArrowRightLeft, Plus, Search, Warehouse, TrendingUp, RefreshCw } from 'lucide-react'
import Image from 'next/image'

interface InventoryItem {
    id: string
    quantity: number
    book: { id: string; title: string; author: string; image: string; stock: number }
    warehouse: { id: string; name: string; location: string | null }
}

interface WarehouseData { id: string; name: string; location: string | null }

export default function InventoryPage() {
    const [inventory, setInventory] = useState<InventoryItem[]>([])
    const [warehouses, setWarehouses] = useState<WarehouseData[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [warehouseFilter, setWarehouseFilter] = useState('')

    // Modal ajout stock
    const [showAdd, setShowAdd] = useState(false)
    const [addForm, setAddForm] = useState({ bookId: '', warehouseId: '', quantity: '', note: '', type: 'ENTRANCE' })
    const [addSaving, setAddSaving] = useState(false)
    const [addError, setAddError] = useState('')

    // Modal transfert
    const [showTransfer, setShowTransfer] = useState(false)
    const [tfForm, setTfForm] = useState({ bookId: '', fromWarehouseId: '', toWarehouseId: '', quantity: '', note: '' })
    const [tfSaving, setTfSaving] = useState(false)
    const [tfError, setTfError] = useState('')

    // Livres (pour les selects)
    const [books, setBooks] = useState<{ id: string; title: string }[]>([])
    const [bookSearch, setBookSearch] = useState('')

    const load = useCallback(async () => {
        setLoading(true)
        const params = new URLSearchParams()
        if (warehouseFilter) params.set('warehouseId', warehouseFilter)
        const [invRes, whRes] = await Promise.all([
            fetch(`/api/admin/inventory?${params}`),
            fetch('/api/admin/warehouses'),
        ])
        setInventory(await invRes.json())
        setWarehouses(await whRes.json())
        setLoading(false)
    }, [warehouseFilter])

    useEffect(() => { load() }, [load])

    // Chargement des livres pour le select
    useEffect(() => {
        if (showAdd || showTransfer) {
            fetch(`/api/admin/books/search?q=${bookSearch}&limit=20`)
                .then(r => r.json())
                .then(data => setBooks(Array.isArray(data) ? data : data.books || []))
                .catch(() => {})
        }
    }, [showAdd, showTransfer, bookSearch])

    const filtered = inventory.filter(i =>
        i.book.title.toLowerCase().includes(search.toLowerCase()) ||
        i.book.author.toLowerCase().includes(search.toLowerCase()) ||
        i.warehouse.name.toLowerCase().includes(search.toLowerCase())
    )

    // Statistiques
    const totalQty = inventory.reduce((s, i) => s + i.quantity, 0)
    const totalBooks = new Set(inventory.map(i => i.book.id)).size
    const warehouseCount = new Set(inventory.map(i => i.warehouse.id)).size

    const submitAdd = async () => {
        setAddError('')
        if (!addForm.bookId || !addForm.warehouseId || !addForm.quantity) {
            setAddError('Tous les champs obligatoires doivent être remplis')
            return
        }
        setAddSaving(true)
        const res = await fetch('/api/admin/inventory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...addForm, quantity: Number(addForm.quantity) }),
        })
        setAddSaving(false)
        if (res.ok) { setShowAdd(false); setAddForm({ bookId: '', warehouseId: '', quantity: '', note: '', type: 'ENTRANCE' }); load() }
        else { const d = await res.json(); setAddError(d.error || 'Erreur') }
    }

    const submitTransfer = async () => {
        setTfError('')
        if (!tfForm.bookId || !tfForm.fromWarehouseId || !tfForm.toWarehouseId || !tfForm.quantity) {
            setTfError('Tous les champs sont requis')
            return
        }
        setTfSaving(true)
        const res = await fetch('/api/admin/inventory/transfer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...tfForm, quantity: Number(tfForm.quantity) }),
        })
        setTfSaving(false)
        if (res.ok) { setShowTransfer(false); setTfForm({ bookId: '', fromWarehouseId: '', toWarehouseId: '', quantity: '', note: '' }); load() }
        else { const d = await res.json(); setTfError(d.error || 'Erreur') }
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* En-tête */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                        <Package className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900">Inventaire Multi-Entrepôts</h1>
                        <p className="text-sm text-slate-500">Gestion du stock par entrepôt</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-700 transition-colors text-sm">
                        <Plus className="w-4 h-4" /> Ajouter stock
                    </button>
                    <button onClick={() => setShowTransfer(true)} className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-colors text-sm">
                        <ArrowRightLeft className="w-4 h-4" /> Transférer
                    </button>
                    <button onClick={load} className="w-9 h-9 flex items-center justify-center bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                        <RefreshCw className="w-4 h-4 text-slate-600" />
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                    { label: 'Total unités', value: totalQty, icon: TrendingUp, color: 'text-amber-600 bg-amber-50' },
                    { label: 'Titres suivis', value: totalBooks, icon: Package, color: 'text-blue-600 bg-blue-50' },
                    { label: 'Entrepôts actifs', value: warehouseCount, icon: Warehouse, color: 'text-green-600 bg-green-50' },
                ].map(s => (
                    <div key={s.label} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
                            <s.icon className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-2xl font-black text-slate-900">{s.value}</div>
                            <div className="text-xs text-slate-500">{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filtres */}
            <div className="flex gap-3 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Rechercher un livre ou entrepôt..."
                        className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 bg-white text-sm"
                    />
                </div>
                <select
                    value={warehouseFilter}
                    onChange={e => setWarehouseFilter(e.target.value)}
                    className="px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 bg-white text-sm font-medium"
                >
                    <option value="">Tous les entrepôts</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
            </div>

            {/* Table */}
            {loading ? (
                <div className="text-center py-20 text-slate-400">Chargement...</div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50">
                                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">Livre</th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">Entrepôt</th>
                                <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">Quantité</th>
                                <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">Stock Book</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filtered.length === 0 ? (
                                <tr><td colSpan={4} className="text-center py-12 text-slate-400">Aucun résultat</td></tr>
                            ) : filtered.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-12 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                                                {item.book.image ? (
                                                    <Image src={item.book.image} alt={item.book.title} width={40} height={48} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Package className="w-4 h-4 text-slate-300" />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 text-sm line-clamp-1">{item.book.title}</p>
                                                <p className="text-xs text-slate-500">{item.book.author}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <Warehouse className="w-4 h-4 text-slate-400" />
                                            <div>
                                                <p className="text-sm font-bold text-slate-700">{item.warehouse.name}</p>
                                                {item.warehouse.location && <p className="text-xs text-slate-400">{item.warehouse.location}</p>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl font-black text-lg ${item.quantity > 5 ? 'bg-green-100 text-green-700' : item.quantity > 0 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>
                                            {item.quantity}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className="text-sm text-slate-500 font-medium">{item.book.stock}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal Ajouter Stock */}
            {showAdd && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6">
                        <h2 className="text-xl font-black text-slate-900 mb-4">Ajouter du stock</h2>
                        {addError && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2 mb-4">{addError}</p>}
                        <div className="space-y-3">
                            <div>
                                <label className="text-sm font-bold text-slate-700 mb-1 block">Rechercher un livre</label>
                                <input value={bookSearch} onChange={e => setBookSearch(e.target.value)} placeholder="Titre du livre..." className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 text-sm mb-1" />
                                <select value={addForm.bookId} onChange={e => setAddForm(f => ({ ...f, bookId: e.target.value }))} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 text-sm">
                                    <option value="">Sélectionner un livre</option>
                                    {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-bold text-slate-700 mb-1 block">Entrepôt</label>
                                <select value={addForm.warehouseId} onChange={e => setAddForm(f => ({ ...f, warehouseId: e.target.value }))} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 text-sm">
                                    <option value="">Sélectionner un entrepôt</option>
                                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-sm font-bold text-slate-700 mb-1 block">Quantité</label>
                                    <input type="number" min="1" value={addForm.quantity} onChange={e => setAddForm(f => ({ ...f, quantity: e.target.value }))} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 text-sm" />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-slate-700 mb-1 block">Type</label>
                                    <select value={addForm.type} onChange={e => setAddForm(f => ({ ...f, type: e.target.value }))} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 text-sm">
                                        <option value="ENTRANCE">Entrée</option>
                                        <option value="ADJUSTMENT">Ajustement</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-bold text-slate-700 mb-1 block">Note (optionnel)</label>
                                <input value={addForm.note} onChange={e => setAddForm(f => ({ ...f, note: e.target.value }))} placeholder="ex: Livraison fournisseur" className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 text-sm" />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={submitAdd} disabled={addSaving} className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-700 transition-colors disabled:opacity-50">
                                {addSaving ? 'Enregistrement...' : 'Confirmer'}
                            </button>
                            <button onClick={() => setShowAdd(false)} className="px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors">
                                Annuler
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Transfert */}
            {showTransfer && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6">
                        <h2 className="text-xl font-black text-slate-900 mb-1">Transfert de stock</h2>
                        <p className="text-sm text-slate-500 mb-4">Déplacer des unités entre entrepôts</p>
                        {tfError && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2 mb-4">{tfError}</p>}
                        <div className="space-y-3">
                            <div>
                                <label className="text-sm font-bold text-slate-700 mb-1 block">Livre</label>
                                <input value={bookSearch} onChange={e => setBookSearch(e.target.value)} placeholder="Rechercher..." className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 text-sm mb-1" />
                                <select value={tfForm.bookId} onChange={e => setTfForm(f => ({ ...f, bookId: e.target.value }))} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 text-sm">
                                    <option value="">Sélectionner un livre</option>
                                    {books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-sm font-bold text-slate-700 mb-1 block">Depuis</label>
                                    <select value={tfForm.fromWarehouseId} onChange={e => setTfForm(f => ({ ...f, fromWarehouseId: e.target.value }))} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 text-sm">
                                        <option value="">Source</option>
                                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-slate-700 mb-1 block">Vers</label>
                                    <select value={tfForm.toWarehouseId} onChange={e => setTfForm(f => ({ ...f, toWarehouseId: e.target.value }))} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 text-sm">
                                        <option value="">Destination</option>
                                        {warehouses.filter(w => w.id !== tfForm.fromWarehouseId).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-bold text-slate-700 mb-1 block">Quantité</label>
                                <input type="number" min="1" value={tfForm.quantity} onChange={e => setTfForm(f => ({ ...f, quantity: e.target.value }))} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 text-sm" />
                            </div>
                            <div>
                                <label className="text-sm font-bold text-slate-700 mb-1 block">Note (optionnel)</label>
                                <input value={tfForm.note} onChange={e => setTfForm(f => ({ ...f, note: e.target.value }))} placeholder="ex: Réapprovisionnement Casa" className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 text-sm" />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={submitTransfer} disabled={tfSaving} className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl font-bold hover:bg-amber-600 transition-colors disabled:opacity-50">
                                {tfSaving ? 'Transfert...' : 'Confirmer le transfert'}
                            </button>
                            <button onClick={() => setShowTransfer(false)} className="px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors">
                                Annuler
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
