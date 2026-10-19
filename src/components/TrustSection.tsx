'use client'

import { useTranslations } from 'next-intl'
import { BookCheck, Globe, Users2, Repeat } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useResponsiveAnimation } from '@/hooks/useResponsiveAnimation'

function AnimatedCounter({ value, duration = 2000 }: { value: string, duration?: number }) {
    const numericValue = parseInt(value.replace(/[^0-9]/g, '')) || 0
    const suffix = value.replace(/[0-9]/g, '')

    const [isVisible, setIsVisible] = useState(false)
    const [hasAnimated, setHasAnimated] = useState(false)
    const elementRef = useRef<HTMLSpanElement>(null)

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true)
                }
            },
            { threshold: 0.1 }
        )

        if (elementRef.current) {
            observer.observe(elementRef.current)
        }

        return () => observer.disconnect()
    }, [])

    useEffect(() => {
        if (!isVisible || hasAnimated || !elementRef.current) return

        let start = 0
        const end = numericValue
        const range = end - start
        let current = start
        const stepTime = 16

        // Assurer un stepTime minimum pour la fluidité
        const timer = setInterval(() => {
            current += Math.ceil(range / (duration / stepTime)) // ~60fps
            if (current >= end) {
                current = end
                setHasAnimated(true)
                clearInterval(timer)
            }
            if (elementRef.current) {
                elementRef.current.innerText = current.toLocaleString('fr-FR') + suffix
            }
        }, stepTime)

        return () => clearInterval(timer)
    }, [isVisible, numericValue, duration, hasAnimated, suffix])

    // SSR et valeur par défaut : on affiche la valeur finale pour le SEO et si le JS crash
    return (
        <span ref={elementRef} className="tabular-nums">
            {numericValue.toLocaleString('fr-FR')}{suffix}
        </span>
    )
}

interface StatCardProps {
    icon: React.ReactNode
    number: string
    label: string
    bgColor: string
    iconColor: string
    idx: number
}

function StatCard({ icon, number, label, bgColor, iconColor, idx }: StatCardProps) {
    return (
        <div
            className="group relative bg-white rounded-[3rem] p-12 flex flex-col items-center text-center shadow-2xl shadow-black/5 border border-gray-100/50 hover:border-pixio-yellow transition-all duration-700 hover:-translate-y-3"
            style={{ transitionDelay: `${idx * 100}ms` }}
        >
            {/* Decorative Background Glass */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity rounded-[3rem]"></div>

            <div className={`relative w-24 h-24 ${bgColor} rounded-[2rem] flex items-center justify-center mb-10 group-hover:rotate-12 transition-transform duration-500 shadow-xl`}>
                <div className={`${iconColor} scale-125`}>
                    {icon}
                </div>
            </div>

            <div className="relative space-y-3">
                <h3 className="text-6xl font-black text-black tracking-[-0.05em] leading-none mb-2 group-hover:scale-110 transition-transform duration-500">
                    <AnimatedCounter value={number} />
                </h3>
                <div className="w-10 h-1 bg-gray-100 mx-auto rounded-full group-hover:w-16 group-hover:bg-pixio-yellow transition-all duration-500"></div>
                <p className="text-[10px] md:text-xs rtl:text-sm rtl:tracking-normal font-black uppercase text-gray-500 tracking-[0.3em] font-outfit">
                    {label}
                </p>
            </div>

            {/* Corner Decorative Element */}
            <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-20 transition-opacity">
                <Repeat className="w-12 h-12 text-black -rotate-12" />
            </div>
        </div>
    )
}

export default function TrustSection({ stats, className, style }: { stats?: { books: number, readers: number, exchanges: number }, className?: string, style?: React.CSSProperties }) {
    const t = useTranslations('HomePage.Trust')
    const pulseClass = useResponsiveAnimation('animate-pulse')
    const pingClass = useResponsiveAnimation('animate-ping')

    const statsData = [
        {
            icon: <BookCheck className="w-10 h-10" />,
            number: stats?.books ? `${stats.books}+` : "1500+",
            label: t('Items.Books'),
            bgColor: "bg-pixio-yellow/30",
            iconColor: "text-amber-600"
        },
        {
            icon: <Globe className="w-10 h-10" />,
            number: "50+",
            label: t('Items.Cities'),
            bgColor: "bg-emerald-50",
            iconColor: "text-emerald-600"
        },
        {
            icon: <Users2 className="w-10 h-10" />,
            number: stats?.readers ? `${stats.readers}+` : "1200+",
            label: t('Items.Readers'),
            bgColor: "bg-rose-50",
            iconColor: "text-rose-500"
        },
        {
            icon: <Repeat className="w-10 h-10" />,
            number: stats?.exchanges ? `${stats.exchanges}+` : "300+",
            label: t('Items.Exchanges'),
            bgColor: "bg-emerald-50",
            iconColor: "text-emerald-600"
        }
    ]

    return (
        <section className={`py-8 relative overflow-hidden ${className || 'bg-white'}`} style={style}>
            {/* Master Background Elements */}
            <div className={`absolute top-0 right-0 w-[800px] h-[800px] bg-pixio-yellow/10 rounded-full blur-[150px] -translate-y-1/2 translate-x-1/2 -z-10 ${pulseClass}`}></div>
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-sky-50/20 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2 -z-10"></div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header with High-End Typography */}
                <div className="flex flex-col items-start text-start max-w-4xl mb-6 sm:mb-10 md:mb-12 space-y-4 sm:space-y-6 md:space-y-8">
                    <div className="inline-flex items-center gap-3 px-8 py-3 bg-black text-white rounded-full hover:scale-105 transition-transform cursor-default">
                        <div className={`w-2 h-2 bg-pixio-yellow rounded-full ${pingClass}`}></div>
                        <span className="text-xs md:text-sm font-black uppercase tracking-[0.3em] rtl:tracking-normal">
                            {t('Badge')}
                        </span>
                    </div>

                    <h2 className="text-4xl md:text-6xl font-black text-black tracking-tight rtl:tracking-normal leading-tight uppercase">
                        {t('Title')}<span className="text-pixio-yellow">.</span>
                    </h2>

                    <p className="text-lg md:text-xl text-gray-500 font-medium tracking-tight rtl:tracking-normal max-w-2xl italic">
                        {t('Description')}
                    </p>
                </div>

                {/* Grid with Custom Spacing */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                    {statsData.map((stat, idx) => (
                        <StatCard
                            key={idx}
                            {...stat}
                            idx={idx}
                        />
                    ))}
                </div>
            </div>
        </section>
    )
}
