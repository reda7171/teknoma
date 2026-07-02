"use client"

import { useState } from "react"
import { createJumiaConsignmentOrder } from "../jumia-orders/actions"
import { Trash2, Plus } from "lucide-react"

interface ConsignmentOrderFormProps {
    shops: any[]
    onCancel: () => void
    onSuccess: () => void
}

export default function ConsignmentOrderForm({ shops, onCancel, onSuccess }: ConsignmentOrderFormProps) {
    const [loading, setLoading] = useState(false)
    const [shopId, setShopId] = useState("")
    const [businessClientCode, setBusinessClientCode] = useState("jumia-ma")
    const [shippingDate, setShippingDate] = useState("")
    const [products, setProducts] = useState([{ sku: "", quantity: 1 }])

    const handleAddProduct = () => {
        setProducts([...products, { sku: "", quantity: 1 }])
    }

    const handleRemoveProduct = (index: number) => {
        const newProducts = [...products]
        newProducts.splice(index, 1)
        setProducts(newProducts)
    }

    const handleProductChange = (index: number, field: string, value: string | number) => {
        const newProducts = [...products]
        newProducts[index] = { ...newProducts[index], [field]: value }
        setProducts(newProducts)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!shopId) return alert("Veuillez sélectionner une boutique")
        if (!shippingDate) return alert("Veuillez définir une date d'expédition")
        
        const validProducts = products.filter(p => p.sku && p.quantity > 0)
        if (validProducts.length === 0) return alert("Veuillez ajouter au moins un produit valide")

        setLoading(true)
        try {
            const dateObj = new Date(shippingDate)
            const formattedDate = dateObj.toISOString().slice(0, 19).replace('T', ' ')

            const payload = {
                shopId,
                businessClientCode,
                shippingDate: formattedDate,
                products: validProducts.map(p => ({
                    sku: p.sku,
                    quantity: Number(p.quantity)
                }))
            }

            const res = await createJumiaConsignmentOrder(payload)
            if (res.error) throw new Error(res.error)
            
            onSuccess()
        } catch (error: any) {
            alert(`Erreur: ${error.message}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-md border max-w-3xl text-sm">
            <h3 className="text-xl font-medium">Nouvelle Expédition de Consignation (FBJ)</h3>
            
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="font-medium text-slate-700">Boutique Jumia</label>
                    <select 
                        value={shopId} 
                        onChange={(e) => setShopId(e.target.value)}
                        className="w-full border rounded-md px-3 py-2"
                        required
                    >
                        <option value="" disabled>Sélectionnez une boutique</option>
                        {shops?.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </div>
                <div className="space-y-2">
                    <label className="font-medium text-slate-700">Business Client Code</label>
                    <input 
                        className="w-full border rounded-md px-3 py-2"
                        value={businessClientCode} 
                        onChange={(e) => setBusinessClientCode(e.target.value)} 
                        placeholder="ex: jumia-ma" 
                    />
                </div>
                <div className="space-y-2">
                    <label className="font-medium text-slate-700">Date d'expédition prévue</label>
                    <input 
                        className="w-full border rounded-md px-3 py-2"
                        type="datetime-local" 
                        value={shippingDate} 
                        onChange={(e) => setShippingDate(e.target.value)} 
                    />
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-2">
                    <h4 className="font-medium text-slate-800">Produits à expédier</h4>
                    <button 
                        type="button" 
                        className="flex items-center px-3 py-1.5 border rounded-md text-xs hover:bg-slate-50" 
                        onClick={handleAddProduct}
                    >
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                        Ajouter
                    </button>
                </div>

                {products.map((product, idx) => (
                    <div key={idx} className="flex gap-4 items-end">
                        <div className="flex-1 space-y-2">
                            <label className="font-medium text-slate-700">SKU Jumia</label>
                            <input 
                                className="w-full border rounded-md px-3 py-2"
                                value={product.sku} 
                                onChange={(e) => handleProductChange(idx, 'sku', e.target.value)} 
                                placeholder="Entrez le SKU"
                                required
                            />
                        </div>
                        <div className="w-32 space-y-2">
                            <label className="font-medium text-slate-700">Quantité</label>
                            <input 
                                className="w-full border rounded-md px-3 py-2"
                                type="number" 
                                min="1" 
                                value={product.quantity} 
                                onChange={(e) => handleProductChange(idx, 'quantity', e.target.value)} 
                                required
                            />
                        </div>
                        <button 
                            type="button" 
                            className="p-2 text-red-500 hover:bg-red-50 rounded-md mb-0.5 disabled:opacity-50 disabled:hover:bg-transparent"
                            onClick={() => handleRemoveProduct(idx)}
                            disabled={products.length === 1}
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                ))}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
                <button 
                    type="button" 
                    className="px-4 py-2 hover:bg-slate-50 rounded-md" 
                    onClick={onCancel}
                >
                    Annuler
                </button>
                <button 
                    type="submit" 
                    className="px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50" 
                    disabled={loading || !shopId}
                >
                    {loading ? "Création..." : "Confirmer l'expédition"}
                </button>
            </div>
        </form>
    )
}
