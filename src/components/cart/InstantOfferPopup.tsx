'use client'

import React, { useEffect, useState } from 'react'
import { useCartStore } from '@/store/cart'
import { Gift, X } from 'lucide-react'
import Confetti from 'react-confetti'

export default function InstantOfferPopup() {
    const sessionId = useCartStore(state => state.sessionId)
    const applyDiscount = useCartStore(state => state.applyDiscount)
    const discount = useCartStore(state => state.discount)
    const [offer, setOffer] = useState<{ id: string, discount: number } | null>(null)
    const [showConfetti, setShowConfetti] = useState(false)

    useEffect(() => {
        if (!sessionId) return

        let timeoutId: ReturnType<typeof setTimeout> | undefined
        let cancelled = false
        let consecutiveFailures = 0

        const checkOffer = async () => {
            let abortId: ReturnType<typeof setTimeout> | undefined
            try {
                const controller = new AbortController()
                abortId = setTimeout(() => controller.abort(), 8000)
                const res = await fetch(`/api/cart/offer?sessionId=${encodeURIComponent(sessionId)}`, {
                    cache: 'no-store',
                    signal: controller.signal
                })
                if (res.ok) {
                    const data = await res.json()
                    consecutiveFailures = 0
                    if (!cancelled && data.offer?.id) {
                        setOffer(data.offer)
                    }
                } else {
                    consecutiveFailures += 1
                }
            } catch {
                consecutiveFailures += 1
            } finally {
                if (abortId) clearTimeout(abortId)
                if (!cancelled) {
                    timeoutId = setTimeout(checkOffer, consecutiveFailures > 0 ? 60000 : 15000)
                }
            }
        }

        void checkOffer()
        return () => {
            cancelled = true
            if (timeoutId) clearTimeout(timeoutId)
        }
    }, [sessionId])

    useEffect(() => {
        if (offer && (!discount || discount < offer.discount)) {
            const audio = new Audio('/notification.mp3')
            audio.play().catch(e => console.error('Audio play failed:', e))
        }
    }, [offer, discount])


    const handleAccept = async () => {
        if (!offer) return
        try {
            await fetch('/api/cart/offer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ offerId: offer.id, sessionId, status: 'ACCEPTED' })
            })
            applyDiscount(offer.discount)
            setShowConfetti(true)
            setTimeout(() => {
                setOffer(null)
                setShowConfetti(false)
            }, 4000)
        } catch (error) {
            console.error('Error accepting offer:', error)
        }
    }

    const handleReject = async () => {
        if (!offer) return
        try {
            await fetch('/api/cart/offer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ offerId: offer.id, sessionId, status: 'REJECTED' })
            })
            setOffer(null)
        } catch (error) {
            console.error('Error rejecting offer:', error)
        }
    }

    if (!offer) return null
    if (discount && discount >= offer.discount) return null // Already applied

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            {showConfetti && <Confetti recycle={false} numberOfPieces={300} />}
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative animate-in zoom-in duration-300">
                <button aria-label="Fermer"
                    onClick={handleReject}
                    className="absolute top-4 right-4 text-gray-400 hover:text-black transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="flex flex-col items-center text-center mt-4">
                    <div className="w-16 h-16 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mb-4">
                        <Gift className="w-8 h-8" />
                    </div>

                    <h2 className="text-2xl font-black mb-2 uppercase">Offre Spéciale !</h2>
                    <p className="text-gray-600 mb-6 font-medium leading-relaxed">
                        Coucou 👋 ! Je vois que vous êtes en train de passer commande. Je suis avec vous en ligne et je vous offre une réduction immédiate de <strong className="text-amber-500 font-black text-xl">{offer.discount} درهم</strong> sur votre panier !
                    </p>

                    <a
                        href="https://wa.me/212702220575?text=Bonjour,%20j%27ai%20besoin%20d%27aide%20pour%20ma%20commande"
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-3 px-4 mb-4 rounded-xl font-bold bg-[#E8F8EE] text-[#1EBE5D] hover:bg-[#D1F2DD] transition-colors"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
                        </svg>
                        Je suis en ligne sur WhatsApp !
                    </a>

                    <div className="flex gap-3 w-full">
                        <button
                            onClick={handleReject}
                            className="flex-1 py-3 px-4 rounded-xl font-bold border-2 border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                            Non merci
                        </button>
                        <button
                            onClick={handleAccept}
                            className="flex-1 py-3 px-4 rounded-xl font-bold bg-black text-white hover:bg-gray-800 hover:shadow-lg transition-all active:scale-95 uppercase tracking-wider text-sm"
                        >
                            Accepter
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
