'use client'

import { useState, useTransition } from 'react'
import { Package, Plus, Minus, Trash2, Search, Loader2, Warehouse, AlertTriangle } from 'lucide-react'
import ImageWithFallback from '@/components/ImageWithFallback'
import Link from 'next/link'
import { updateOrderItems, searchProductsForOrder, updateOrderItemMissing } from '@/lib/actions/admin-orders'
import { useRouter } from 'next/navigation'

export default function OrderItemsEditor({
    orderId,
    initialItems,
    warehouses = [],
    locale,
    shippingFees = 0,
    discount = 0
}: {
    orderId: string
    initialItems: any[]
    warehouses?: { id: string; name: string; location?: string | null }[]
    locale: string
    shippingFees?: number
    discount?: number
}) {
    const [items, setItems] = useState<any[]>(initialItems.map(item => {
        const resolvedWarehouseId = item.warehouseId || item.warehouse?.id || item.book?.stockMovements?.[0]?.fromWarehouse?.id || item.extraProduct?.stockMovements?.[0]?.fromWarehouse?.id || null
        const resolvedWarehouseName = item.warehouse?.name || item.book?.stockMovements?.[0]?.fromWarehouse?.name || item.extraProduct?.stockMovements?.[0]?.fromWarehouse?.name || null
        return {
            ...item,
            productId: item.type === 'BOOK' ? item.bookId : item.type === 'ACCESSORY' ? item.extraProductId : item.packId,
            warehouseId: resolvedWarehouseId,
            warehouseName: resolvedWarehouseName,
            isNew: false
        }
    }))

    const updateItemWarehouse = (index: number, warehouseId: string) => {
        const newItems = [...items]
        const matched = (warehouses || []).find((w: any) => w.id === warehouseId)
        newItems[index].warehouseId = warehouseId || null
        newItems[index].warehouseName = matched ? matched.name : null
        setItems(newItems)
    }
    
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [isSearching, startSearchTransition] = useTransition()
    const [isSaving, startSaveTransition] = useTransition()
    const [pendingMissingId, setPendingMissingId] = useState<string | null>(null)
    const router = useRouter()

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        const q = e.target.value
        setSearchQuery(q)
        if (q.length >= 2) {
            startSearchTransition(async () => {
                const results = await searchProductsForOrder(q)
                setSearchResults(results)
            })
        } else {
            setSearchResults([])
        }
    }

    const addItem = (product: any) => {
        if (product.stock <= 0) {
            alert('Stock insuffisant pour ce produit')
            return
        }
        
        // Vérifier s'il est déjà dans la liste
        const existingIndex = items.findIndex(i => i.productId === product.id && i.type === product.type)
        if (existingIndex >= 0) {
            const newItems = [...items]
            newItems[existingIndex].quantity += 1
            setItems(newItems)
        } else {
            setItems([...items, {
                id: undefined, // undefined signifie nouveau pour le backend
                type: product.type,
                productId: product.id,
                quantity: 1,
                price: product.price,
                book: product.type === 'BOOK' ? product : null,
                pack: product.type === 'PACK' ? product : null,
                extraProduct: product.type === 'ACCESSORY' ? product : null,
                isNew: true
            }])
        }
        setSearchQuery('')
        setSearchResults([])
    }

    const removeItem = (index: number) => {
        const newItems = [...items]
        newItems.splice(index, 1)
        setItems(newItems)
    }

    const updateQuantity = (index: number, delta: number) => {
        const newItems = [...items]
        const newQty = newItems[index].quantity + delta
        if (newQty > 0) {
            newItems[index].quantity = newQty
            setItems(newItems)
        }
    }

    const handleSave = () => {
        if (items.length === 0) {
            alert('La commande doit contenir au moins un article')
            return
        }
        
        const payload = items.map(item => ({
            id: item.isNew ? undefined : item.id,
            type: item.type,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            warehouseId: item.warehouseId || null,
            isMissing: Boolean(item.isMissing)
        }))

        startSaveTransition(async () => {
            const res = await updateOrderItems(orderId, payload)
            if (res?.success) {
                alert('Articles mis à jour avec succès')
                router.refresh()
            } else {
                alert(res?.error || 'Erreur lors de la mise à jour')
            }
        })
    }

    const toggleMissing = async (index: number) => {
        const item = items[index]
        const nextValue = !item.isMissing
        if (!item.id || item.isNew) {
            setItems(current => current.map((entry, i) => i === index ? { ...entry, isMissing: nextValue } : entry))
            return
        }

        setPendingMissingId(item.id)
        const result = await updateOrderItemMissing(orderId, item.id, nextValue)
        setPendingMissingId(null)
        if (!result.success) {
            alert(result.error || 'Impossible de modifier le signalement')
            return
        }
        setItems(current => current.map((entry, i) => i === index ? { ...entry, isMissing: nextValue } : entry))
        router.refresh()
    }

    // Calculs
    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    const costSubtotal = items.reduce((sum, item) => {
        const cost = item.costPrice || item.book?.costPrice || item.pack?.costPrice || item.extraProduct?.costPrice || 0
        return sum + (cost * item.quantity)
    }, 0)
    const total = subtotal + shippingFees - discount

    const hasChanges = JSON.stringify(
        items.map(i => ({ id: i.isNew ? undefined : i.id, q: i.quantity, p: i.productId }))
    ) !== JSON.stringify(
        initialItems.map(i => ({ id: i.id, q: i.quantity, p: i.type === 'BOOK' ? i.bookId : i.type === 'ACCESSORY' ? i.extraProductId : i.packId }))
    )

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden overflow-visible">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-gray-400" />
                    <h2 className="text-lg font-bold text-gray-900">Articles commandés</h2>
                </div>
                {hasChanges && (
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        Enregistrer les modifications
                    </button>
                )}
            </div>

            <div className="divide-y divide-gray-100">
                {items.map((item, index) => {
                    const product = item.book || item.pack || item.extraProduct
                    const editLink = item.type === 'ACCESSORY'
                        ? `/${locale}/admin/accessories/${product?.id}`
                        : item.type === 'PACK'
                            ? `/${locale}/admin/packs/${product?.id}/edit`
                            : `/${locale}/admin/books/${product?.id}/edit`

                    return (
                        <div key={item.id || `new-${index}`} className={`p-6 flex gap-4 relative group ${item.isMissing ? 'bg-red-50/70' : ''}`}>
                            <Link href={editLink} target="_blank" className="relative w-16 h-24 bg-gray-50 rounded-lg overflow-hidden shrink-0 border border-gray-100 hover:ring-2 hover:ring-blue-500 transition-all block">
                                {product?.image ? (
                                    <ImageWithFallback
                                        src={product.image}
                                        alt={product?.title || product?.name || 'Produit'}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Package className="w-6 h-6 text-gray-300" />
                                    </div>
                                )}
                            </Link>
                            
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start gap-4">
                                    <Link 
                                        href={editLink}
                                        className="font-bold text-gray-900 line-clamp-2 hover:text-blue-600"
                                        target="_blank"
                                    >
                                        {product?.title || product?.name}
                                        {item.isNew && <span className="ml-2 text-[10px] bg-green-100 text-green-800 px-2 py-0.5 rounded-full uppercase">Nouveau</span>}
                                    </Link>
                                    <div className="text-right">
                                        <span className="text-sm font-black text-gray-900 block">
                                            {item.price} درهم
                                        </span>
                                        <span className="text-xs text-gray-500 line-through">
                                            {item.costPrice ? `${item.costPrice} درهم (Coût)` : ''}
                                        </span>
                                    </div>
                                </div>

                                {/* Libell� Entrep�t source impact� */}
                                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-semibold text-gray-600 flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-200">
                                        <Warehouse className="w-3.5 h-3.5 text-blue-600" />
                                        Source de quel entrep�t ?
                                    </span>
                                    {warehouses && warehouses.length > 0 ? (
                                        <select
                                            value={item.warehouseId || ''}
                                            onChange={(e) => updateItemWarehouse(index, e.target.value)}
                                            className="text-xs font-bold px-2.5 py-1 rounded-md bg-blue-50 text-blue-900 border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer hover:bg-blue-100 transition-colors"
                                        >
                                            <option value="">S�lectionner un entrep�t</option>
                                            {warehouses.map((w: any) => (
                                                <option key={w.id} value={w.id}>
                                                    {w.name} {w.name.toLowerCase().includes('principal') ? '(Principal)' : ''}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
                                            {item.warehouseName || (item.warehouseId ? 'Entrep�t assign�' : 'Entrep�t Principal (par d�faut)')}
                                        </span>
                                    )}
                                </div>

                                <div className="mt-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3 border border-gray-200 rounded-lg p-1 bg-gray-50">
                                        <button 
                                            onClick={() => updateQuantity(index, -1)}
                                            className="w-6 h-6 rounded-md bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100"
                                        >
                                            <Minus className="w-3 h-3 text-gray-600" />
                                        </button>
                                        <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                                        <button 
                                            onClick={() => updateQuantity(index, 1)}
                                            className="w-6 h-6 rounded-md bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100"
                                        >
                                            <Plus className="w-3 h-3 text-gray-600" />
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => toggleMissing(index)}
                                            disabled={pendingMissingId === item.id}
                                            className={`px-3 py-2 rounded-lg text-xs font-black flex items-center gap-1.5 transition-colors ${item.isMissing ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'}`}
                                            title={item.isMissing ? 'Marquer comme retrouve' : 'Signaler comme manquant'}
                                        >
                                            {pendingMissingId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                                            {item.isMissing ? 'Manquant' : 'Signaler manquant'}
                                        </button>
                                        <span className="text-sm font-bold text-blue-600">
                                            Total: {item.price * item.quantity} درهم
                                        </span>
                                        <button 
                                            onClick={() => removeItem(index)}
                                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Supprimer"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Ajouter un article */}
            <div className="p-6 border-t border-gray-100 bg-gray-50/50">
                <div className="relative max-w-md">
                    <div className="relative">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input 
                            type="text"
                            placeholder="Rechercher un livre, jeu ou pack à ajouter..."
                            value={searchQuery}
                            onChange={handleSearch}
                            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        {isSearching && <Loader2 className="w-4 h-4 text-gray-400 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />}
                    </div>

                    {/* Resultats recherche */}
                    {searchResults.length > 0 && (
                        <div className="absolute top-full mt-1 z-[60] w-full bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden max-h-64 overflow-y-auto">
                            {searchResults.map((res, i) => (
                                <button
                                    key={i}
                                    onClick={() => addItem(res)}
                                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 text-left border-b border-gray-50 last:border-0"
                                >
                                    <div className="w-8 h-12 bg-gray-100 rounded shrink-0 overflow-hidden relative">
                                        {res.image && <ImageWithFallback src={res.image} alt={res.title} className="object-cover w-full h-full" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-900 truncate">{res.title}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs font-medium bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                                                {res.type === 'PACK' ? 'Pack' : res.type === 'ACCESSORY' ? 'Jeu / Accessoire' : 'Livre'}
                                            </span>
                                            <span className="text-xs text-gray-500">{res.price} درهم</span>
                                        </div>
                                    </div>
                                    <div className="shrink-0 text-xs font-bold text-gray-400">
                                        {res.stock > 0 ? `${res.stock} en stock` : <span className="text-red-500">Rupture</span>}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Totaux */}
            <div className="bg-gray-50 p-6 border-t border-gray-100 flex flex-col gap-3">
                <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>Sous-total articles</span>
                    <span className="font-bold text-gray-900">{subtotal.toFixed(2)} درهم</span>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>Frais de livraison</span>
                    <span>{shippingFees.toFixed(2)} درهم</span>
                </div>
                {discount > 0 && (
                    <div className="flex justify-between items-center text-sm text-green-600">
                        <span>Réduction</span>
                        <span>-{discount.toFixed(2)} درهم</span>
                    </div>
                )}
                <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>Frais fixes (Étiquette, Sachet, Ads)</span>
                    <span>2.65 درهم</span>
                </div>
                <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
                    <span className="text-lg font-bold text-gray-900">Chiffre d'Affaire</span>
                    <span className="text-2xl font-black text-gray-900">{total.toFixed(2)} درهم</span>
                </div>
                <div className="pt-3 border-t border-gray-200 flex justify-between items-center bg-green-50 -mx-6 px-6 py-4 mt-2">
                    <span className="text-lg font-bold text-green-800">Marge Nette (Estimée)</span>
                    <span className="text-2xl font-black text-green-600">
                        {(total - costSubtotal - 2.65 - shippingFees).toFixed(2)} درهم
                    </span>
                </div>
            </div>
        </div>
    )
}
