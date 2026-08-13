'use client'

import { normalizeImage } from '@/lib/utils'

interface ImageWithFallbackProps {
    src?: string | null
    alt: string
    className?: string
    fallback?: string
    priority?: boolean
}

/**
 * Composant client pour afficher une image avec fallback.
 * Utilisé dans les Server Components qui ne peuvent pas gérer onError.
 */
export default function ImageWithFallback({
    src,
    alt,
    className = 'w-full h-full object-cover',
    fallback = '/book-placeholder.png',
    priority = false,
}: ImageWithFallbackProps) {
    return (
        <img
            src={normalizeImage(src || '')}
            alt={alt}
            className={className}
            loading={priority ? 'eager' : 'lazy'}
            {...(priority ? { fetchPriority: 'high' } : {})}
            onError={(e) => {
                ;(e.target as HTMLImageElement).src = fallback
            }}
        />
    )
}
