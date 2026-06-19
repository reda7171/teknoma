'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { bulkDeleteOrders } from '@/lib/actions/admin-orders'
import { useRouter } from 'next/navigation'

export default function DeleteOrderButton({ orderId }: { orderId: string }) {
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleDelete = async () => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette commande définitivement ?')) return

        setLoading(true)
        try {
            const res = await bulkDeleteOrders([orderId])
            if (res.success) {
                // Redirige vers la liste des commandes (/fr/admin/orders)
                const listUrl = window.location.pathname.split('/').slice(0, -1).join('/')
                router.replace(listUrl)
            } else {
                alert(res.error || 'Erreur lors de la suppression')
            }
        } catch (error) {
            console.error(error)
            alert('Erreur serveur')
        } finally {
            setLoading(false)
        }
    }

    return (
        <button
            onClick={handleDelete}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg border border-red-100 hover:bg-red-100 transition-colors text-sm font-bold disabled:opacity-50"
            title="Supprimer la commande"
        >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">{loading ? 'Suppression...' : 'Supprimer'}</span>
        </button>
    )
}
