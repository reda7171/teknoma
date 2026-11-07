'use client'

import { useEffect } from 'react'

interface AdBannerProps {
    publisherId: string
    slotId: string
    format?: 'auto' | 'fluid' | 'rectangle' | 'vertical' | 'horizontal'
    responsive?: boolean
    className?: string
    label?: string
    preview?: boolean
}

export default function AdBanner({
    publisherId,
    slotId,
    format = 'auto',
    responsive = true,
    className = '',
    label = 'Publicité',
    preview = false
}: AdBannerProps) {
    useEffect(() => {
        if (!publisherId || !slotId) return
        try {
            // @ts-ignore
            (window.adsbygoogle = window.adsbygoogle || []).push({})
        } catch (err) {
            console.error('AdSense error:', err)
        }
    }, [publisherId, slotId])

    // Si pas de configuration, ne rien afficher hors du mode preview explicite
    if (!publisherId || !slotId) {
        if (!preview) return null
        return (
            <div className={`my-8 w-full flex justify-center ${className}`}>
                <div className="w-full max-w-2xl border-2 border-dashed border-orange-300 bg-orange-50 rounded-2xl flex flex-col items-center justify-center py-8 px-4 gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">Espace Publicitaire</span>
                    <span className="text-lg font-black text-orange-500">{label}</span>
                    <span className="text-[10px] text-orange-400 font-bold">
                        {slotId ? 'Slot: ' + slotId : 'Aucun Slot ID configuré'}
                    </span>
                    <span className="text-[9px] text-orange-300 mt-1">
                        Configurez AdSense dans Admin → Google AdSense
                    </span>
                </div>
            </div>
        )
    }

    if (preview) {
        return (
            <div className={`my-8 w-full flex justify-center ${className}`}>
                <div className="w-full max-w-2xl border-2 border-dashed border-orange-300 bg-orange-50 rounded-2xl flex flex-col items-center justify-center py-8 px-4 gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">Espace Publicitaire</span>
                    <span className="text-lg font-black text-orange-500">{label}</span>
                    <span className="text-[10px] text-orange-400 font-bold">
                        Slot: {slotId}
                    </span>
                </div>
            </div>
        )
    }

    // Formatage du publisher ID
    const fullId = publisherId.startsWith('ca-pub-') ? publisherId : `ca-pub-${publisherId}`

    return (
        <div className={`my-8 w-full flex justify-center overflow-hidden ${className}`}>
            <ins
                className="adsbygoogle"
                style={{ display: 'block' }}
                data-ad-client={fullId}
                data-ad-slot={slotId}
                data-ad-format={format}
                data-full-width-responsive={responsive.toString()}
            />
        </div>
    )
}
