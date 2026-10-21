'use client'

import Script from 'next/script'

export interface FacebookAuthResponse {
    accessToken: string
    expiresIn: string
    signedRequest: string
    userID: string
}

export interface FacebookLoginStatusResponse {
    status: 'connected' | 'not_authorized' | 'unknown'
    authResponse?: FacebookAuthResponse
}

declare global {
    interface Window {
        fbAsyncInit?: () => void
        FB?: {
            init: (options: Record<string, unknown>) => void
            AppEvents: {
                logPageView: () => void
            }
            getLoginStatus: (callback: (response: FacebookLoginStatusResponse) => void) => void
            login: (callback: (response: FacebookLoginStatusResponse) => void, options?: { scope: string }) => void
            logout: (callback: (response: unknown) => void) => void
        }
        statusChangeCallback?: (response: FacebookLoginStatusResponse) => void
        checkLoginState?: () => void
    }
}

/**
 * Vérifie le statut de connexion Facebook actuel
 */
export function checkFacebookLoginStatus(): Promise<FacebookLoginStatusResponse> {
    return new Promise((resolve) => {
        if (typeof window !== 'undefined' && window.FB) {
            window.FB.getLoginStatus((response) => {
                resolve(response)
            })
        } else {
            resolve({ status: 'unknown' })
        }
    })
}

interface FacebookSDKProps {
    appId?: string | null
    version?: string
}

export default function FacebookSDK({
    appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '1387439830229552',
    version = 'v21.0'
}: FacebookSDKProps) {
    if (!appId) return null

    return (
        <>
            <div id="fb-root"></div>
            <Script
                id="facebook-jssdk"
                strategy="lazyOnload"
                dangerouslySetInnerHTML={{
                    __html: `
                        window.statusChangeCallback = function(response) {
                            window.dispatchEvent(new CustomEvent('fb_status_change', { detail: response }));
                        };

                        window.checkLoginState = function() {
                            if (window.FB) {
                                FB.getLoginStatus(function(response) {
                                    statusChangeCallback(response);
                                });
                            }
                        };

                        window.fbAsyncInit = function() {
                            FB.init({
                                appId: '${appId}',
                                cookie: true,
                                xfbml: true,
                                version: '${version}'
                            });
                            FB.AppEvents.logPageView();

                            FB.getLoginStatus(function(response) {
                                statusChangeCallback(response);
                            });
                        };

                        (function(d, s, id){
                            var js, fjs = d.getElementsByTagName(s)[0];
                            if (d.getElementById(id)) {return;}
                            js = d.createElement(s); js.id = id;
                            js.src = "https://connect.facebook.net/en_US/sdk.js";
                            fjs.parentNode.insertBefore(js, fjs);
                        }(document, 'script', 'facebook-jssdk'));
                    `,
                }}
            />
        </>
    )
}
