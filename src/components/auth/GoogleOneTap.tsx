'use client'

import { useGoogleOneTapLogin, GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google'
import { useRouter } from '@/i18n/routing'
import { useUIStore } from '@/store/ui'
import { googleOneTapLogin } from '@/lib/actions/community-auth'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

function GoogleOneTapInner() {
    const router = useRouter()
    const { showNotification } = useUIStore()
    const t = useTranslations('Market') 
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const handleSuccess = async (credentialResponse: any) => {
        if (!credentialResponse.credential) return

        try {
            const result = await googleOneTapLogin(credentialResponse.credential)
            if (result.success) {
                showNotification('Connexion réussie', 'success')
                router.refresh()
            } else {
                showNotification(result.error || 'Erreur de connexion', 'error')
            }
        } catch (error) {
            showNotification('Erreur inattendue', 'error')
        }
    }

    useGoogleOneTapLogin({
        onSuccess: handleSuccess,
        onError: () => {
            void('Google One Tap Error')
        },
        auto_select: false,
        use_fedcm_for_prompt: false,
        cancel_on_tap_outside: true,
    })

    if (!mounted) return null

    return (
        <div id="google-one-tap-container" className="hidden" />
    )
}

export default function GoogleOneTap() {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "967210658791-vn1et4a1cr5b78as8vh5f3h1jfs153kh.apps.googleusercontent.com"
    if (!clientId) return null
    return (
        <GoogleOAuthProvider clientId={clientId}>
            <GoogleOneTapInner />
        </GoogleOAuthProvider>
    )
}
