'use client'

import { useUIStore } from '@/store/ui'
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google'
import { googleOneTapLogin } from '@/lib/actions/community-auth'
import { X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'

export default function AuthModal() {
    const { isAuthModalOpen, closeAuthModal, showNotification, isAuthenticated } = useUIStore()
    const t = useTranslations('AuthModal')
    const [mounted, setMounted] = useState(false)
    
    useEffect(() => {
        setMounted(true)
        if (typeof document !== 'undefined' && document.cookie.includes('riwaya_authenticated=1')) {
            closeAuthModal()
        }
    }, [closeAuthModal])

    if (!mounted || !isAuthModalOpen || isAuthenticated) return null;
    if (typeof document !== 'undefined' && document.cookie.includes('riwaya_authenticated=1')) return null;
    
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
                <button aria-label="Fermer" onClick={closeAuthModal} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                    <X className="w-5 h-5" />
                </button>
                <div className="text-center mb-8 mt-4">
                    <h2 className="text-2xl font-black text-slate-900 mb-2">{t('Title')}</h2>
                    <p className="text-slate-500 text-sm font-medium">
                        {t('Description')}
                    </p>
                </div>
                
                <div className="flex flex-col items-center gap-3.5 w-full">
                    {clientId ? (
                        <div className="w-full flex justify-center">
                            <GoogleOAuthProvider clientId={clientId}>
                                <GoogleLogin
                                    onSuccess={handleSuccess}
                                    onError={() => showNotification(t('GoogleLoginError'), 'error')}
                                    useOneTap={false}
                                    shape="pill"
                                    size="large"
                                    text="continue_with"
                                    width="280"
                                />
                            </GoogleOAuthProvider>
                        </div>
                    ) : (
                        <p className="text-red-500 text-xs text-center font-bold">Configuration Google manquante (NEXT_PUBLIC_GOOGLE_CLIENT_ID)</p>
                    )}

                    <a
                        href="/api/auth/facebook/login"
                        className="w-[280px] max-w-full h-[40px] flex items-center justify-center gap-2.5 px-4 bg-[#1877F2] text-white font-bold text-sm rounded-full hover:bg-[#166fe5] transition-all shadow-sm hover:shadow active:scale-95 cursor-pointer"
                    >
                        <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                        </svg>
                        <span className="truncate">{t('ContinueWithFacebook')}</span>
                    </a>
                </div>
            </div>
        </div>
    )
}
