'use client'

import { Eye, EyeOff } from 'lucide-react'
import { useDashboardPrivacy } from './DashboardPrivacyContext'

interface DashboardPrivacyToggleProps {
    className?: string
    showLabel?: boolean
}

export default function DashboardPrivacyToggle({
    className = '',
    showLabel = true,
}: DashboardPrivacyToggleProps) {
    const { isMasked, togglePrivacy } = useDashboardPrivacy()

    return (
        <button
            id="dashboard-privacy-toggle"
            type="button"
            onClick={togglePrivacy}
            className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest active:scale-95 shadow-sm border ${
                isMasked
                    ? 'bg-blue-50/80 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-black hover:text-black'
            } ${className}`}
            title={isMasked ? 'Afficher les données sensibles' : 'Masquer les données sensibles (**)'}
            aria-label={isMasked ? 'Afficher les données sensibles' : 'Masquer les données sensibles'}
        >
            {isMasked ? (
                <>
                    <Eye className="w-4 h-4 text-blue-600" />
                    {showLabel && <span>Afficher chiffres</span>}
                </>
            ) : (
                <>
                    <EyeOff className="w-4 h-4 text-gray-400" />
                    {showLabel && <span>Masquer (**)</span>}
                </>
            )}
        </button>
    )
}
