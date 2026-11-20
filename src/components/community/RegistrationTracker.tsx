'use client'

import { useEffect, useRef } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { fbPixelEvents } from '@/lib/facebook-pixel'

export default function RegistrationTracker() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const pathname = usePathname()
    const hasTracked = useRef(false)

    useEffect(() => {
        if (searchParams.get('registered') === 'true' && !hasTracked.current) {
            hasTracked.current = true
            
            // Track CompleteRegistration and Lead for new user
            fbPixelEvents.completeRegistration()
            fbPixelEvents.lead('Registration')

            // Remove 'registered' from URL without refreshing the page
            const newSearchParams = new URLSearchParams(searchParams.toString())
            newSearchParams.delete('registered')
            const newUrl = `${pathname}${newSearchParams.toString() ? `?${newSearchParams.toString()}` : ''}`
            router.replace(newUrl, { scroll: false })
        }
    }, [searchParams, router, pathname])

    return null
}
