'use client'

import { useState } from 'react'
import { Truck, Loader2, CheckCircle, Edit2, Check, X } from 'lucide-react'
import { syncOrderToShippingCompany, updateOrderTrackingId } from '@/lib/actions/admin-orders'
import { useRouter } from 'next/navigation'

interface DeliverySyncButtonProps {
    orderId: string
    trackingID?: string | null
    deliveryStatus?: string | null
    shippingCompanyId?: string | null
    companies?: { id: string; name: string }[]
    defaultCompanyId?: string | null
}

export default function DeliverySyncButton({
    orderId,
    trackingID,
    deliveryStatus,
    shippingCompanyId,
    companies = [],
    defaultCompanyId
}: DeliverySyncButtonProps) {
    const [loading, setLoading] = useState(false)
    const [isEditingTracking, setIsEditingTracking] = useState(false)
    const [manualTrackingID, setManualTrackingID] = useState(trackingID || '')
    const [selectedCompany, setSelectedCompany] = useState<string>(() => {
        if (defaultCompanyId && companies.some(c => c.id === defaultCompanyId)) {
            return defaultCompanyId
        }
        return ''
    })
    const router = useRouter()

    const handleSync = async () => {
        if (!selectedCompany) {
            alert('Veuillez sélectionner une société de livraison')
            return
        }

        const comp = companies.find(c => c.id === selectedCompany)
        if (!confirm(`Voulez-vous envoyer cette commande à ${comp?.name} ?`)) return

        setLoading(true)
        try {
            const result = await syncOrderToShippingCompany(orderId, selectedCompany)
            if (result.success) {
                router.refresh()
            } else {
                alert(result.error)
            }
        } catch (error) {
            alert('Une erreur est survenue')
        } finally {
            setLoading(false)
        }
    }

    const handleSaveTracking = async () => {
        if (!manualTrackingID.trim()) return
        
        // Si la compagnie n'est pas déjà définie, il faut en choisir une
        if (!shippingCompanyId && !selectedCompany) {
            alert("Veuillez sélectionner un transporteur avant de lier le Code Colis.")
            return
        }

        setLoading(true)
        try {
            const res = await updateOrderTrackingId(
                orderId, 
                manualTrackingID.trim(),
                shippingCompanyId ? undefined : selectedCompany
            )
            if (res.success) {
                setIsEditingTracking(false)
                router.refresh()
            } else {
                alert(res.error)
            }
        } catch (error) {
            alert("Erreur lors de la mise à jour")
        } finally {
            setLoading(false)
        }
    }

    if (trackingID || deliveryStatus === 'CREATED') {
        const companyName = companies.find(c => c.id === shippingCompanyId)?.name || 'le transporteur'
        return (
            <div className="flex flex-col gap-3">
                <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <div>
                            <p className="text-[10px] font-black text-green-700 uppercase tracking-widest leading-none">Expédié via {companyName}</p>
                            {isEditingTracking ? (
                                <div className="mt-2 flex items-center gap-2">
                                    <input 
                                        type="text" 
                                        value={manualTrackingID}
                                        onChange={(e) => setManualTrackingID(e.target.value)}
                                        className="px-2 py-1 text-sm border rounded"
                                        placeholder="Code Colis"
                                    />
                                    <button onClick={handleSaveTracking} disabled={loading} className="p-1 bg-green-200 text-green-800 rounded">
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    </button>
                                    <button onClick={() => setIsEditingTracking(false)} disabled={loading} className="p-1 bg-gray-200 text-gray-800 rounded">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="mt-1 flex items-center gap-2">
                                    <p className="text-sm font-black text-green-900 tracking-tighter">ID: {trackingID || 'Non défini'}</p>
                                    <button onClick={() => setIsEditingTracking(true)} className="text-green-700 hover:text-green-900 transition-colors" title="Modifier le Code Colis">
                                        <Edit2 className="w-3 h-3" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-3">
            {companies.length > 0 ? (
                <select
                    value={selectedCompany}
                    onChange={(e) => setSelectedCompany(e.target.value)}
                    disabled={loading}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                    <option value="">Sélectionner un transporteur...</option>
                    {companies.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
            ) : (
                <p className="text-sm text-red-500 font-bold text-center">Aucun transporteur configuré</p>
            )}

            <button
                onClick={handleSync}
                disabled={loading || !selectedCompany || companies.length === 0}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 disabled:opacity-50"
            >
                {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <Truck className="w-4 h-4" />
                )}
                Envoyer la commande
            </button>
            
            {isEditingTracking ? (
                <div className="flex items-center gap-2 mt-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <input 
                        type="text" 
                        value={manualTrackingID}
                        onChange={(e) => setManualTrackingID(e.target.value)}
                        className="flex-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                        placeholder="Saisir le Code Colis manuel"
                    />
                    <button onClick={handleSaveTracking} disabled={loading} className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    </button>
                    <button onClick={() => setIsEditingTracking(false)} disabled={loading} className="p-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <button 
                    onClick={() => setIsEditingTracking(true)}
                    className="text-xs font-bold text-blue-600 text-center hover:underline mt-1"
                >
                    Ou lier manuellement un Code Colis (Tracking ID)
                </button>
            )}
        </div>
    )
}
