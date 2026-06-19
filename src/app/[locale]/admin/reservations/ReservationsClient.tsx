'use client'

import { useState } from 'react'
import { updateReservationStatus, deleteReservation } from '@/lib/actions/admin-reservations'
import { MessageCircle, Trash2, CheckCircle, Clock } from 'lucide-react'
import ImageWithFallback from '@/components/ImageWithFallback'
import { normalizeImage } from '@/lib/utils'

interface Reservation {
    id: string
    bookId: string
    whatsapp: string
    status: string
    createdAt: Date
    updatedAt: Date
    book: {
        title: string
        image: string | null
    }
}

export default function ReservationsClient({ initialReservations }: { initialReservations: any[] }) {
    const [reservations, setReservations] = useState<Reservation[]>(initialReservations)
    const [isLoading, setIsLoading] = useState<string | null>(null)

    const handleStatusChange = async (id: string, newStatus: string) => {
        setIsLoading(id)
        try {
            const res = await updateReservationStatus(id, newStatus)
            if (res.success) {
                setReservations(reservations.map(r => r.id === id ? { ...r, status: newStatus } : r))
            } else {
                alert('Erreur: ' + res.error)
            }
        } finally {
            setIsLoading(null)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette réservation ?')) return

        setIsLoading(id)
        try {
            const res = await deleteReservation(id)
            if (res.success) {
                setReservations(reservations.filter(r => r.id !== id))
            } else {
                alert('Erreur: ' + res.error)
            }
        } finally {
            setIsLoading(null)
        }
    }

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Livre</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">WhatsApp</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Date</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Statut</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {reservations.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-500 font-medium">
                                    Aucune réservation trouvée
                                </td>
                            </tr>
                        ) : (
                            reservations.map((res) => (
                                <tr key={res.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            {res.book.image ? (
                                                <div className="w-12 h-16 relative rounded-lg overflow-hidden shrink-0 shadow-sm">
                                                    <ImageWithFallback
                                                        src={normalizeImage(res.book.image)}
                                                        alt={res.book.title}
                                                        className="object-cover"
                                                        fallback="/placeholder.png"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="w-12 h-16 bg-gray-100 rounded-lg shrink-0 flex items-center justify-center">
                                                    <span className="text-gray-400 text-xs">No img</span>
                                                </div>
                                            )}
                                            <span className="font-bold text-gray-900 line-clamp-2 max-w-xs">{res.book.title}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900">{res.whatsapp}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-500">
                                            {new Date(res.createdAt).toLocaleDateString('fr-FR', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {res.status === 'PENDING' ? (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold uppercase tracking-widest rounded-full border border-amber-200">
                                                <Clock className="w-3.5 h-3.5" />
                                                En attente
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-widest rounded-full border border-emerald-200">
                                                <CheckCircle className="w-3.5 h-3.5" />
                                                Notifié
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        <a
                                            href={`https://wa.me/${res.whatsapp.replace(/\D/g, '')}?text=Bonjour, nous vous contactons concernant votre réservation pour le livre "${res.book.title}" sur Riwaya.`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center justify-center p-2 text-green-600 hover:bg-green-50 rounded-xl transition-colors"
                                            title="Contacter sur WhatsApp"
                                        >
                                            <MessageCircle className="w-5 h-5" />
                                        </a>

                                        {res.status === 'PENDING' && (
                                            <button
                                                onClick={() => handleStatusChange(res.id, 'NOTIFIED')}
                                                disabled={isLoading === res.id}
                                                className="inline-flex items-center justify-center p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors disabled:opacity-50"
                                                title="Marquer comme notifié"
                                            >
                                                <CheckCircle className="w-5 h-5" />
                                            </button>
                                        )}

                                        <button
                                            onClick={() => handleDelete(res.id)}
                                            disabled={isLoading === res.id}
                                            className="inline-flex items-center justify-center p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
                                            title="Supprimer"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
