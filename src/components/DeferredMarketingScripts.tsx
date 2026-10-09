'use client'

import dynamic from 'next/dynamic'
import Script from 'next/script'
import { useEffect, useState } from 'react'

const AdSense = dynamic(() => import('./AdSense'))
const PixelTracker = dynamic(() => import('./PixelTracker'))
const FacebookPixel = dynamic(() => import('./FacebookPixel'))
const GoogleAnalytics = dynamic(() => import('./GoogleAnalytics'))

interface DeferredMarketingScriptsProps {
    adsenseId: string
    adsenseEnabled: boolean
    facebookPixelId?: string | null
    googleAnalyticsId: string
}

export default function DeferredMarketingScripts({
    adsenseId,
    adsenseEnabled,
    facebookPixelId,
    googleAnalyticsId,
}: DeferredMarketingScriptsProps) {
    const [enabled, setEnabled] = useState(false)

    useEffect(() => {
        const enable = () => setEnabled(true)
        const options: AddEventListenerOptions = { once: true, passive: true }
        const events: Array<keyof WindowEventMap> = ['scroll', 'pointerdown', 'touchstart', 'keydown']

        events.forEach(event => window.addEventListener(event, enable, options))
        return () => events.forEach(event => window.removeEventListener(event, enable))
    }, [])

    if (!enabled) return null

    return (
        <>
            <Script
                id="gtm-script"
                strategy="lazyOnload"
                dangerouslySetInnerHTML={{
                    __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-MSD75KHT');`,
                }}
            />
            <AdSense publisherId={adsenseId} isEnabled={adsenseEnabled} />
            <PixelTracker />
            <FacebookPixel pixelId={facebookPixelId} />
            <GoogleAnalytics gaId={googleAnalyticsId} />
        </>
    )
}
