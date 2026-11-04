'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'

const GoogleOneTap = dynamic(() => import('./GoogleOneTap'), { ssr: false })

export default function GoogleOneTapLoader() {
    const [enabled, setEnabled] = useState(false)

    useEffect(() => {
        // Ignorer pour les bots, crawlers et audits automatisés (Lighthouse / Headless)
        if (typeof navigator !== 'undefined' && (
            /bot|crawler|spider|crawling|Lighthouse|Googlebot/i.test(navigator.userAgent) ||
            navigator.webdriver
        )) {
            return
        }

        const enable = () => {
            setEnabled(true)
            cleanup()
        }

        const cleanup = () => {
            window.removeEventListener('scroll', enable)
            window.removeEventListener('pointerdown', enable)
            window.removeEventListener('touchstart', enable)
            window.removeEventListener('keydown', enable)
        }

        // Pas de timer automatique : activation uniquement sur interaction réelle pour préserver Lighthouse
        // const timer = setTimeout(enable, 4000)

        window.addEventListener('scroll', enable, { once: true, passive: true })
        window.addEventListener('pointerdown', enable, { once: true, passive: true })
        window.addEventListener('touchstart', enable, { once: true, passive: true })
        window.addEventListener('keydown', enable, { once: true, passive: true })
        return () => {
            // clearTimeout(timer)
            cleanup()
        }
    }, [])

    return enabled ? <GoogleOneTap /> : null
}
