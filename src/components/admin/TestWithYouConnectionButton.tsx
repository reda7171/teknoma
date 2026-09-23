'use client'

import { useState } from 'react'
import { Activity } from 'lucide-react'
import { testWithYouConnection } from '@/lib/actions/test-connection'

export default function TestWithYouConnectionButton() {
    const [loading, setLoading] = useState(false)

    const handleTest = async () => {
        setLoading(true)
        try {
            const result = await testWithYouConnection()
            if (result.success) {
                alert(`✅ ${result.message}`)
            } else {
                alert(`❌ Échec de la connexion: ${result.message}`)
            }
        } catch (error) {
            alert("❌ Erreur inattendue.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <button
            onClick={handleTest}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl transition-all disabled:opacity-50"
        >
            <Activity className={`w-4 h-4 ${loading ? 'animate-pulse' : ''}`} />
            <span>{loading ? 'Test en cours...' : 'Tester connexion WithYou'}</span>
        </button>
    )
}
