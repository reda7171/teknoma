'use client'

import { useState } from 'react'
import AudioTestimonial from '@/components/AudioTestimonial'
import ScrollReveal from '@/components/ScrollReveal'
import { Headphones, ImageIcon, MessageSquareText } from 'lucide-react'
import Image from 'next/image'

interface TestimonialsTabsProps {
    audioTestimonials: any[]
    imageTestimonials: any[]
    locale: string
}

export default function TestimonialsTabs({ audioTestimonials, imageTestimonials, locale }: TestimonialsTabsProps) {
    const [activeTab, setActiveTab] = useState<'audio' | 'image'>(
        audioTestimonials.length > 0 ? 'audio' : 'image'
    )

    if (audioTestimonials.length === 0 && imageTestimonials.length === 0) return null

    return (
        <div className="w-full flex flex-col items-center">
            {/* Tabs Selector */}
            {audioTestimonials.length > 0 && imageTestimonials.length > 0 && (
                <div className="flex bg-white/50 p-1.5 rounded-full shadow-inner mb-12 backdrop-blur-sm border border-emerald-100/50">
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
            <div className="w-full min-h-[400px]">
                {activeTab === 'audio' && audioTestimonials.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-8 animate-in fade-in zoom-in-95 duration-500">
                        {audioTestimonials.map((testimonial: any, idx: number) => (
                            <ScrollReveal key={testimonial.id} delay={idx * 150} animation="animate-reveal-up">
                                <AudioTestimonial testimonial={testimonial} />
                            </ScrollReveal>
                        ))}
                    </div>
                )}

                {activeTab === 'image' && imageTestimonials.length > 0 && (
                    <div className="flex overflow-x-auto gap-6 animate-in fade-in zoom-in-95 duration-500 w-full max-w-7xl mx-auto pb-8 px-4 snap-x snap-mandatory [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full">
                        {imageTestimonials.map((testimonial: any, idx: number) => (
                            <ScrollReveal key={testimonial.id} delay={idx * 150} animation="animate-reveal-up" className="min-w-[260px] md:min-w-[300px] max-w-[300px] shrink-0 snap-center">
                                <div className="group relative w-full aspect-[9/16] rounded-[2rem] overflow-hidden shadow-xl border-4 border-white hover:border-emerald-400 bg-gray-100 hover:-translate-y-3 hover:shadow-[0_20px_40px_-15px_rgba(16,185,129,0.4)] transition-all duration-500 ease-out cursor-pointer">
                                    <Image
                                        src={testimonial.imageUrl}
                                        alt={testimonial.customerName || 'Testimonial'}
                                        fill
                                        className="object-cover group-hover:scale-110 group-hover:rotate-1 transition-transform duration-700 ease-out"
                                        unoptimized
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
                                            <div className="flex text-yellow-400 drop-shadow-md">
                                                {[...Array(5)].map((_, i) => (
                                                    <svg key={i} className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                    </svg>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </ScrollReveal>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
