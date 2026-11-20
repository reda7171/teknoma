'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useDashboardPrivacy } from './DashboardPrivacyContext'

interface SensitiveValueProps {
    name?: string
    value: string | number
    className?: string
    showInlineEye?: boolean
}

export default function SensitiveValue({
    name = 'CA',
    value,
    className = '',
    showInlineEye = false,
}: SensitiveValueProps) {
    const { isMasked, isSensitive } = useDashboardPrivacy()
    const [localUnmasked, setLocalUnmasked] = useState(false)

    if (!isSensitive(name)) {
        return <span className={className}>{value}</span>
    }

    const hidden = isMasked ? !localUnmasked : localUnmasked

    return (
        <span className={`inline-flex items-center gap-1.5 ${className}`}>
            <span>{hidden ? '**' : value}</span>
            {showInlineEye && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setLocalUnmasked(v => !v)
                    }}
                    className="text-gray-300 hover:text-black transition-colors p-0.5"
                    title={hidden ? 'Afficher' : 'Masquer'}
                >
                    {hidden ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                </button>
            )}
        </span>
    )
}
