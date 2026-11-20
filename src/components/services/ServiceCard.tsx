import Link from 'next/link'
import { ReactNode } from 'react'

interface ServiceCardProps {
    id: string
    title: string
    desc: string
    icon: ReactNode
    color: string
    bg: string
    link: string
    locale: string
}

export default function ServiceCard({ title, desc, icon, color, bg, link, locale }: ServiceCardProps) {
    return (
        <Link href={`/${locale}${link}`} className="block group">
            <div className={`rounded-[2.5rem] p-8 md:p-10 shadow-xl shadow-black/5 border border-white/50 relative overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl h-full flex flex-col justify-between ${bg}`}>
                
                {/* Background Decorative Circle */}
                <div className={`absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-10 transition-transform duration-500 group-hover:scale-150 ${color}`} />

                <div>
                    <div className={`w-16 h-16 md:w-20 md:h-20 ${color} rounded-2xl flex items-center justify-center shadow-lg shadow-black/10 mb-8 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 relative z-10`}>
                        {icon}
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black text-black mb-4 tracking-tight relative z-10">
                        {title}
                    </h2>
                    <p className="text-gray-700 font-medium text-sm md:text-base leading-relaxed relative z-10">
                        {desc}
                    </p>
                </div>

                <div className="mt-8 flex items-center justify-end relative z-10">
                    <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center group-hover:bg-pixio-yellow transition-colors duration-300">
                        <svg className={`w-5 h-5 ${locale === 'ar' ? 'text-white group-hover:text-black transform rotate-180' : 'text-white group-hover:text-black'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </div>
                </div>
            </div>
        </Link>
    )
}
