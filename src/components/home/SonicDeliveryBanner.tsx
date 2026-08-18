'use client'

import Image from 'next/image'
import ScrollReveal from '@/components/ScrollReveal'
import { Clock, MapPin, ArrowRight } from 'lucide-react'
import { Link } from '@/i18n/routing'

interface SonicDeliveryProps {
    locale: string;
    title: string;
    subtitle: string;
    description: string;
    badge1: string;
    badge2: string;
    buttonText: string;
}

export default function SonicDeliveryBanner({ locale, title, subtitle, description, badge1, badge2, buttonText }: SonicDeliveryProps) {
    return (
        <section className="py-12 bg-white text-black relative overflow-hidden border-b border-gray-100">
            {/* Background elements */}
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg width=\\'60\\' height=\\'60\\' viewBox=\\'0 0 60 60\\' xmlns=\\'http://www.w3.org/2000/svg\\'%3E%3Cg fill=\\'none\\' fill-rule=\\'evenodd\\'%3E%3Cg fill=\\'%23000000\\' fill-opacity=\\'1\\'%3E%3Cpath d=\\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')" }}></div>
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                    
                    <ScrollReveal animation="animate-reveal-right" className="order-2 lg:order-1 flex flex-col space-y-5">
                        <h2 className="text-4xl md:text-5xl font-black leading-tight">
                            {title}
                            <br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-500">
                                {subtitle}
                            </span>
                        </h2>
                        
                        <p className="text-gray-500 text-lg max-w-lg font-medium">
                            {description}
                        </p>

                        <div className="flex flex-wrap gap-4 pt-2">
                            <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-gray-100 shadow-sm">
                                <div className="bg-yellow-100 p-2 rounded-full">
                                    <Clock className="text-yellow-600 w-5 h-5" />
                                </div>
                                <span className="font-bold text-lg">{badge1}</span>
                            </div>
                            <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-gray-100 shadow-sm">
                                <div className="bg-blue-100 p-2 rounded-full">
                                    <MapPin className="text-blue-500 w-5 h-5 fill-current" />
                                </div>
                                <span className="font-bold text-lg">{badge2}</span>
                            </div>
                        </div>

                        <div className="pt-6">
                            <Link href="/books" className="group inline-flex items-center gap-3 px-8 py-4 bg-black text-white font-black text-xs uppercase tracking-widest rounded-full hover:bg-gray-800 transition-all shadow-xl hover:-translate-y-1">
                                <span>{buttonText}</span>
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform rtl:rotate-180" />
                            </Link>
                        </div>
                    </ScrollReveal>

                    <ScrollReveal animation="animate-reveal-left" className="order-1 lg:order-2 flex justify-center lg:justify-end relative">
                        <div className="relative w-full max-w-[380px] aspect-[4/3] rounded-3xl flex items-center justify-center rotate-[-2deg] hover:rotate-0 transition-all duration-500 hover:scale-105">
                            {/* Fast motion lines background effect */}
                            <div className="absolute inset-0 bg-blue-400 rounded-3xl opacity-10 blur-2xl animate-pulse"></div>
                            <Image 
                                src="/images/sonic_delivery.jpg" 
                                alt="Sonic Delivery Rabat" 
                                fill 
                                className="object-cover rounded-3xl shadow-2xl border-4 border-yellow-400/80 relative z-10"
                            />
                        </div>
                    </ScrollReveal>

                </div>
            </div>
        </section>
    )
}
