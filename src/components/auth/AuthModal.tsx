'use client'

import { useUIStore } from '@/store/ui'
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google'
import { googleOneTapLogin } from '@/lib/actions/community-auth'
import { X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'

export default function AuthModal() {
    const { isAuthModalOpen, closeAuthModal, showNotification } = useUIStore()
    const t = useTranslations('AuthModal')
    const [mounted, setMounted] = useState(false)
    
    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted || !isAuthModalOpen) return null;
    
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "967210658791-vn1et4a1cr5b78as8vh5f3h1jfs153kh.apps.googleusercontent.com"
    
    const handleSuccess = async (credentialResponse: any) => {
        if (!credentialResponse.credential) return
        try {
            const result = await googleOneTapLogin(credentialResponse.credential)
            if (result.success) {
                showNotification(t('LoginSuccess'), 'success')
                closeAuthModal()
                window.location.reload()
            } else {
                showNotification(result.error || t('LoginError'), 'error')
            }
        } catch (error) {
            showNotification(t('UnexpectedError'), 'error')
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-md relative shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <button onClick={closeAuthModal} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                    <X className="w-5 h-5" />
                </button>
                <div className="text-center mb-8 mt-4">
                    <h2 className="text-2xl font-black text-slate-900 mb-2">{t('Title')}</h2>
                    <p className="text-slate-500 text-sm font-medium">
                        {t('Description')}
                    </p>
                </div>
                
                {clientId ? (
                    <div className="flex justify-center">
                        <GoogleOAuthProvider clientId={clientId}>
                            <GoogleLogin
                                onSuccess={handleSuccess}
                                onError={() => showNotification(t('GoogleLoginError'), 'error')}
                                useOneTap={false}
                                shape="pill"
                                size="large"
                                text="continue_with"
                            />
                        </GoogleOAuthProvider>
                    </div>
                ) : (
                    <p className="text-red-500 text-sm text-center font-bold">Configuration Google manquante (NEXT_PUBLIC_GOOGLE_CLIENT_ID)</p>
                )}
            </div>
        </div>
    )
}
