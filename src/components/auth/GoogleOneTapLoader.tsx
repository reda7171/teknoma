'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'

const GoogleOneTap = dynamic(() => import('./GoogleOneTap'), { ssr: false })

export default function GoogleOneTapLoader() {
    const [enabled, setEnabled] = useState(false)

    useEffect(() => {
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

        window.addEventListener('scroll', enable, { once: true, passive: true })
        window.addEventListener('pointerdown', enable, { once: true, passive: true })
        window.addEventListener('touchstart', enable, { once: true, passive: true })
        window.addEventListener('keydown', enable, { once: true, passive: true })
        return cleanup
    }, [])

    return enabled ? <GoogleOneTap /> : null
}
