'use client'

import { useEffect, useRef, useState } from 'react'

interface AdUnitProps {
    publisherId: string
    slot: string
    format?: 'auto' | 'fluid' | 'rectangle'
    responsive?: boolean
    isEnabled: boolean
    className?: string
    lazy?: boolean
    rootMargin?: string
}

export default function AdUnit({ 
    publisherId, 
    slot, 
    format = 'auto', 
    responsive = true, 
    isEnabled,
    className = "",
    lazy = true,
    rootMargin = "250px 0px"
}: AdUnitProps) {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const adRef = useRef<HTMLModElement | null>(null)
    const [isVisible, setIsVisible] = useState(!lazy)
    const isPushedRef = useRef(false)

    // 1. Détection de visibilité différée via IntersectionObserver pour préserver le LCP initial
    useEffect(() => {
        if (!isEnabled || !publisherId || !slot) return
        if (!lazy) {
            setIsVisible(true)
            return
        }

        const container = containerRef.current
        if (!container) return

        if (typeof IntersectionObserver !== 'undefined') {
            const observer = new IntersectionObserver((entries) => {
                const [entry] = entries
                if (entry && entry.isIntersecting) {
                    setIsVisible(true)
                    observer.disconnect()
                }
            }, {
                rootMargin,
                threshold: 0
            })

            observer.observe(container)
            return () => observer.disconnect()
        } else {
            setIsVisible(true)
        }
    }, [isEnabled, publisherId, slot, lazy, rootMargin])

    // 2. Initialisation de l'annonce AdSense une fois le bloc visible et sa largeur disponible
    useEffect(() => {
        if (!isEnabled || !publisherId || !slot || !isVisible) return

        // Les annonces AdSense ne s'exécutent pas sur localhost ou en environnement CI/tests
        if (typeof window !== 'undefined') {
            const hostname = window.location.hostname
            if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
                return
            }
        }

        const insElement = adRef.current
        if (!insElement) return

        // Empêche la double initialisation sur le même élément
        if (isPushedRef.current || insElement.getAttribute('data-adsbygoogle-status')) {
            return
        }

        const pushAd = (): boolean => {
            if (isPushedRef.current || !adRef.current) return false
            if (adRef.current.getAttribute('data-adsbygoogle-status')) {
                isPushedRef.current = true
                return true
            }

            // Vérifie que l'élément a une largeur positive dans le layout
            const width = adRef.current.offsetWidth || adRef.current.clientWidth
            if (!width || width <= 0) {
                // Largeur nulle (élément caché ou en cours de calcul) : ne pas appeler push pour éviter No slot size for availableWidth=0
                return false
            }

            try {
                // @ts-ignore
                (window.adsbygoogle = window.adsbygoogle || []).push({})
                isPushedRef.current = true
                return true
            } catch (err) {
                // Erreur de layout AdSense interceptée pour préserver l'exécution
                return false
            }
        }

        // Tenter immédiatement si le layout est prêt
        if (pushAd()) return

        // Sinon, écouter le redimensionnement dès que la largeur devient > 0
        if (typeof ResizeObserver !== 'undefined') {
            const resizeObserver = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    if (entry.contentRect.width > 0) {
                        if (pushAd()) {
                            resizeObserver.disconnect()
                        }
                    }
                }
            })
            resizeObserver.observe(insElement)
            return () => resizeObserver.disconnect()
        } else {
            const timer = setTimeout(pushAd, 300)
            return () => clearTimeout(timer)
        }
    }, [isEnabled, publisherId, slot, isVisible])

    // Ne rien afficher si désactivé ou données manquantes
    if (!isEnabled || !publisherId || !slot) return null

    const fullId = publisherId.startsWith('ca-pub-') 
        ? publisherId 
        : `ca-pub-${publisherId.replace(/^pub-/, '')}`

    return (
        <div 
            ref={containerRef}
            className={`adsense-container my-8 overflow-hidden flex justify-center w-full min-w-[280px] min-h-[90px] ${className}`}
        >
            {isVisible && (
                <ins 
                    ref={adRef}
                    className="adsbygoogle"
                    style={{ display: 'block', minWidth: '280px', width: '100%', minHeight: '90px' }}
                    data-ad-client={fullId}
                    data-ad-slot={slot}
                    data-ad-format={format}
                    data-full-width-responsive={responsive ? "true" : "false"}
                />
            )}
        </div>
    )
}
