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
    sizes = '(max-width: 768px) 33vw, (max-width: 1200px) 20vw, 15vw',
}: ImageWithFallbackProps) {
    const finalSrc = normalizeImage(src || '') || fallback;
    return (
        <>
            <Image
                src={finalSrc}
                alt={alt || "Image"}
                fill
                sizes={sizes}
                className={className}
                priority={priority}
                onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (!target.src.includes('riwaya.store') && target.src.includes('/uploads/')) {
                        target.src = `https://riwaya.store${new URL(target.src).pathname}`;
                        target.srcset = '';
                    } else {
                        target.src = fallback;
                        target.srcset = '';
                    }
                }}
            />
            <noscript>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                    src={finalSrc} 
                    alt={alt || "Image"} 
                    className={className} 
                    loading="lazy" 
                    style={{ position: 'absolute', height: '100%', width: '100%', inset: '0px', color: 'transparent' }} 
                />
            </noscript>
        </>
    )
}
