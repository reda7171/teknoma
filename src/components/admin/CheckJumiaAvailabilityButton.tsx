'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { checkJumiaAvailability } from '@/lib/actions/jumia'
import { useRouter } from 'next/navigation'

export default function CheckJumiaAvailabilityButton() {
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleSync = async () => {
        if (!confirm("Voulez-vous vérifier la disponibilité de tous les produits sur Jumia ? Cette action peut prendre quelques secondes.")) return
        
        setLoading(true)
        try {
            const res = await checkJumiaAvailability()
            if (res.success) {
                alert(res.message)
                router.refresh()
            } else {
                alert(res.message)
            }
        } catch (error: any) {
            alert("Erreur: " + error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <button
            onClick={handleSync}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 bg-green-50 text-green-700 font-bold text-sm rounded-xl hover:bg-green-100 transition-colors disabled:opacity-50"
        >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Vérification...' : 'Vérifier dispo Jumia'}
        </button>
    )
}
