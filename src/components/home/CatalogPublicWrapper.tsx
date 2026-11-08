'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'

const CatalogModal = dynamic(() => import('@/components/admin/CatalogModal'), { ssr: false })

export default function CatalogPublicWrapper() {
    const [requestId, setRequestId] = useState(0)

    useEffect(() => {
        const open = () => setRequestId(id => id + 1)
        window.addEventListener('open-catalog-user', open)
        return () => window.removeEventListener('open-catalog-user', open)
    }, [])

    if (!requestId) return null

    return (
        <CatalogModal 
            key={requestId}
            isOpen
            visitor
            onClose={() => setRequestId(0)}
        />
    )
}
