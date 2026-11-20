'use client'

import { useState } from 'react'
import AudioTestimonial from '@/components/AudioTestimonial'
import ScrollReveal from '@/components/ScrollReveal'
import { Headphones, ImageIcon } from 'lucide-react'
import ImageWithFallback from '@/components/ImageWithFallback'

interface AudioTestimonialData {
    id: string
    customerName: string
    audioUrl: string
    avatarUrl?: string | null
    duration?: number | null
    createdAt: Date
}

interface ImageTestimonialData {
    id: string
    customerName: string
    imageUrl?: string | null
}

interface TestimonialsTabsProps {
    audioTestimonials: AudioTestimonialData[]
    imageTestimonials: ImageTestimonialData[]
    locale: string
}

export default function TestimonialsTabs({ audioTestimonials, imageTestimonials, locale }: TestimonialsTabsProps) {
    const [activeTab, setActiveTab] = useState<'audio' | 'image'>(
        audioTestimonials.length > 0 ? 'audio' : 'image'
    )

    if (audioTestimonials.length === 0 && imageTestimonials.length === 0) return null

    const visibleAudioTestimonials = audioTestimonials.slice(0, 8)
    const visibleImageTestimonials = imageTestimonials.slice(0, 8)
    const marqueeTestimonials = [...visibleImageTestimonials, ...visibleImageTestimonials]

    return (
        <div className="w-full flex flex-col items-center">
            {/* Tabs Selector */}
            {audioTestimonials.length > 0 && imageTestimonials.length > 0 && (
                <div className="flex bg-white/50 p-1.5 rounded-full shadow-inner mb-4 sm:mb-8 md:mb-12 backdrop-blur-sm border border-emerald-100/50">
                    <button
                        onClick={() => setActiveTab('audio')}
                        className={`px-6 py-3 rounded-full text-xs md:text-sm font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'audio' ? 'bg-emerald-600 text-white shadow-xl scale-105' : 'text-emerald-700/60 hover:text-emerald-700'}`}
                    >
                        <Headphones className="w-4 h-4" />
                        {locale === 'ar' ? 'صوت' : locale === 'en' ? 'Voice' : 'Vocaux'}
                    </button>
                    <button
                        onClick={() => setActiveTab('image')}
                        className={`px-6 py-3 rounded-full text-xs md:text-sm font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'image' ? 'bg-emerald-600 text-white shadow-xl scale-105' : 'text-emerald-700/60 hover:text-emerald-700'}`}
                    >
                        <ImageIcon className="w-4 h-4" />
                        {locale === 'ar' ? 'لقطات شاشة' : 'ScreenShot'}
                    </button>
                </div>
            )}

            {/* Content Area */}
            <div className="w-full min-h-0 sm:min-h-[300px] md:min-h-[400px]">
                {activeTab === 'audio' && audioTestimonials.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-8 animate-in fade-in zoom-in-95 duration-500">
                        {visibleAudioTestimonials.map((testimonial, idx) => (
                            <ScrollReveal key={testimonial.id} delay={idx * 150} animation="animate-reveal-up">
                                <AudioTestimonial testimonial={testimonial} />
                            </ScrollReveal>
                        ))}
                    </div>
                )}

                {activeTab === 'image' && imageTestimonials.length > 0 && (
                    <div className="w-full overflow-hidden pb-4 sm:pb-8 pt-0 sm:pt-4 animate-in fade-in zoom-in-95 duration-500 [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)]">
                        <div className="flex w-max animate-marquee hover:[animation-play-state:paused] gap-6 px-4">
                            {marqueeTestimonials.map((testimonial, idx) => {
                                const normalizedImg = testimonial.imageUrl?.trim() || '';
                                const finalImage = normalizedImg.startsWith('http') || normalizedImg.startsWith('data:') 
                                    ? normalizedImg 
                                    : normalizedImg.startsWith('/') 
                                        ? normalizedImg 
                                        : '/' + normalizedImg;
                                
                                return (
                                    <div key={`${testimonial.id}-${idx}`} className="min-w-[260px] md:min-w-[300px] max-w-[300px] shrink-0">
                                        <div className="group relative w-full aspect-[9/16] rounded-[2rem] overflow-hidden shadow-xl border-4 border-white hover:border-emerald-400 bg-gray-100 hover:-translate-y-3 hover:shadow-[0_20px_40px_-15px_rgba(16,185,129,0.4)] transition-all duration-500 ease-out cursor-pointer @container">
                                            <ImageWithFallback
                                                src={finalImage}
                                                alt={testimonial.customerName || 'Testimonial'}
                                                className="absolute top-0 left-0 w-full h-full object-cover object-top transition-all duration-[4000ms] ease-linear group-hover:object-bottom"
                                            />
                                            {/* Gradient overlay */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-95 transition-opacity duration-500" />
                                            
                                            {/* Shimmer sweep effect */}
                                            <div className="absolute inset-0 -translate-x-[150%] bg-gradient-to-r from-transparent via-white/30 to-transparent group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out skew-x-12" />

                                            <div className="absolute bottom-0 left-0 right-0 p-6 flex items-center gap-4 translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-black text-xl border-2 border-white shadow-[0_0_15px_rgba(16,185,129,0.5)] group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500">
                                                    {testimonial.customerName.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-white font-black text-base italic mb-1 drop-shadow-md">{testimonial.customerName}</p>
                                                    <span
                                                        className="text-sm leading-none tracking-tight text-yellow-400 drop-shadow-md"
                                                        aria-label="5 étoiles sur 5"
                                                    >
                                                        ★★★★★
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
