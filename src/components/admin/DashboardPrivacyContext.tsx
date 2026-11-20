'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

interface DashboardPrivacyContextType {
    isMasked: boolean
    togglePrivacy: () => void
    setPrivacy: (masked: boolean) => void
    unmaskedKeys: Record<string, boolean>
    toggleKeyPrivacy: (key: string) => void
    isSensitive: (name?: string) => boolean
    formatValue: (name: string, value: string | number) => string | number
}

const STORAGE_KEY = 'tekno_dashboard_privacy_mode'

export function isSensitiveMetric(name?: string): boolean {
    if (!name) return false
    const lower = name.toLowerCase().trim()
    return (
        lower.startsWith('ca') ||
        lower.includes('ca ') ||
        lower.includes('(ca)') ||
        lower.includes('ca(') ||
        lower.includes('commande') ||
        lower.includes('cmd') ||
        lower.includes('ltv') ||
        lower.includes('panier') ||
        lower.includes('revenu') ||
        lower.includes('revenue') ||
        lower.includes('profit') ||
        lower.includes('ventes') ||
        lower.includes('conversion') ||
        lower.includes('annulation') ||
        lower.includes('payée') ||
        lower.includes('payee') ||
        lower.includes('attente') ||
        lower.includes('livraison') ||
        lower.includes('confirmée') ||
        lower.includes('confirmee') ||
        lower.includes('retour') ||
        lower.includes('utilisateur') ||
        lower.includes('vendu') ||
        lower.includes('expédiée') ||
        lower.includes('expediee') ||
        lower.includes('livrée') ||
        lower.includes('livree') ||
        lower.includes('montant') ||
        lower.includes('valeur') ||
        lower.includes('mad') ||
        lower.includes('درهم')
    )
}

const DashboardPrivacyContext = createContext<DashboardPrivacyContextType>({
    isMasked: true,
    togglePrivacy: () => {},
    setPrivacy: () => {},
    unmaskedKeys: {},
    toggleKeyPrivacy: () => {},
    isSensitive: isSensitiveMetric,
    formatValue: (_name, value) => value,
})

export function DashboardPrivacyProvider({ children }: { children: React.ReactNode }) {
    // Par défaut caché sous forme "**" selon la règle utilisateur
    const [isMasked, setIsMasked] = useState<boolean>(true)
    const [unmaskedKeys, setUnmaskedKeys] = useState<Record<string, boolean>>({})
    const [mounted, setMounted] = useState<boolean>(false)

    useEffect(() => {
        setMounted(true)
        try {
            const saved = localStorage.getItem(STORAGE_KEY)
            if (saved !== null) {
                setIsMasked(saved === 'true')
            } else {
                setIsMasked(true)
            }
        } catch {
            setIsMasked(true)
        }
    }, [])

    const togglePrivacy = () => {
        setIsMasked(prev => {
            const next = !prev
            try {
                localStorage.setItem(STORAGE_KEY, String(next))
            } catch {}
            // Réinitialise les exceptions individuelles quand on bascule le mode global
            setUnmaskedKeys({})
            return next
        })
    }

    const setPrivacy = (masked: boolean) => {
        setIsMasked(masked)
        try {
            localStorage.setItem(STORAGE_KEY, String(masked))
        } catch {}
    }

    const toggleKeyPrivacy = (key: string) => {
        setUnmaskedKeys(prev => ({
            ...prev,
            [key]: !prev[key]
        }))
    }

    const formatValue = (name: string, value: string | number): string | number => {
        if (!isSensitiveMetric(name)) return value

        // Prévention flash de données sensibles avant hydratation client
        if (!mounted) return '**'

        const isLocallyUnmasked = unmaskedKeys[name]
        const shouldMask = isMasked ? !isLocallyUnmasked : isLocallyUnmasked

        return shouldMask ? '**' : value
    }

    return (
        <DashboardPrivacyContext.Provider
            value={{
                isMasked,
                togglePrivacy,
                setPrivacy,
                unmaskedKeys,
                toggleKeyPrivacy,
                isSensitive: isSensitiveMetric,
                formatValue
            }}
        >
            {children}
        </DashboardPrivacyContext.Provider>
    )
}

export function useDashboardPrivacy() {
    return useContext(DashboardPrivacyContext)
}
