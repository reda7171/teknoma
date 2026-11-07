import { create } from 'zustand'

interface UIStore {
    isCartOpen: boolean
    openCart: () => void
    closeCart: () => void
    toggleCart: () => void
    isMobileMenuOpen: boolean
    openMobileMenu: () => void
    closeMobileMenu: () => void
    toggleMobileMenu: () => void
    setMobileMenuOpen: (open: boolean | ((prev: boolean) => boolean)) => void
    isAuthModalOpen: boolean
    isAuthenticated: boolean
    setIsAuthenticated: (val: boolean) => void
    openAuthModal: () => void
    closeAuthModal: () => void
    // Récompense Gmail (+10 Dhs)
    isGmailRewardOpen: boolean
    openGmailReward: () => void
    closeGmailReward: () => void
    // Notifications system
    notification: {
        message: string
        type: 'success' | 'error' | 'info' | 'warning'
        id: number
    } | null
    showNotification: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void
    hideNotification: () => void
}

export const useUIStore = create<UIStore>((set) => ({
    isCartOpen: false,
    openCart: () => set({ isCartOpen: true, isMobileMenuOpen: false }),
    closeCart: () => set({ isCartOpen: false }),
    toggleCart: () => set((state) => ({
        isCartOpen: !state.isCartOpen,
        isMobileMenuOpen: false
    })),
    isMobileMenuOpen: false,
    openMobileMenu: () => set({ isMobileMenuOpen: true, isCartOpen: false }),
    closeMobileMenu: () => set({ isMobileMenuOpen: false }),
    toggleMobileMenu: () => set((state) => ({
        isMobileMenuOpen: !state.isMobileMenuOpen,
        isCartOpen: false
    })),
    setMobileMenuOpen: (open) => set((state) => {
        const nextValue = typeof open === 'function' ? open(state.isMobileMenuOpen) : open
        return {
            isMobileMenuOpen: nextValue,
            isCartOpen: nextValue ? false : state.isCartOpen
        }
    }),
    isAuthenticated: false,
    setIsAuthenticated: (val) => set({ isAuthenticated: val, isAuthModalOpen: val ? false : undefined }),
    isAuthModalOpen: false,
    openAuthModal: () => set((state) => {
        if (state.isAuthenticated) return { isAuthModalOpen: false }
        if (typeof document !== 'undefined' && document.cookie.includes('riwaya_authenticated=1')) {
            return { isAuthenticated: true, isAuthModalOpen: false }
        }
        return { isAuthModalOpen: true }
    }),
    closeAuthModal: () => set({ isAuthModalOpen: false }),
    isGmailRewardOpen: false,
    openGmailReward: () => set({ isGmailRewardOpen: true }),
    closeGmailReward: () => set({ isGmailRewardOpen: false }),
    notification: null,
    showNotification: (message, type = 'success') => {
        const id = Date.now()
        set({ notification: { message, type, id } })
        // Auto-hide after 5 seconds
        setTimeout(() => {
            set((state) => (state.notification?.id === id ? { notification: null } : {}))
        }, 5000)
    },
    hideNotification: () => set({ notification: null }),
}))
