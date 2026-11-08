'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import dynamic from 'next/dynamic'

const CustomPackModal = dynamic(() => import('./CustomPackModal'), { ssr: false })

interface CustomPackBuilderProps {
    availableBooks?: any[]
    initialOpen?: boolean
}

export default function CustomPackBuilder({ availableBooks = [], initialOpen = false }: CustomPackBuilderProps) {
    const t = useTranslations('Packs')
    const [isOpen, setIsOpen] = useState(initialOpen)

    return (
        <>
            {/* Banner */}
            <div className="relative bg-gray-900 p-8 md:p-12 rounded-[2.5rem] shadow-2xl mb-12 flex flex-col md:flex-row items-center justify-between gap-8 overflow-hidden group">
                <div className="absolute inset-0">
                    <Image
                        src="/images/custom_pack.png"
                        alt="Custom Pack Builder"
                        fill
                        sizes="(max-width: 768px) 100vw, 100vw"
                        className="object-cover opacity-40 group-hover:opacity-50 transition-opacity duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent rtl:bg-gradient-to-l"></div>
                </div>

                <div className="relative z-10 text-center md:text-left rtl:md:text-right space-y-4 max-w-xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-white/90 text-sm font-bold uppercase tracking-widest backdrop-blur-sm">
                        <SparklesIcon className="w-4 h-4 text-yellow-400" />
                        {t('Exclusive')}
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black text-white">{t('CustomPack.BannerTitle')}</h2>
                    <p className="text-gray-200 font-medium text-base md:text-lg">{t('CustomPack.BannerDesc')}</p>
                </div>

                <button
                    onClick={() => setIsOpen(true)}
                    className="relative z-10 bg-white text-black px-8 py-4 rounded-full font-black uppercase tracking-widest text-base hover:scale-105 transition-transform shadow-[0_0_40px_rgba(255,255,255,0.3)] flex items-center gap-3 shrink-0"
                >
                    <Plus className="w-5 h-5" />
                    {t('CustomPack.BannerBtn')}
                </button>
            </div>

            {/* Modal - Loaded only on demand */}
            {isOpen && (
                <CustomPackModal
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    availableBooks={availableBooks}
                />
            )}
        </>
    )
}

function SparklesIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            <path d="M5 3v4" />
            <path d="M19 17v4" />
            <path d="M3 5h4" />
            <path d="M17 19h4" />
        </svg>
    )
}
