import React from 'react'
import Image from 'next/image'
import { Trophy, Flame } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import OpenAuthModalButton from '@/components/auth/OpenAuthModalButton'
import { isAuthenticated } from '@/lib/actions/auth'
import { Link } from '@/i18n/routing'

interface Reader {
    id: string;
    name: string | null;
    city: string | null;
    image: string | null;
    booksRead: number;
    rank: number;
}

const PAGES_PER_BOOK = 280
const PAGES_PER_HOUR = 30

const rankStyle = [
    { ring: 'ring-yellow-400', bg: 'bg-yellow-50', text: 'text-yellow-700', medal: '🥇' },
    { ring: 'ring-slate-300',  bg: 'bg-slate-50',  text: 'text-slate-600',  medal: '🥈' },
    { ring: 'ring-amber-500',  bg: 'bg-amber-50',  text: 'text-amber-700',  medal: '🥉' },
    { ring: 'ring-slate-200',  bg: 'bg-white',     text: 'text-slate-600',  medal: null },
    { ring: 'ring-slate-200',  bg: 'bg-white',     text: 'text-slate-600',  medal: null },
]

export default async function HomeLeaderboard({ topReaders }: { topReaders: Reader[] }) {
    const t = await getTranslations('HomeLeaderboard')
    const isAdmin = await isAuthenticated()
    if (!topReaders || topReaders.length === 0) return null

    const top5 = topReaders.slice(0, 5)

    return (
        <section className="py-16 md:py-24 bg-stone-50 border-y border-stone-100">
            <div className="max-w-6xl mx-auto px-4 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">

                    {/* ── Colonne classement ── */}
                    <div className="lg:col-span-7">
                        {/* Badge live */}
                        <div className="inline-flex items-center gap-1.5 text-rose-700 font-black text-[10px] uppercase tracking-[0.3em] bg-white border border-rose-200 px-3 py-1.5 rounded-full shadow-sm mb-5">
                            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
                            {t('Badge')}
                        </div>

                        <h2 className="text-3xl font-black text-slate-900 mb-6 flex items-center gap-3">
                            <Trophy className="w-8 h-8 text-yellow-500" />
                            {t('WallOfFame')}
                        </h2>

                        <div className="flex flex-col gap-4">
                            {top5.map((reader, idx) => {
                                const books  = reader.booksRead ?? 0
                                const pages  = books * PAGES_PER_BOOK
                                const hours  = Math.round(pages / PAGES_PER_HOUR)
                                const style  = rankStyle[idx] ?? rankStyle[3]

                                return (
                                    <div
                                        key={reader.id}
                                        className={`flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 bg-white border border-slate-100 px-4 sm:px-6 py-4 sm:py-5 rounded-2xl shadow-sm hover:shadow-md transition-all ${idx === 0 ? 'ring-2 ring-yellow-200 bg-yellow-50/10' : ''}`}
                                    >
                                        <div className="flex items-center gap-4 w-full sm:w-auto flex-1 min-w-0">
                                            {/* Rang */}
                                            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-black text-sm sm:text-base flex-shrink-0 ring-2 shadow-sm ${style.ring} ${style.bg} ${style.text}`}>
                                                {style.medal ?? reader.rank}
                                            </div>

                                            {/* Avatar */}
                                            <div className={`rounded-full bg-slate-100 overflow-hidden relative flex-shrink-0 border-2 border-white shadow-sm ${idx === 0 ? 'w-16 h-16 sm:w-20 sm:h-20 ring-4 ring-yellow-100' : 'w-12 h-12 sm:w-16 sm:h-16 ring-2 ring-slate-100'}`}>
                                                {reader.image ? (
                                                    <Image 
                                                        src={reader.image} 
                                                        alt={reader.name || ''} 
                                                        fill 
                                                        className="object-cover" 
                                                        unoptimized 
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center font-black text-lg sm:text-xl text-slate-500">
                                                        {reader.name?.charAt(0).toUpperCase() ?? 'U'}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Nom + Ville */}
                                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="font-black text-slate-900 text-base sm:text-lg truncate leading-tight">{reader.name || t('Anonymous')}</p>
                                                    {isAdmin && (
                                                        <Link href="/admin/users" target="_blank" className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md font-bold transition-colors shrink-0 border border-slate-200">
                                                            Éditer profil
                                                        </Link>
                                                    )}
                                                </div>
                                                {reader.city && (
                                                    <p className="text-xs sm:text-sm font-semibold text-slate-600 mt-0.5 truncate">{reader.city}</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* 3 stats */}
                                        <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto mt-2 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100/80">
                                            <Stat value={books}  label={t('Books')} color="emerald" tooltip="Total des livres lus" />
                                            <Stat value={pages.toLocaleString()} label={t('Pages')} color="blue" tooltip="Pages estimées (280/livre)" />
                                            <Stat value={`${hours}${t('Hours')}`} label="est." color="amber" tooltip="Temps de lecture estimé" />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* ── Colonne copywriting ── */}
                    <div className="lg:col-span-5 flex flex-col items-center lg:items-start text-center lg:text-start">
                        <div className="inline-flex items-center gap-2 text-orange-700 font-black text-xs uppercase tracking-[0.25em] rtl:tracking-normal mb-5">
                            <Flame className="w-5 h-5" />
                            {t('Challenge') || 'Challenge'}
                        </div>

                        <h3 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight mb-6 rtl:tracking-normal">
                            {t('Headline')}
                        </h3>

                        <p className="text-slate-500 font-medium leading-relaxed text-lg mb-10 max-w-md rtl:tracking-normal">
                            {t('Body')}
                        </p>

                        <OpenAuthModalButton label={t('CTA')} sub={t('Sub')} />
                    </div>

                </div>
            </div>
        </section>
    )
}

/* Micro-composant stat */
function Stat({ value, label, color, tooltip }: { value: string | number; label: string; color: 'emerald' | 'blue' | 'amber', tooltip?: string }) {
    const colors = {
        emerald: 'bg-emerald-50 border-emerald-100 text-emerald-800 text-emerald-800',
        blue:    'bg-blue-50 border-blue-100 text-blue-800 text-blue-800',
        amber:   'bg-amber-50 border-amber-100 text-amber-800 text-amber-800',
    }
    const [bg, border, val, sub] = colors[color].split(' ')

    return (
        <div className={`group relative flex flex-col items-center px-3 sm:px-4 py-2 sm:py-2.5 ${bg} border ${border} rounded-xl min-w-[50px] flex-1 sm:flex-none cursor-help hover:scale-105 hover:-translate-y-1 transition-all duration-300 shadow-sm hover:shadow-md`}>
            <span className={`font-black text-sm sm:text-base leading-none ${val}`}>{value}</span>
            <span className={`text-[10px] font-bold uppercase mt-1.5 ${sub}`}>{label}</span>
            
            {/* Tooltip */}
            {tooltip && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 group-hover:-translate-y-2 transition-all duration-300 pointer-events-none z-10 w-max">
                    <div className="bg-slate-800 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-xl relative">
                        {tooltip}
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
                    </div>
                </div>
            )}
        </div>
    )
}
