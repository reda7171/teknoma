'use client'

import { useState } from 'react'
import { RefreshCcw, Loader2, X, CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { bulkSyncDeliveries } from '@/lib/actions/admin-orders'

export default function BulkSyncDeliveryButton() {
    const [loading, setLoading] = useState(false)
    const [showModal, setShowModal] = useState(false)
    const [updatedOrders, setUpdatedOrders] = useState<any[]>([])
    const router = useRouter()

    const handleSync = async () => {
        if (!confirm('Voulez-vous synchroniser le statut de toutes les livraisons en cours ?')) return

        setLoading(true)
        try {
            const data = await bulkSyncDeliveries()

            if (data.success) {
                setUpdatedOrders(data.updatedOrders || [])
                setShowModal(true)
                const errorsText = data.errors?.join('\n')
                if (errorsText) {
                    setTimeout(() => alert(`Attention, des erreurs sont survenues :\n${errorsText}`), 500)
                }
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
        <>
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

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                    <CheckCircle2 className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-gray-900">Synchronisation réussie</h3>
                                    <p className="text-sm text-gray-500 font-medium">
                                        {updatedOrders.length} commande(s) mise(s) à jour
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto flex-1 bg-gray-50/50">
                            {updatedOrders.length > 0 ? (
                                <div className="space-y-3">
                                    {updatedOrders.map((order: any, idx: number) => (
                                        <div key={idx} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-black bg-blue-50 text-blue-700 px-2 py-1 rounded-md">{order.company}</span>
                                                    <span className="text-sm font-bold text-gray-900">{order.trackingID}</span>
                                                </div>
                                                <p className="text-sm font-medium text-gray-600">{order.fullName} - {order.city}</p>
                                                <p className="text-xs text-gray-400">{order.phone}</p>
                                            </div>
                                            <div className="flex items-center gap-3 bg-gray-50 px-4 py-2 rounded-xl">
                                                <span className="text-xs font-bold text-gray-500 line-through">{order.oldStatus}</span>
                                                <span className="text-gray-300">→</span>
                                                <span className="text-sm font-black text-green-600">{order.newStatus}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <p className="text-gray-500 font-medium">Aucun changement de statut détecté depuis la dernière synchronisation.</p>
                                </div>
                            )}
                        </div>
                        
                        <div className="p-4 border-t border-gray-100 flex justify-end">
                            <button 
                                onClick={() => setShowModal(false)}
                                className="px-6 py-2 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-colors"
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
