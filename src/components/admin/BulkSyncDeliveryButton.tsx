'use client'

import { useState } from 'react'
import { RefreshCcw, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { bulkSyncDeliveries } from '@/lib/actions/admin-orders'

export default function BulkSyncDeliveryButton() {
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleSync = async () => {
        if (!confirm('Voulez-vous synchroniser le statut de toutes les livraisons en cours ?')) return

        setLoading(true)
        try {
            const data = await bulkSyncDeliveries()

            if (data.success) {
                alert(`Synchronisation terminée ! ${data.updatedCount} commandes mises à jour.`)
                router.refresh()
            } else {
                alert(`Erreur: ${data.error}`)
            }
        } catch (error) {
            alert('Une erreur est survenue lors de la synchronisation.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <button
            onClick={handleSync}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-xl font-bold text-xs uppercase tracking-widest transition-colors disabled:opacity-50"
            title="Synchroniser toutes les livraisons avec WithYou/Olivraison"
        >
            {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
                <RefreshCcw className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Sync Livraisons</span>
        </button>
    )
}
