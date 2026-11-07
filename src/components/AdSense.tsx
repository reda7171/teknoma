'use client'

import Script from 'next/script'

interface AdSenseProps {
    publisherId: string
    isEnabled: boolean
}

export default function AdSense({ publisherId, isEnabled }: AdSenseProps) {
    if (!isEnabled || !publisherId) return null

    // Ne pas charger les annonces sur localhost ou dans les environnements de test CI
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname
        if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
            return null
        }
        if ((window as any).adsbygoogle) {
            return null
        }
    }

    // Formatage du publisher ID s'il manque le préfixe ca-pub-
    const fullId = publisherId.startsWith('ca-pub-') ? publisherId : `ca-pub-${publisherId}`

    return (
        <Script
            id="adsbygoogle-init"
            strategy="lazyOnload"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${fullId}`}
            crossOrigin="anonymous"
        />
    )
}
