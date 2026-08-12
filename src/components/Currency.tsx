'use client'

import { useParams } from 'next/navigation'

export default function Currency() {
    const params = useParams()
    const locale = params?.locale || 'fr'
    return <>{locale === 'ar' ? 'درهم' : 'MAD'}</>
}
