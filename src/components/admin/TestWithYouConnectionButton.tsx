'use client'

import { useState } from 'react'
import { Activity, CheckCircle2, AlertCircle } from 'lucide-react'
import { testWithYouConnection } from '@/lib/actions/test-connection'

export default function TestWithYouConnectionButton() {
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState<{ success: boolean; message: string } | null>(null)

    const handleTest = async () => {
        setLoading(true)
        setStatus(null)
        try {
            const result = await testWithYouConnection()
            setStatus(result)
        } catch (error: any) {
            setStatus({ success: false, message: error?.message || 'Erreur inattendue' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col gap-2">
            <button
                type="button"
                onClick={handleTest}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl transition-all disabled:opacity-50 text-sm shadow-sm"
            >
                <Activity className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>{loading ? 'Test en cours...' : 'Tester connexion WithYou'}</span>
            </button>
            {status && (
                <div
                    className={`flex items-start gap-2 p-3 rounded-lg text-xs leading-relaxed border ${
                        status.success
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                    }`}
                >
                    {status.success ? (
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                    ) : (
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                    )}
                    <span>{status.message}</span>
                </div>
            )}
        </div>
    )
}
