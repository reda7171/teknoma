"use client"

import { useEffect, Suspense } from 'react'
import { useSearchParams, usePathname } from 'next/navigation'
import { isTrackingParam } from '@/lib/seo/canonical'

function UtmTrackerInner() {
  const searchParams = useSearchParams()
  const pathname = usePathname()

  useEffect(() => {
    if (!searchParams || typeof window === 'undefined') return

    const utmSource = searchParams.get('utm_source')
    const utmMedium = searchParams.get('utm_medium')
    const utmCampaign = searchParams.get('utm_campaign')
    const fbclid = searchParams.get('fbclid')
    const ttclid = searchParams.get('ttclid')
    const gclid = searchParams.get('gclid')

    // Sauvegarde en localStorage pour l'attribution lors du checkout COD
    if (utmSource) localStorage.setItem('utm_source', utmSource)
    if (utmMedium) localStorage.setItem('utm_medium', utmMedium)
    if (utmCampaign) localStorage.setItem('utm_campaign', utmCampaign)
    if (fbclid) localStorage.setItem('fbclid', fbclid)
    if (ttclid) localStorage.setItem('ttclid', ttclid)
    if (gclid) localStorage.setItem('gclid', gclid)

    // Nettoyage silencieux de la barre d'adresse pour garder les URLs 100% propres
    let hasTracking = false
    const cleanParams = new URLSearchParams()
    searchParams.forEach((val, key) => {
      if (isTrackingParam(key)) {
        hasTracking = true
      } else {
        cleanParams.append(key, val)
      }
    })

    if (hasTracking && window.history && window.history.replaceState) {
      const qs = cleanParams.toString()
      const cleanUrl = qs ? `${pathname}?${qs}` : pathname
      window.history.replaceState({}, '', cleanUrl)
    }
  }, [searchParams, pathname])

  return null
}

export default function UtmTracker() {
  return (
    <Suspense fallback={null}>
      <UtmTrackerInner />
    </Suspense>
  )
}
