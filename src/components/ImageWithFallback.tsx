'use client'

import { normalizeImage } from '@/lib/utils'
import Image from 'next/image'
import { useState } from 'react'

interface ImageWithFallbackProps {
    src?: string | null
    alt: string
    className?: string
    fallback?: string
    priority?: boolean
    sizes?: string
    quality?: number
}

/**
 * Composant client pour afficher une image avec fallback et skeleton loading.
 * Utilisé pour Next.js Image avec compression WebP/AVIF et respect du CLS (0).
 */
export default function ImageWithFallback({
    src,
    alt,
    className = 'w-full h-full object-cover',
    fallback = '/book-placeholder.png',
    priority = false,
    sizes = '(max-width: 768px) 33vw, (max-width: 1200px) 20vw, 15vw',
    quality = 80,
}: ImageWithFallbackProps) {
    const finalSrc = normalizeImage(src || '') || fallback;
    const [isLoaded, setIsLoaded] = useState(false);

    return (
        <>
            {/* Shimmer skeleton sous l'image pour éviter tout saut de mise en page (CLS = 0) */}
            {!isLoaded && !priority && (
                <span className="absolute inset-0 bg-gradient-to-r from-slate-100 via-slate-200/40 to-slate-100 animate-pulse pointer-events-none rounded-[inherit]" aria-hidden="true" />
            )}
            <Image
                src={finalSrc}
                alt={alt || "Image"}
                fill
                sizes={sizes}
                quality={quality}
                className={`${className} transition-opacity duration-300 ${!isLoaded && !priority ? 'opacity-0' : 'opacity-100'}`}
                priority={priority}
                onLoad={() => setIsLoaded(true)}
                onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = fallback;
                    target.srcset = '';
                    setIsLoaded(true);
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

