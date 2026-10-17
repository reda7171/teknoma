'use client'

import { useEffect, useRef } from 'react'
import { FacebookLoginStatusResponse } from './FacebookSDK'

interface FacebookLoginButtonProps {
    scope?: string
    size?: 'small' | 'medium' | 'large'
    buttonType?: 'continue_with' | 'login_with'
    autoLogoutLink?: boolean
    useContinueAs?: boolean
    onStatusChange?: (response: FacebookLoginStatusResponse) => void
    className?: string
}

export default function FacebookLoginButton({
    scope = 'public_profile,email',
    size = 'large',
    buttonType = 'login_with',
    autoLogoutLink = false,
    useContinueAs = true,
    onStatusChange,
    className = ''
}: FacebookLoginButtonProps) {
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        // Déclencher le parsing XFBML pour afficher le bouton Facebook une fois le SDK chargé
        if (typeof window !== 'undefined' && (window as any).FB?.XFBML?.parse && containerRef.current) {
            (window as any).FB.XFBML.parse(containerRef.current)
        }

        const handleStatus = (event: Event) => {
            const customEvent = event as CustomEvent<FacebookLoginStatusResponse>
            if (onStatusChange && customEvent.detail) {
                onStatusChange(customEvent.detail)
            }
        }

        window.addEventListener('fb_status_change', handleStatus)
        return () => window.removeEventListener('fb_status_change', handleStatus)
    }, [onStatusChange])

    return (
        <div ref={containerRef} className={`inline-block ${className}`}>
            <div
                className="fb-login-button"
                data-scope={scope}
                data-size={size}
                data-button-type={buttonType}
                data-use-continue-as={useContinueAs}
                data-auto-logout-link={autoLogoutLink}
                data-onlogin="checkLoginState();"
            />
        </div>
    )
}
