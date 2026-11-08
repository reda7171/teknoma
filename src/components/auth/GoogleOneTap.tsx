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
        if (initializedRef.current) return
        if (typeof window === 'undefined') return
        if (typeof document !== 'undefined' && document.cookie.includes('riwaya_authenticated=1')) return

        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "967210658791-vn1et4a1cr5b78as8vh5f3h1jfs153kh.apps.googleusercontent.com"
        if (!clientId) return

        const handleCredentialResponse = async (response: { credential?: string }) => {
            if (!response.credential) return
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
            if (!window.google?.accounts?.id || initializedRef.current) return
            initializedRef.current = true
            try {
                window.google.accounts.id.initialize({
                    client_id: clientId,
                    callback: handleCredentialResponse,
                    auto_select: false,
                    cancel_on_tap_outside: true,
                    use_fedcm_for_prompt: false,
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

        return () => {
            try {
                window.google?.accounts?.id?.cancel()
            } catch {}
        }
    }, [router, showNotification])

    return null
}
