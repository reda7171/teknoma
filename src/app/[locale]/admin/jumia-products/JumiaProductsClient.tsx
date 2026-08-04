"use client"

import { useState } from "react"
import { RefreshCw, Package, Tag, ArrowRightLeft, Link2 } from "lucide-react"
import { getJumiaProducts, updateJumiaProductsStock, updateJumiaProductsPrice, updateJumiaProductsStatus, syncAllJumiaStock } from "../jumia-orders/actions"

interface JumiaProductsClientProps {
    initialData: any[]
    nextToken?: string | null
}

export default function JumiaProductsClient({ initialData, nextToken: initialNextToken }: JumiaProductsClientProps) {
    const [products, setProducts] = useState(initialData)
    const [nextToken, setNextToken] = useState<string | null | undefined>(initialNextToken)
    const [loading, setLoading] = useState(false)
    const [actionLoading, setActionLoading] = useState<string | null>(null)
    const [syncing, setSyncing] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState("ALL")
    const [visibilityFilter, setVisibilityFilter] = useState("ALL")
    const [categoryFilter, setCategoryFilter] = useState("ALL")
    const [selectedIds, setSelectedIds] = useState<string[]>([])

    const categories = Array.from(new Set(products.map((p: any) => p.category?.name || p.primaryCategory?.name).filter(Boolean))) as string[]

    const handleSyncStock = async () => {
        if (!confirm("Voulez-vous synchroniser le stock de Riwaya vers Jumia pour tous les produits (basé sur le nom du produit) ?")) return;
        
        setSyncing(true)
        try {
            const res = await syncAllJumiaStock()
            if (res.error) throw new Error(res.error)
            alert(`Succès ! ${res.count} produit(s) synchronisé(s) vers Jumia.`)
        } catch (error: any) {
            alert(error.message)
        } finally {
            setSyncing(false)
        }
    }

    const fetchMore = async () => {
        if (!nextToken) return
        setLoading(true)
        try {
            const res = await getJumiaProducts({ token: nextToken, size: 10 })
            if (res.error) throw new Error(res.error)
            setProducts([...products, ...(res.products || [])])
            setNextToken(res.nextToken)
        } catch (error: any) {
            alert(error.message)
        } finally {
            setLoading(false)
        }
    }

    const handleUpdateStock = async (product: any) => {
        const sku = product.sellerSku || (product.variations && product.variations[0]?.sellerSku)
        if (!sku) return alert("SKU Jumia introuvable pour ce produit")
        
        const currentStock = product.variations?.[0]?.quantity ?? product.variations?.[0]?.businessClients?.[0]?.stock ?? ""
        const newStockStr = prompt(`Entrez le nouveau stock pour ${product.name} (SKU: ${sku}) :`, String(currentStock))
        if (newStockStr === null) return
        const newStock = parseInt(newStockStr, 10)
        if (isNaN(newStock) || newStock < 0) return alert("Valeur invalide")

        setActionLoading(`stock-${product.id}`)
        try {
            const res = await updateJumiaProductsStock([{
                sellerSku: sku,
                id: product.stockId || product.id,
                stock: newStock
            }])
            if (res.error) throw new Error(res.error)
            alert(`Mise à jour envoyée (Feed ID: ${res.feedId || res.feedSid})`)
        } catch (error: any) {
            alert(error.message)
        } finally {
            setActionLoading(null)
        }
    }

    const handleBulkUpdateStock = async () => {
        if (selectedIds.length === 0) return alert("Sélectionnez au moins un produit")
        
        const newStockStr = prompt(`Entrez le nouveau stock pour les ${selectedIds.length} produits sélectionnés :`)
        if (newStockStr === null) return
        const newStock = parseInt(newStockStr, 10)
        if (isNaN(newStock) || newStock < 0) return alert("Valeur invalide")

        const productsToUpdate = products
            .filter((p: any) => selectedIds.includes(p.id))
            .map((p: any) => {
                const sku = p.sellerSku || (p.variations && p.variations[0]?.sellerSku)
                return {
                    sellerSku: sku,
                    id: p.stockId || p.id,
                    stock: newStock
                }
            })
            .filter(p => p.sellerSku)

        if (productsToUpdate.length === 0) return alert("Aucun SKU valide trouvé dans la sélection")

        setActionLoading('bulk-stock')
        try {
            // chunk into 1000 limit
            for (let i = 0; i < productsToUpdate.length; i += 1000) {
                const chunk = productsToUpdate.slice(i, i + 1000);
                const res = await updateJumiaProductsStock(chunk)
                if (res.error) throw new Error(res.error)
            }
            alert(`Succès ! Stock mis à jour pour ${productsToUpdate.length} produit(s).`)
            setSelectedIds([])
        } catch (error: any) {
            alert(error.message)
        } finally {
            setActionLoading(null)
        }
    }

    const handleUpdatePrice = async (product: any) => {
        const sku = product.sellerSku || (product.variations && product.variations[0]?.sellerSku)
        if (!sku) return alert("SKU Jumia introuvable pour ce produit")
        
        const effectivePrice = product.variations?.[0]?.price?.salePrice?.value 
            || product.variations?.[0]?.price?.value 
            || product.variations?.[0]?.globalPrice?.value 
            || ""
        const newPriceStr = prompt(`Entrez le nouveau prix pour ${product.name} (SKU: ${sku}) :`, String(effectivePrice))
        if (newPriceStr === null) return
        const newPrice = parseFloat(newPriceStr)
        if (isNaN(newPrice) || newPrice <= 0) return alert("Valeur invalide")

        setActionLoading(`price-${product.id}`)
        try {
            const res = await updateJumiaProductsPrice([{
                sellerSku: sku,
                id: product.id,
                price: {
                    currency: "MAD",
                    value: newPrice,
                    salePrice: {} 
                }
            }])
            if (res.error) throw new Error(res.error)
            alert(`Mise à jour envoyée (Feed ID: ${res.feedId || res.feedSid})`)
        } catch (error: any) {
            alert(error.message)
        } finally {
            setActionLoading(null)
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-4 rounded-md border gap-4 flex-wrap">
                <div className="flex gap-2 flex-1 flex-wrap min-w-[300px]">
                    <input 
                        type="text" 
                        placeholder="Rechercher par nom, SKU vendeur ou SKU Jumia..." 
                        className="border rounded-md px-3 py-2 text-sm w-full max-w-sm" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <select 
                        className="border rounded-md px-3 py-2 text-sm"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="ALL">Tous les statuts QC</option>
                        <option value="APPROVED">Approuvé (APPROVED)</option>
                        <option value="REJECTED">Rejeté (REJECTED)</option>
                        <option value="PENDING">En attente (PENDING)</option>
                    </select>
                    <select 
                        className="border rounded-md px-3 py-2 text-sm"
                        value={visibilityFilter}
                        onChange={(e) => setVisibilityFilter(e.target.value)}
                    >
                        <option value="ALL">Toute visibilité</option>
                        <option value="VISIBLE">Visible</option>
                        <option value="HIDDEN">Masqué</option>
                    </select>
                    <select 
                        className="border rounded-md px-3 py-2 text-sm max-w-[200px]"
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                    >
                        <option value="ALL">Toutes les catégories</option>
                        {categories.map((c) => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleBulkUpdateStock} 
                        disabled={actionLoading === 'bulk-stock'}
                        className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${selectedIds.length > 0 ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-100 text-blue-400 cursor-not-allowed'}`}
                    >
                        <Package className={`mr-2 h-4 w-4 ${actionLoading === 'bulk-stock' ? 'animate-spin' : ''}`} /> 
                        Synchronise Stock Jumia {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
                    </button>
                    <button 
                        onClick={handleSyncStock} 
                        disabled={syncing}
                        className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 text-sm font-medium transition-colors"
                    >
                        <ArrowRightLeft className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} /> 
                        {syncing ? 'Synchronisation...' : 'Synchroniser Stock Auto'}
                    </button>
                    <button onClick={() => window.location.reload()} className="flex items-center px-4 py-2 border rounded-md hover:bg-slate-50 text-sm font-medium transition-colors">
                        <RefreshCw className="mr-2 h-4 w-4" /> Rafraîchir
                    </button>
                </div>
            </div>

            <div className="rounded-md border bg-white overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 border-b">
                        <tr>
                            <th className="px-4 py-3 text-left w-10">
                                <input 
                                    type="checkbox"
                                    className="rounded border-gray-300"
                                    checked={selectedIds.length > 0 && products.length > 0 && selectedIds.length === products.length}
                                    onChange={(e) => {
                                        if (e.target.checked) {
                                            setSelectedIds(products.map((p: any) => p.id))
                                        } else {
                                            setSelectedIds([])
                                        }
                                    }}
                                />
                            </th>
                            <th className="px-4 py-3 text-left font-medium text-slate-500">Info produit</th>
                            <th className="px-4 py-3 text-left font-medium text-slate-500">SKU Vendeur</th>
                            <th className="px-4 py-3 text-left font-medium text-slate-500">Jumia SKU</th>
                            <th className="px-4 py-3 text-left font-medium text-slate-500">Statut QC / Visibilité</th>
                            <th className="px-4 py-3 text-left font-medium text-slate-500">Stock Actuel</th>
                            <th className="px-4 py-3 text-left font-medium text-slate-500">Prix Jumia</th>
                            <th className="px-4 py-3 text-right font-medium text-slate-500">Actions Rapides</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {products.length === 0 && (
                            <tr>
                                <td colSpan={7} className="text-center py-8 text-slate-500">
                                    Aucun produit trouvé sur Jumia.
                                </td>
                            </tr>
                        )}
                        {products.filter((p: any) => {
                            const businessClient = p.variations?.[0]?.businessClients?.[0]
                            const qcStatus = (businessClient?.qc?.status || p.status || 'N/A').toUpperCase()
                            const isVisible = businessClient?.visible === true
                            const cat = p.category?.name || p.primaryCategory?.name

                            if (statusFilter !== "ALL" && qcStatus !== statusFilter) return false
                            
                            if (visibilityFilter === "VISIBLE" && !isVisible) return false
                            if (visibilityFilter === "HIDDEN" && isVisible) return false

                            if (categoryFilter !== "ALL" && cat !== categoryFilter) return false

                            if (!searchQuery) return true
                            const q = searchQuery.toLowerCase()
                            const name = (p.name || "").toLowerCase()
                            const sellerSku = (p.sellerSku || p.variations?.[0]?.sellerSku || "").toLowerCase()
                            const jumiaSku = (p.variations?.[0]?.sku || "").toLowerCase()
                            return name.includes(q) || sellerSku.includes(q) || jumiaSku.includes(q)
                        }).sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).map((p: any) => {
                            const businessClient = p.variations?.[0]?.businessClients?.[0]
                            return (
                                <tr key={p.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3">
                                        <input 
                                            type="checkbox"
                                            className="rounded border-gray-300"
                                            checked={selectedIds.includes(p.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedIds([...selectedIds, p.id])
                                                } else {
                                                    setSelectedIds(selectedIds.filter(id => id !== p.id))
                                                }
                                            }}
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <div className="font-medium text-sm text-slate-900">{p.name}</div>
                                            {p.isLinked ? (
                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 whitespace-nowrap">
                                                    <Link2 className="w-3 h-3 mr-1" />
                                                    Linké
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 whitespace-nowrap">
                                                    Non Linké
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {p.brand?.name || "No Brand"} • {p.category?.name || p.primaryCategory?.name || "Non catégorisé"}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1">Créé le : {new Date(p.createdAt).toLocaleDateString()}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="inline-block border px-2 py-0.5 rounded text-xs bg-slate-50 font-medium">
                                            {p.sellerSku || (p.variations && p.variations[0]?.sellerSku) || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-xs text-slate-600 font-mono">
                                            {businessClient?.sku || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col gap-1">
                                            <span className={`inline-block w-fit px-2 py-0.5 rounded text-xs font-medium ${businessClient?.qc?.status === 'APPROVED' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                                                QC: {businessClient?.qc?.status || p.status || 'N/A'}
                                            </span>
                                            <span className={`inline-block w-fit px-2 py-0.5 rounded text-xs font-medium ${businessClient?.visible ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'}`}>
                                                {businessClient?.visible ? 'Visible' : 'Masqué'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-slate-900 font-medium">
                                            {p.stockActuel !== undefined ? p.stockActuel : (p.variations?.[0]?.quantity ?? 'N/A')}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex flex-col">
                                            {p.variations?.[0]?.price?.salePrice?.value ? (
                                                <>
                                                    <span className="text-slate-900 font-medium">{p.variations[0].price.salePrice.value} MAD</span>
                                                    <span className="text-xs text-slate-400 line-through">{p.variations[0].price.value} MAD</span>
                                                </>
                                            ) : (
                                                <span className="text-slate-900 font-medium">{p.variations?.[0]?.price?.value || p.variations?.[0]?.globalPrice?.value || 'N/A'} MAD</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                className="flex items-center px-3 py-1.5 border rounded-md text-xs hover:bg-slate-50 disabled:opacity-50"
                                                disabled={actionLoading === `stock-${p.id}`}
                                                onClick={() => handleUpdateStock(p)}
                                            >
                                                <Package className="h-3.5 w-3.5 mr-1.5" />
                                                Stock
                                            </button>
                                        <button 
                                            className="flex items-center px-3 py-1.5 border rounded-md text-xs hover:bg-slate-50 disabled:opacity-50"
                                            disabled={actionLoading === `price-${p.id}`}
                                            onClick={() => handleUpdatePrice(p)}
                                        >
                                            <Tag className="h-3.5 w-3.5 mr-1.5" />
                                            Prix
                                        </button>
                                    </div>
                                </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
            
            {/* Pagination removed - All loaded at once */}
        </div>
    )
}
