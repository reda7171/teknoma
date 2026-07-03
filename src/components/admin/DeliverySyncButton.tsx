'use client'

import { useState } from 'react'
import { Truck, Loader2, CheckCircle } from 'lucide-react'
import { syncOrderToShippingCompany } from '@/lib/actions/admin-orders'
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

    if (trackingID || deliveryStatus === 'CREATED') {
        const companyName = companies.find(c => c.id === shippingCompanyId)?.name || 'le transporteur'
        return (
            <div className="flex flex-col gap-3">
                <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <div>
                        <p className="text-[10px] font-black text-green-700 uppercase tracking-widest leading-none">Expédié via {companyName}</p>
                        {trackingID && <p className="mt-1 text-sm font-black text-green-900 tracking-tighter">ID: {trackingID}</p>}
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
        </div>
    )
}
