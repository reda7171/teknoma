'use client'

import { useState } from 'react'
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'
import { checkJumiaAvailability } from '@/lib/actions/jumia'
import { useRouter } from 'next/navigation'

export default function CheckJumiaAvailabilityButton() {
    const [loading, setLoading] = useState(false)
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
    const router = useRouter()

    const handleSync = async () => {
        setLoading(true)
        setToast(null)
        try {
            const res = await checkJumiaAvailability()
            if (res.success) {
                setToast({ msg: res.message, ok: true })
                router.refresh()
            } else {
                setToast({ msg: res.message, ok: false })
            }
        } catch (error: any) {
            setToast({ msg: "Erreur: " + error.message, ok: false })
        } finally {
            setLoading(false)
            setTimeout(() => setToast(null), 6000)
        }
    }

    return (
        <>
            {toast && (
                <div className={`fixed top-6 right-6 z-[9999] px-5 py-3 rounded-2xl shadow-2xl text-xs font-bold transition-all flex items-center gap-2 animate-in slide-in-from-top-2 border ${
                    toast.ok ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-red-600 text-white border-red-500'
                }`}>
                    {toast.ok ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                    <span>{toast.msg}</span>
                </div>
            )}
            <button
                onClick={handleSync}
                disabled={loading}
                title="Vérifier tous les Seller SKU du catalogue contre l'API Jumia Vendor"
                className="inline-flex items-center px-4 py-2 bg-orange-50 text-orange-700 font-bold text-xs rounded-xl border border-orange-200 hover:bg-orange-100 transition shadow-xs disabled:opacity-50 cursor-pointer"
            >
                <RefreshCw className={`w-3.5 h-3.5 mr-2 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Audit Jumia en cours...' : 'Audit Liens Jumia (Seller SKU)'}
            </button>
        </>
    )
}
