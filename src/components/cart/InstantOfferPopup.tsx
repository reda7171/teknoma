'use client'

import React, { useEffect, useState } from 'react'
import { useCartStore } from '@/store/cart'
import { Gift, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Confetti from 'react-confetti'

export default function InstantOfferPopup() {
    const sessionId = useCartStore(state => state.sessionId)
    const applyDiscount = useCartStore(state => state.applyDiscount)
    const discount = useCartStore(state => state.discount)
    const [offer, setOffer] = useState<{ id: string, discount: number } | null>(null)
    const t = useTranslations('Common')
    const [showConfetti, setShowConfetti] = useState(false)

    useEffect(() => {
        if (!sessionId) return

        const checkOffer = async () => {
            try {
                const res = await fetch(`/api/cart/offer?sessionId=${sessionId}`)
                if (res.ok) {
                    const data = await res.json()
                    if (data.offer && data.offer.id) {
                        setOffer(data.offer)
                    }
                }
            } catch (error) {
                console.error('Error checking offer:', error)
            }
        }

        // Poll every 5 seconds
        const interval = setInterval(checkOffer, 5000)
        return () => clearInterval(interval)
    }, [sessionId])

    const handleAccept = async () => {
        if (!offer) return
        try {
            await fetch('/api/cart/offer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ offerId: offer.id, status: 'ACCEPTED' })
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
                body: JSON.stringify({ offerId: offer.id, status: 'REJECTED' })
            })
            setOffer(null)
        } catch (error) {
            console.error('Error rejecting offer:', error)
        }
    }

    if (!offer) return null
    if (discount && discount >= offer.discount) return null // Already applied

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            {showConfetti && <Confetti recycle={false} numberOfPieces={300} />}
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative animate-in zoom-in duration-300">
                <button 
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
                    <p className="text-gray-600 mb-6">
                        L'équipe Riwaya vient de vous offrir une réduction immédiate de <strong className="text-black text-xl">{offer.discount} MAD</strong> sur votre panier actuel !
                    </p>
                    
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
