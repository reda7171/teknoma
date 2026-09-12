'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Package, Play, X } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface FournitureMediaClientProps {
    productName: string
    mainImage: string | null
    images: string[]
    videos: string[]
    stock: number
}

export default function FournitureMediaClient({
    productName,
    mainImage,
    images,
    videos,
    stock
}: FournitureMediaClientProps) {
    // Combine all media into one array
    const allImages = []
    if (mainImage) allImages.push(mainImage)
    if (images && images.length > 0) {
        images.forEach(img => {
            if (img !== mainImage) allImages.push(img)
        })
    }
    
    const allVideos = videos || []
    
    // Type of currently selected media ('image' or 'video')
    const [selectedType, setSelectedType] = useState<'image' | 'video'>(allImages.length > 0 ? 'image' : (allVideos.length > 0 ? 'video' : 'image'))
    // URL of currently selected media
    const [selectedUrl, setSelectedUrl] = useState<string | null>(allImages.length > 0 ? allImages[0] : (allVideos.length > 0 ? allVideos[0] : null))
    // Modal state for fullscreen video
    const [isFullscreen, setIsFullscreen] = useState(false)

    const hasMultipleMedia = allImages.length + allVideos.length > 1
    
    const tAccessory = useTranslations('AccessoryDetail')

    return (
        <div className="flex flex-col gap-4">
            {/* Main Media Viewer */}
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 group">
                {selectedType === 'image' && selectedUrl ? (
                    <Image
                        src={selectedUrl}
                        alt={productName}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        unoptimized
                    />
                ) : selectedType === 'video' && selectedUrl ? (
                    <div className="w-full h-full relative cursor-pointer" onClick={() => setIsFullscreen(true)}>
                        <video
                            src={selectedUrl}
                            className="w-full h-full object-cover"
                            autoPlay
                            muted
                            loop
                            playsInline
                        />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-16 h-16 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center">
                                <Play className="w-8 h-8 text-white ml-1" />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-50">
                        <Package className="w-20 h-20 text-slate-200" />
                    </div>
                )}

                {/* Stock Badges */}
                {stock <= 5 && stock > 0 && (
                    <div className="absolute top-4 left-4 z-10">
                        <span className="px-3 py-1.5 bg-orange-500 text-white text-[10px] font-black rounded-full shadow-md uppercase tracking-wider animate-pulse">
                            {tAccessory('StockLeft', { stock })}
                        </span>
                    </div>
                )}
                {stock === 0 && (
                    <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-10 flex items-center justify-center">
                        <span className="px-4 py-2 bg-slate-900 text-white text-xs font-black rounded-xl uppercase tracking-widest">
                            {tAccessory('OutOfStock')}
                        </span>
                    </div>
                )}
            </div>

            {/* Thumbnails */}
            {hasMultipleMedia && (
                <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
                    {/* Images Thumbnails */}
                    {allImages.map((img, idx) => (
                        <button
                            key={`img-${idx}`}
                            onClick={() => {
                                setSelectedType('image')
                                setSelectedUrl(img)
                            }}
                            className={`relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all ${
                                selectedType === 'image' && selectedUrl === img
                                    ? 'border-black ring-2 ring-black/10'
                                    : 'border-transparent opacity-70 hover:opacity-100 hover:border-slate-200'
                            }`}
                        >
                            <Image
                                src={img}
                                alt={`${productName} thumbnail ${idx + 1}`}
                                fill
                                className="object-cover"
                                unoptimized
                            />
                        </button>
                    ))}
                    
                    {/* Videos Thumbnails */}
                    {allVideos.map((vid, idx) => (
                        <button
                            key={`vid-${idx}`}
                            onClick={() => {
                                setSelectedType('video')
                                setSelectedUrl(vid)
                            }}
                            className={`relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all bg-black ${
                                selectedType === 'video' && selectedUrl === vid
                                    ? 'border-black ring-2 ring-black/10'
                                    : 'border-transparent opacity-70 hover:opacity-100 hover:border-slate-200'
                            }`}
                        >
                            <video
                                src={`${vid}#t=0.1`}
                                preload="metadata"
                                className="w-full h-full object-cover opacity-50"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Play className="w-6 h-6 text-white" />
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* Fullscreen Video Modal */}
            {isFullscreen && selectedType === 'video' && selectedUrl && (
                <div className="fixed inset-0 z-[150] bg-black flex items-center justify-center animate-in fade-in duration-300">
                    <button 
                        onClick={() => setIsFullscreen(false)}
                        className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors z-10"
                    >
                        <X className="w-6 h-6" />
                    </button>
                    <video
                        src={selectedUrl}
                        className="w-full h-full max-h-[90vh] object-contain"
                        controls
                        autoPlay
                        playsInline
                    />
                </div>
            )}
        </div>
    )
}
