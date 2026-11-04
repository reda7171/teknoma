'use client'

import dynamic from 'next/dynamic'
import { useUIStore } from '@/store/ui'

const AuthModal = dynamic(() => import('./AuthModal'), { ssr: false })

export default function AuthModalLoader() {
    const isOpen = useUIStore((state) => state.isAuthModalOpen)
    const isAuthenticated = useUIStore((state) => state.isAuthenticated)

    if (isAuthenticated) return null
    if (typeof document !== 'undefined' && document.cookie.includes('riwaya_authenticated=1')) {
        return null
    }

    return isOpen ? <AuthModal /> : null
}
