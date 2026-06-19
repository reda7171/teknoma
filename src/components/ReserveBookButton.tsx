'use client'

import { useState } from 'react'
import { Bell, X } from 'lucide-react'
import { useUIStore } from '@/store/ui'

export default function ReserveBookButton({ bookId }: { bookId: string }) {
    const [isOpen, setIsOpen] = useState(false)
    const [whatsapp, setWhatsapp] = useState('')
    const [loading, setLoading] = useState(false)
    const { showNotification } = useUIStore()

    const handleReserve = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!whatsapp) return

        setLoading(true)
        try {
            const res = await fetch('/api/books/reserve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bookId, whatsapp })
            })

            if (res.ok) {
                showNotification('Réservation confirmée. Nous vous contacterons sur WhatsApp.', 'success')
                setIsOpen(false)
                setWhatsapp('')
            } else {
                showNotification('Erreur lors de la réservation.', 'error')
            }
        } catch (error) {
            showNotification('Erreur de connexion.', 'error')
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="w-full flex items-center justify-center gap-2 py-4 mt-4 bg-black text-white text-xs font-black uppercase tracking-widest rounded-full hover:bg-gray-800 transition-colors shadow-2xl hover:shadow-black/20"
            >
                <Bell className="w-4 h-4" />
                Réserver le livre
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in duration-300">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-black transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        <h3 className="text-xl font-black text-black uppercase tracking-widest mb-4">
                            Réserver ce livre
                        </h3>
                        <p className="text-sm text-gray-500 font-medium mb-6">
                            Laissez votre numéro WhatsApp. Nous vous informerons dès que le stock sera réapprovisionné.
                        </p>
                        <form onSubmit={handleReserve} className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-2">
                                    Numéro WhatsApp
                                </label>
                                <input
                                    type="tel"
                                    value={whatsapp}
                                    onChange={(e) => setWhatsapp(e.target.value)}
                                    placeholder="+212 6..."
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-[1.5rem] focus:outline-none focus:ring-2 focus:ring-black text-sm font-bold"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-black text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-[1.5rem] hover:bg-gray-800 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                            >
                                {loading ? 'En cours...' : 'Confirmer la réservation'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
