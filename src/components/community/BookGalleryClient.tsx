'use client'

import { useState } from 'react'
import ImageWithFallback from '@/components/ImageWithFallback'

export default function BookGalleryClient({ images, alt }: { images: string[], alt: string }) {
    const [mainImage, setMainImage] = useState(images[0] || '')

    if (images.length === 0) return null

    return (
        <div className="w-full">
            <div className="relative aspect-[3/4] bg-white rounded-[2.5rem] shadow-2xl shadow-black/10 overflow-hidden border-2 border-black group">
                <ImageWithFallback
                    src={mainImage}
                    alt={alt}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
            </div>
            
            {images.length > 1 && (
                <div className="flex gap-4 mt-6 overflow-x-auto pb-4 hide-scrollbar">
                    {images.map((img, idx) => (
                        <button
                            key={idx}
                            onClick={() => setMainImage(img)}
                            className={`relative w-20 h-28 flex-shrink-0 rounded-2xl overflow-hidden border-2 transition-all ${
                                mainImage === img ? 'border-black scale-105 shadow-xl' : 'border-transparent opacity-70 hover:opacity-100'
                            }`}
                        >
                            <ImageWithFallback
                                src={img}
                                alt={`${alt} - vue ${idx + 1}`}
                                className="w-full h-full object-cover"
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
