'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PackageCheck, PackageX, Loader2 } from 'lucide-react'
import { updateReturnRecoveryStatus } from '@/lib/actions/return-reminders'

interface ReturnRecoveryBadgeButtonProps {
    orderId: string
    initialRecovered: boolean
}

export default function ReturnRecoveryBadgeButton({
    orderId,
    initialRecovered,
}: ReturnRecoveryBadgeButtonProps) {
    const router = useRouter()
    const [isRecovered, setIsRecovered] = useState(initialRecovered)
    const [loading, setLoading] = useState(false)
    const [feedback, setFeedback] = useState<string | null>(null)

    const handleToggle = async () => {
        const nextValue = !isRecovered
        setLoading(true)
        setFeedback(null)
        try {
            const res = await updateReturnRecoveryStatus(orderId, nextValue)
            if (res.success) {
                setIsRecovered(nextValue)
                if (res.stockAction === 'RESTORED') {
                    setFeedback('Colis récupéré — stock réintégré.')
                } else if (res.stockAction === 'DEDUCTED') {
                    setFeedback('Récupération annulée — stock ajusté.')
                }
                router.refresh()
            } else {
                setFeedback(res.error || 'Erreur lors de la mise à jour.')
            }
        } catch {
            setFeedback('Erreur réseau.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col items-end gap-1">
            <button
                type="button"
                onClick={handleToggle}
                disabled={loading}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black border transition-all disabled:opacity-60 ${
                    isRecovered
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                        : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
                }`}
                title={
                    isRecovered
                        ? 'Colis physique récupéré (stock réintégré) — cliquer pour annuler'
                        : 'Déclarer le colis récupéré pour réintégrer le stock'
                }
            >
                {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : isRecovered ? (
                    <PackageCheck className="w-4 h-4 text-emerald-600" />
                ) : (
                    <PackageX className="w-4 h-4 text-rose-600" />
                )}
                <span>{isRecovered ? 'Colis récupéré (Stock OK)' : 'Déclarer colis récupéré'}</span>
            </button>
            {feedback && (
                <span className="text-[11px] font-bold text-gray-700">{feedback}</span>
            )}
        </div>
    )
}

