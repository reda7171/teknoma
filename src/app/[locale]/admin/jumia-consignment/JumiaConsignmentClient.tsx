"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import ConsignmentOrderForm from "./ConsignmentOrderForm"
import { getJumiaCatalogStock } from "../jumia-orders/actions"

interface JumiaConsignmentClientProps {
    shops: any[]
}

export default function JumiaConsignmentClient({ shops }: JumiaConsignmentClientProps) {
    const [showForm, setShowForm] = useState(false)
    const [stocks, setStocks] = useState<any[]>([])
    const [loadingStocks, setLoadingStocks] = useState(false)
    const [activeTab, setActiveTab] = useState("orders")

    const fetchStocks = async () => {
        setLoadingStocks(true)
        try {
            const res = await getJumiaCatalogStock({ size: 20 })
            if (res.error) throw new Error(res.error)
            setStocks(res.stocks || [])
        } catch (error: any) {
            alert(error.message)
        } finally {
            setLoadingStocks(false)
        }
    }

    const handleTabChange = (tab: string) => {
        setActiveTab(tab)
        if (tab === "stock") {
            fetchStocks()
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex space-x-1 border-b mb-4">
                <button
                    className={`px-4 py-2 font-medium text-sm transition-colors ${activeTab === 'orders' ? 'border-b-2 border-slate-900 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                    onClick={() => handleTabChange('orders')}
                >
                    Expéditions (Commandes FBJ)
                </button>
                <button
                    className={`px-4 py-2 font-medium text-sm transition-colors ${activeTab === 'stock' ? 'border-b-2 border-slate-900 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                    onClick={() => handleTabChange('stock')}
                >
                    Stock en Consignation
                </button>
            </div>

            {activeTab === "orders" && (
                <div>
                    {!showForm ? (
                        <div className="space-y-4">
                            <div className="flex justify-end">
                                <button 
                                    className="flex items-center px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-800 text-sm"
                                    onClick={() => setShowForm(true)}
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Nouvelle Expédition
                                </button>
                            </div>
                            <div className="rounded-md border bg-white overflow-hidden p-8 text-center">
                                <p className="text-slate-500 mb-2">L'API Jumia ne permet pas de lister l'historique des expéditions de consignation (Method Not Allowed).</p>
                                <p className="text-slate-500">Veuillez utiliser le bouton ci-dessus pour créer une nouvelle expédition.</p>
                            </div>
                        </div>
                    ) : (
                        <ConsignmentOrderForm 
                            shops={shops} 
                            onCancel={() => setShowForm(false)} 
                            onSuccess={() => {
                                setShowForm(false)
                                alert("La commande de consignation a été créée.")
                            }} 
                        />
                    )}
                </div>
            )}

            {activeTab === "stock" && (
                <div className="rounded-md border bg-white overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 border-b">
                            <tr>
                                <th className="px-4 py-3 font-medium">Produit (SKU)</th>
                                <th className="px-4 py-3 font-medium">Quantité (FBJ)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {loadingStocks ? (
                                <tr><td colSpan={2} className="text-center py-4 text-slate-500">Chargement...</td></tr>
                            ) : stocks.length === 0 ? (
                                <tr><td colSpan={2} className="text-center py-4 text-slate-500">Aucun stock trouvé ou impossible à récupérer.</td></tr>
                            ) : (
                                stocks.map((s, i) => (
                                    <tr key={i} className="hover:bg-slate-50/50">
                                        <td className="px-4 py-3">{s.sellerSku || s.sku}</td>
                                        <td className="px-4 py-3">{s.quantity || s.stock}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
