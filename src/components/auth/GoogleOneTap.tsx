'use client'

import { useRouter } from '@/i18n/routing'
import { useUIStore } from '@/store/ui'
import { googleOneTapLogin } from '@/lib/actions/community-auth'
import { useEffect, useRef } from 'react'

declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize: (config: any) => void
                    prompt: (momentListener?: (notification: any) => void) => void
                    cancel: () => void
                }
            }
        }
    }
}

export default function GoogleOneTap() {
    const router = useRouter()
    const { showNotification } = useUIStore()
    const initializedRef = useRef(false)

    useEffect(() => {
        if (typeof window === 'undefined') return
        // FedCM / Google One Tap nécessite HTTPS en production ; éviter le rejet NetworkError sur http://localhost en dev
        if (window.location.protocol !== 'https:' && process.env.NEXT_PUBLIC_FORCE_ONE_TAP !== 'true') return
        if (typeof document !== 'undefined' && document.cookie.includes('riwaya_authenticated=1')) return

        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "967210658791-vn1et4a1cr5b78as8vh5f3h1jfs153kh.apps.googleusercontent.com"
        if (!clientId) return

        let isCancelled = false

        const handleCredentialResponse = async (response: { credential?: string }) => {
            if (!response.credential || isCancelled) return
            try {
                const result = await googleOneTapLogin(response.credential)
                if (result.success) {
                    showNotification('Connexion réussie', 'success')
                    useUIStore.getState().openGmailReward()
                    router.refresh()
                } else {
                    showNotification(result.error || 'Erreur de connexion', 'error')
                }
            } catch {
                showNotification('Erreur inattendue', 'error')
            }
        }

        const initGsi = () => {
            if (isCancelled || initializedRef.current || !window.google?.accounts?.id) return
            initializedRef.current = true
            try {
                window.google.accounts.id.initialize({
                    client_id: clientId,
                    callback: handleCredentialResponse,
                    auto_select: false,
                    cancel_on_tap_outside: true,
                    use_fedcm_for_prompt: true,
                    itp_support: true,
                })
                window.google.accounts.id.prompt((notification: any) => {
                    if (
                        notification?.isNotDisplayed?.() ||
                        notification?.isSkippedMoment?.() ||
                        notification?.isDismissedMoment?.()
                    ) {
                        // Ignorer silencieusement les rejets de prompt / annulations utilisateur / non affichage
                    }
                })
            } catch {
                // Silently ignore GSI initialization errors in headless/unsupported environments
            }
        }

        // Temporiser légèrement pour éviter qu'un double montage React StrictMode n'annule FedCM get() en plein vol
        const bootTimer = window.setTimeout(() => {
            if (isCancelled) return
            if (window.google?.accounts?.id) {
                initGsi()
            } else {
                const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]')
                if (existingScript) {
                    existingScript.addEventListener('load', initGsi, { once: true })
                } else {
                    const script = document.createElement('script')
                    script.src = 'https://accounts.google.com/gsi/client'
                    script.async = true
                    script.defer = true
                    script.onload = initGsi
                    document.head.appendChild(script)
                }
            }
        }, 150)

        return () => {
            isCancelled = true
            window.clearTimeout(bootTimer)
            if (initializedRef.current) {
                initializedRef.current = false
                try {
                    window.google?.accounts?.id?.cancel()
                } catch {}
            }
        }
    }, [router, showNotification])

    return null
}
