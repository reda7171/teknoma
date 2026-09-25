'use client'

import { useState } from 'react'
import { Bell, X } from 'lucide-react'
import { useUIStore } from '@/store/ui'

import { useLocale } from 'next-intl'

export default function ReserveBookButton({ bookId }: { bookId: string }) {
    const [isOpen, setIsOpen] = useState(false)
    const [whatsapp, setWhatsapp] = useState('')
    const [loading, setLoading] = useState(false)
    const { showNotification } = useUIStore()
    const locale = useLocale()

    const t = {
        success: locale === 'ar' ? 'تم تأكيد الحجز. سنتواصل معك على واتساب.' : locale === 'en' ? 'Reservation confirmed. We will contact you on WhatsApp.' : 'Réservation confirmée. Nous vous contacterons sur WhatsApp.',
        error: locale === 'ar' ? 'حدث خطأ أثناء الحجز.' : locale === 'en' ? 'Error during reservation.' : 'Erreur lors de la réservation.',
        networkError: locale === 'ar' ? 'خطأ في الاتصال.' : locale === 'en' ? 'Connection error.' : 'Erreur de connexion.',
        reserve: locale === 'ar' ? 'احجز الكتاب' : locale === 'en' ? 'Reserve book' : 'Réserver le livre',
        reserveTitle: locale === 'ar' ? 'احجز هذا الكتاب' : locale === 'en' ? 'Reserve this book' : 'Réserver ce livre',
        description: locale === 'ar' ? 'اترك رقم واتساب الخاص بك. سنعلمك بمجرد توفر المخزون.' : locale === 'en' ? 'Leave your WhatsApp number. We will notify you as soon as the stock is replenished.' : 'Laissez votre numéro WhatsApp. Nous vous informerons dès que le stock sera réapprovisionné.',
        whatsapp: locale === 'ar' ? 'رقم الواتساب' : locale === 'en' ? 'WhatsApp Number' : 'Numéro WhatsApp',
        loading: locale === 'ar' ? 'جاري...' : locale === 'en' ? 'Loading...' : 'En cours...',
        confirm: locale === 'ar' ? 'تأكيد الحجز' : locale === 'en' ? 'Confirm reservation' : 'Confirmer la réservation',
    }

    const handleReserve = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!whatsapp) return

        const cleanPhone = whatsapp.replace(/\s/g, '')
        const phoneRegex = /^(0[67]\d{8}|\+212[67]\d{8})$/
        
        if (!phoneRegex.test(cleanPhone)) {
            showNotification(locale === 'ar' ? 'رقم الهاتف غير صالح' : locale === 'en' ? 'Invalid phone number' : 'Numéro de téléphone invalide', 'error')
            return
        }

        setLoading(true)
        try {
            const res = await fetch('/api/books/reserve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bookId, whatsapp })
            })

            if (res.ok) {
                showNotification(t.success, 'success')
                setIsOpen(false)
                setWhatsapp('')
            } else {
                showNotification(t.error, 'error')
            }
        } catch (error) {
            showNotification(t.networkError, 'error')
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
                {t.reserve}
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
                    <div className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in duration-300">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="absolute top-4 right-4 rtl:left-4 rtl:right-auto text-gray-400 hover:text-black transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        <h3 className="text-xl font-black text-black uppercase tracking-widest mb-4">
                            {t.reserveTitle}
                        </h3>
                        <p className="text-sm text-gray-500 font-medium mb-6">
                            {t.description}
                        </p>
                        <form onSubmit={handleReserve} className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-black uppercase tracking-widest mb-2">
                                    {t.whatsapp}
                                </label>
                                <input
                                    type="tel"
                                    value={whatsapp}
                                    onChange={(e) => setWhatsapp(e.target.value)}
                                    placeholder="+212 6..."
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-[1.5rem] focus:outline-none focus:ring-2 focus:ring-black text-sm font-bold text-left rtl:text-right"
                                    required
                                    dir="ltr"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-black text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-[1.5rem] hover:bg-gray-800 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
                            >
                                {loading ? t.loading : t.confirm}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
