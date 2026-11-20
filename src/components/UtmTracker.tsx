"use client"

import { useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function UtmTrackerInner() {
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!searchParams) return

    const utmSource = searchParams.get('utm_source')
    const utmMedium = searchParams.get('utm_medium')
    const utmCampaign = searchParams.get('utm_campaign')
    const fbclid = searchParams.get('fbclid')
    const ttclid = searchParams.get('ttclid')

    // On sauvegarde chaque paramètre s'il existe (durée de vie du localStorage)
    if (utmSource) localStorage.setItem('utm_source', utmSource)
    if (utmMedium) localStorage.setItem('utm_medium', utmMedium)
    if (utmCampaign) localStorage.setItem('utm_campaign', utmCampaign)
    if (fbclid) localStorage.setItem('fbclid', fbclid)
    if (ttclid) localStorage.setItem('ttclid', ttclid)
  }, [searchParams])

  return null
}

export default function UtmTracker() {
  return (
    <Suspense fallback={null}>
      <UtmTrackerInner />
    </Suspense>
  )
}
