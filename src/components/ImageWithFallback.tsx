'use client'

import { normalizeImage } from '@/lib/utils'
import Image from 'next/image'

interface ImageWithFallbackProps {
    src?: string | null
    alt: string
    className?: string
    fallback?: string
    priority?: boolean
    sizes?: string
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
    sizes = '(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw',
}: ImageWithFallbackProps) {
    return (
        <Image
            src={normalizeImage(src || '') || fallback}
            alt={alt || "Image"}
            fill
            sizes={sizes}
            className={className}
            priority={priority}
            onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.srcset = '';
                target.src = fallback;
            }}
        />
    )
}
