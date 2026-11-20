'use client'

import { useState, useEffect } from 'react'

/**
 * Ce composant retarde le chargement de ses enfants (scripts marketing comme GTM, Facebook Pixel)
 * jusqu'à une interaction volontaire de l'utilisateur.
 * Cela permet d'obtenir un score Lighthouse parfait de 100/100 tout en gardant le tracking actif pour les vrais visiteurs.
 */
export default function DelayedScripts({ children }: { children: React.ReactNode }) {
    const [shouldRender, setShouldRender] = useState(false)

    useEffect(() => {
        // S'il est déjà affiché, on ne fait rien
        if (shouldRender) return

        const handleInteraction = () => {
            setShouldRender(true)
            cleanup()
        }

        const cleanup = () => {
            window.removeEventListener('scroll', handleInteraction)
            window.removeEventListener('pointerdown', handleInteraction)
            window.removeEventListener('touchstart', handleInteraction)
            window.removeEventListener('keydown', handleInteraction)
        }

        // Ajouter les écouteurs d'événements pour détecter une interaction réelle
        window.addEventListener('scroll', handleInteraction, { once: true, passive: true })
        window.addEventListener('pointerdown', handleInteraction, { once: true, passive: true })
        window.addEventListener('touchstart', handleInteraction, { once: true, passive: true })
        window.addEventListener('keydown', handleInteraction, { once: true, passive: true })

        return cleanup
    }, [shouldRender])

    if (!shouldRender) return null

    return <>{children}</>
}
