'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Package, ArrowRightLeft, Plus, Search, Warehouse, TrendingUp, RefreshCw, Edit2 } from 'lucide-react'
import Image from 'next/image'

interface InventoryItem {
    id: string
    quantity: number
    book?: { id: string; title: string; author: string; image: string; stock: number }
    extraProduct?: { id: string; name: string; image: string; stock: number; category: string }
    warehouse: { id: string; name: string; location: string | null }
}

interface WarehouseData { id: string; name: string; location: string | null }

export default function InventoryPage() {
    const [inventory, setInventory] = useState<InventoryItem[]>([])
    const [warehouses, setWarehouses] = useState<WarehouseData[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [warehouseFilter, setWarehouseFilter] = useState('warehouse-principal-001')
    const [typeFilter, setTypeFilter] = useState('BOOK')
    const [activeTab, setActiveTab] = useState<'inventory' | 'orders'>('inventory')

    // Commandes impactant cet entrepôt
    const [orders, setOrders] = useState<any[]>([])
    const [ordersLoading, setOrdersLoading] = useState(false)

    // Modal ajout stock
    const [showAdd, setShowAdd] = useState(false)
    const [addForm, setAddForm] = useState({ productId: '', productType: 'BOOK', warehouseId: '', quantity: '', note: '', type: 'ENTRANCE' })
    const [addSaving, setAddSaving] = useState(false)
    const [addError, setAddError] = useState('')

    // Modal transfert
    const [showTransfer, setShowTransfer] = useState(false)
    const [tfForm, setTfForm] = useState({ productId: '', productType: 'BOOK', fromWarehouseId: '', toWarehouseId: '', quantity: '', note: '' })
    const [tfSaving, setTfSaving] = useState(false)
    const [tfError, setTfError] = useState('')

    // Modal Edit
    const [showEdit, setShowEdit] = useState(false)
    const [editForm, setEditForm] = useState({ inventoryId: '', productId: '', productType: 'BOOK', warehouseId: '', currentQuantity: 0, newQuantity: 0, note: '' })
    const [editSaving, setEditSaving] = useState(false)
    const [editError, setEditError] = useState('')

    // Produits (pour les selects)
    const [products, setProducts] = useState<{ id: string; title: string; type: string }[]>([])
    const [productSearch, setProductSearch] = useState('')

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

    // Charger les commandes (EXIT movements) pour l'entrepôt
    const loadOrders = useCallback(async () => {
        if (!warehouseFilter) return
        setOrdersLoading(true)
        const res = await fetch(`/api/admin/inventory/warehouse-orders?warehouseId=${warehouseFilter}`)
        const data = await res.json()
        setOrders(Array.isArray(data) ? data : [])
        setOrdersLoading(false)
    }, [warehouseFilter])

    useEffect(() => { load() }, [load])
    useEffect(() => { if (activeTab === 'orders') loadOrders() }, [activeTab, loadOrders])

    // Chargement des produits pour le select
    useEffect(() => {
        if (showAdd || showTransfer) {
            fetch(`/api/admin/inventory/search-products?q=${productSearch}&limit=20`)
                .then(r => r.json())
                .then(data => setProducts(Array.isArray(data) ? data : []))
                .catch(() => {})
        }
    }, [showAdd, showTransfer, productSearch])

    const productTypes = useMemo(() => {
        const types = new Set<string>()
        inventory.forEach(i => {
            if (i.book) types.add('BOOK')
            else if (i.extraProduct?.category) types.add(i.extraProduct.category.toUpperCase())
        })
        return Array.from(types).sort()
    }, [inventory])

    const filtered = inventory.filter(i => {
        const title = i.book?.title || i.extraProduct?.name || ''
        const author = i.book?.author || ''
        
        const isBook = !!i.book
        const category = isBook ? 'BOOK' : (i.extraProduct?.category?.toUpperCase() || 'ACCESSORY')
        
        const matchType = typeFilter === 'ALL' || category === typeFilter
        const matchSearch = title.toLowerCase().includes(search.toLowerCase()) ||
               author.toLowerCase().includes(search.toLowerCase()) ||
               i.warehouse.name.toLowerCase().includes(search.toLowerCase())
               
        return matchType && matchSearch
    })

    // Statistiques
    const totalQty = inventory.reduce((s, i) => s + i.quantity, 0)
    const totalProducts = new Set(inventory.map(i => i.book?.id || i.extraProduct?.id)).size
    const warehouseCount = new Set(inventory.map(i => i.warehouse.id)).size

    const openEditModal = (item: InventoryItem) => {
        const isBook = !!item.book
        setEditForm({
            inventoryId: item.id,
            productId: (isBook ? item.book?.id : item.extraProduct?.id) || '',
            productType: isBook ? 'BOOK' : 'ACCESSORY',
            warehouseId: item.warehouse.id,
            currentQuantity: item.quantity,
            newQuantity: item.quantity,
            note: ''
        })
        setEditError('')
        setShowEdit(true)
    }

    const submitEdit = async () => {
        const difference = Number(editForm.newQuantity) - Number(editForm.currentQuantity);
        if (difference === 0) {
            setShowEdit(false)
            return
        }
        setEditSaving(true)
        setEditError('')
        const payload = {
            ...(editForm.productType === 'BOOK' ? { bookId: editForm.productId } : { extraProductId: editForm.productId }),
            warehouseId: editForm.warehouseId,
            quantity: difference,
            type: 'ADJUSTMENT',
            note: editForm.note || 'Ajustement manuel'
        }
        const res = await fetch('/api/admin/inventory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        setEditSaving(false)
        if (res.ok) {
            setShowEdit(false)
            load()
        } else {
            const d = await res.json()
            setEditError(d.error || 'Erreur lors de la modification')
        }
    }

    const submitAdd = async () => {
        setAddError('')
        if (!addForm.productId || !addForm.warehouseId || !addForm.quantity) {
            setAddError('Tous les champs obligatoires doivent être remplis')
            return
        }
        setAddSaving(true)
        const payload = {
            ...(addForm.productType === 'BOOK' ? { bookId: addForm.productId } : { extraProductId: addForm.productId }),
            warehouseId: addForm.warehouseId,
            quantity: Number(addForm.quantity),
            note: addForm.note,
            type: addForm.type
        }
        const res = await fetch('/api/admin/inventory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })
        setAddSaving(false)
        if (res.ok) { setShowAdd(false); setAddForm({ productId: '', productType: 'BOOK', warehouseId: '', quantity: '', note: '', type: 'ENTRANCE' }); load() }
        else { const d = await res.json(); setAddError(d.error || 'Erreur') }
    }

    const submitTransfer = async () => {
        setTfError('')
        if (!tfForm.productId || !tfForm.fromWarehouseId || !tfForm.toWarehouseId || !tfForm.quantity) {
            setTfError('Tous les champs sont requis')
            return
        }
        setTfSaving(true)
        const payload = {
            ...(tfForm.productType === 'BOOK' ? { bookId: tfForm.productId } : { extraProductId: tfForm.productId }),
            fromWarehouseId: tfForm.fromWarehouseId,
            toWarehouseId: tfForm.toWarehouseId,
            quantity: Number(tfForm.quantity),
            note: tfForm.note
        }
        const res = await fetch('/api/admin/inventory/transfer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })
        setTfSaving(false)
        if (res.ok) { setShowTransfer(false); setTfForm({ productId: '', productType: 'BOOK', fromWarehouseId: '', toWarehouseId: '', quantity: '', note: '' }); load() }
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
                    { label: 'Produits suivis', value: totalProducts, icon: Package, color: 'text-blue-600 bg-blue-50' },
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
                    value={typeFilter}
                    onChange={e => setTypeFilter(e.target.value)}
                    className="px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 bg-white text-sm font-medium"
                >
                    <option value="ALL">Tous les produits</option>
                    {productTypes.map(t => <option key={t} value={t}>{t === 'BOOK' ? 'Livres' : t === 'ACCESSORY' ? 'Accessoires' : t === 'GAME' ? 'Jeux' : t}</option>)}
                </select>
                <select
                    value={warehouseFilter}
                    onChange={e => setWarehouseFilter(e.target.value)}
                    className="px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 bg-white text-sm font-medium"
                >
                    <option value="">Tous les entrepôts</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-slate-100 rounded-xl p-1 w-fit">
                <button
                    onClick={() => setActiveTab('inventory')}
                    className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                        activeTab === 'inventory' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    Inventaire
                </button>
                <button
                    onClick={() => setActiveTab('orders')}
                    className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                        activeTab === 'orders' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    Historique Commandes
                </button>
            </div>

            {activeTab === 'orders' ? (
                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                    {ordersLoading ? (
                        <div className="text-center py-20 text-slate-400">Chargement...</div>
                    ) : orders.length === 0 ? (
                        <div className="text-center py-20 text-slate-400">Aucune commande pour cet entrepôt</div>
                    ) : (
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50">
                                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">Date</th>
                                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">Produit</th>
                                    <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">Qté sortie</th>
                                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">Référence</th>
                                    <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {orders.map((m: any) => (
                                    <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">
                                            {new Date(m.createdAt).toLocaleDateString('fr-FR')}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-bold text-slate-900 text-sm">{m.book?.title || m.extraProduct?.name || '—'}</div>
                                            <div className="text-xs text-slate-400">{m.book?.author || ''}</div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-red-50 text-red-600">
                                                -{m.quantity}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate">{m.note || '—'}</td>
                                        <td className="px-4 py-3 text-right">
                                            {m.note && m.note.match(/[0-9a-f]{8}-[0-9a-f]{4}/i) && (
                                                <a
                                                    href={`/fr/admin/orders/${m.note.match(/[0-9a-f-]{36}/i)?.[0]}`}
                                                    className="text-xs font-bold text-blue-600 hover:underline"
                                                    target="_blank"
                                                >
                                                    Voir commande
                                                </a>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            ) : (
                <>
                {loading ? (
                    <div className="text-center py-20 text-slate-400">Chargement...</div>
                ) : (
                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50">
                                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">Produit</th>
                                <th className="text-left px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">Entrepôt</th>
                                <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">Quantité</th>
                                <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">Stock Global</th>
                                <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                                {filtered.length === 0 ? (
                                <tr><td colSpan={5} className="text-center py-12 text-slate-400">Aucun résultat</td></tr>
                            ) : filtered.map(item => {
                                const isBook = !!item.book
                                const title = item.book?.title || item.extraProduct?.name || ''
                                const subtitle = item.book?.author || item.extraProduct?.category || ''
                                const image = item.book?.image || item.extraProduct?.image || ''
                                const globalStock = item.book?.stock || item.extraProduct?.stock || 0

                                return (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-12 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 relative">
                                                {image ? (
                                                    <Image src={image} alt={title} width={40} height={48} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Package className="w-4 h-4 text-slate-300" />
                                                    </div>
                                                )}
                                                {!isBook && (
                                                    <div className="absolute top-0 right-0 bg-purple-500 text-white text-[8px] font-bold px-1 rounded-bl">ACC</div>
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 text-sm line-clamp-1">{title}</p>
                                                <p className="text-xs text-slate-500">{subtitle}</p>
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
                                        <span className="text-sm text-slate-500 font-medium">{globalStock}</span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button onClick={() => openEditModal(item)} className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors">
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
                )}
                </>
            )}

            {/* Modal Ajouter Stock */}
            {showAdd && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6">
                        <h2 className="text-xl font-black text-slate-900 mb-4">Ajouter du stock</h2>
                        {addError && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2 mb-4">{addError}</p>}
                        <div className="space-y-3">
                            <div>
                                <label className="text-sm font-bold text-slate-700 mb-1 block">Rechercher un produit</label>
                                <input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Titre ou nom..." className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 text-sm mb-1" />
                                <select 
                                    value={`${addForm.productType}-${addForm.productId}`} 
                                    onChange={e => {
                                        const [type, id] = e.target.value.split('-')
                                        setAddForm(f => ({ ...f, productId: id, productType: type }))
                                    }} 
                                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 text-sm"
                                >
                                    <option value="-">Sélectionner un produit</option>
                                    {products.map(p => <option key={p.id} value={`${p.type}-${p.id}`}>{p.type === 'ACCESSORY' ? '[Acc] ' : ''}{p.title}</option>)}
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
                                <label className="text-sm font-bold text-slate-700 mb-1 block">Produit</label>
                                <input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Titre ou nom..." className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 text-sm mb-1" />
                                <select 
                                    value={`${tfForm.productType}-${tfForm.productId}`} 
                                    onChange={e => {
                                        const [type, id] = e.target.value.split('-')
                                        setTfForm(f => ({ ...f, productId: id, productType: type }))
                                    }} 
                                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 text-sm"
                                >
                                    <option value="-">Sélectionner un produit</option>
                                    {products.map(p => <option key={p.id} value={`${p.type}-${p.id}`}>{p.type === 'ACCESSORY' ? '[Acc] ' : ''}{p.title}</option>)}
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

            {/* Modal Modification (Ajustement direct) */}
            {showEdit && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6">
                        <h2 className="text-xl font-black text-slate-900 mb-1">Modifier le stock</h2>
                        <p className="text-sm text-slate-500 mb-4">Ajustement pour cet entrepôt</p>
                        {editError && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2 mb-4">{editError}</p>}
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-bold text-slate-700 mb-1 block">Quantité Actuelle</label>
                                <input type="number" disabled value={editForm.currentQuantity} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-sm cursor-not-allowed" />
                            </div>
                            <div>
                                <label className="text-sm font-bold text-slate-700 mb-1 block">Nouvelle Quantité</label>
                                <input type="number" min="0" value={editForm.newQuantity} onChange={e => setEditForm(f => ({ ...f, newQuantity: Number(e.target.value) }))} className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 text-sm" />
                            </div>
                            <div>
                                <label className="text-sm font-bold text-slate-700 mb-1 block">Note (optionnel)</label>
                                <input value={editForm.note} onChange={e => setEditForm(f => ({ ...f, note: e.target.value }))} placeholder="ex: Inventaire manuel, produit endommagé..." className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 text-sm" />
                            </div>
                        </div>
                        
                        <div className="flex gap-3 mt-6">
                            <button onClick={submitEdit} disabled={editSaving} className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-700 transition-colors disabled:opacity-50">
                                {editSaving ? 'Enregistrement...' : 'Enregistrer'}
                            </button>
                            <button onClick={() => setShowEdit(false)} className="px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors">
                                Annuler
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
