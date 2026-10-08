'use client'

import dynamic from 'next/dynamic'
import { useUIStore } from '@/store/ui'

const AuthModal = dynamic(() => import('./AuthModal'), { ssr: false })

export default function AuthModalLoader() {
    const isOpen = useUIStore((state) => state.isAuthModalOpen)

    return isOpen ? <AuthModal /> : null
}
