"use client"

import { useState } from "react"
import { RefreshCw, Package, Tag, ArrowRightLeft } from "lucide-react"
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
                id: product.id,
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
            <div className="flex justify-between items-center bg-white p-4 rounded-md border">
                <input type="text" placeholder="Rechercher par SKU..." className="border rounded-md px-3 py-2 text-sm w-full max-w-sm" />
                <div className="flex items-center gap-2">
                    <button 
                        onClick={handleSyncStock} 
                        disabled={syncing}
                        className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 text-sm font-medium transition-colors"
                    >
                        <ArrowRightLeft className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} /> 
                        {syncing ? 'Synchronisation...' : 'Synchroniser Stock'}
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
                            <th className="px-4 py-3 text-left font-medium text-slate-500">Info produit</th>
                            <th className="px-4 py-3 text-left font-medium text-slate-500">SKU Vendeur</th>
                            <th className="px-4 py-3 text-left font-medium text-slate-500">Jumia SKU</th>
                            <th className="px-4 py-3 text-left font-medium text-slate-500">Statut QC / Visibilité</th>
                            <th className="px-4 py-3 text-left font-medium text-slate-500">Prix Jumia</th>
                            <th className="px-4 py-3 text-right font-medium text-slate-500">Actions Rapides</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {products.length === 0 && (
                            <tr>
                                <td colSpan={6} className="text-center py-8 text-slate-500">
                                    Aucun produit trouvé sur Jumia.
                                </td>
                            </tr>
                        )}
                        {products.map((p: any) => {
                            const businessClient = p.variations?.[0]?.businessClients?.[0]
                            return (
                                <tr key={p.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-sm text-slate-900">{p.name}</div>
                                        <div className="text-xs text-slate-500">
                                            {p.brand?.name || "No Brand"} • {p.category?.name || p.primaryCategory?.name || "Non catégorisé"}
                                        </div>
                                        <div className="text-xs text-slate-500">Créé le : {new Date(p.createdAt).toLocaleDateString()}</div>
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
            
            {nextToken && (
                <div className="flex justify-center mt-4">
                    <button onClick={fetchMore} disabled={loading} className="px-4 py-2 border rounded-md bg-slate-100 hover:bg-slate-200 text-sm">
                        {loading ? "Chargement..." : "Afficher plus"}
                    </button>
                </div>
            )}
        </div>
    )
}
