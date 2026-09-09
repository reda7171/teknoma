import React from 'react'
import Image from 'next/image'
import { Trophy, Flame } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import OpenAuthModalButton from '@/components/auth/OpenAuthModalButton'

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
    { ring: 'ring-yellow-400', bg: 'bg-yellow-50', text: 'text-yellow-600', medal: '🥇' },
    { ring: 'ring-slate-300',  bg: 'bg-slate-50',  text: 'text-slate-500',  medal: '🥈' },
    { ring: 'ring-amber-500',  bg: 'bg-amber-50',  text: 'text-amber-600',  medal: '🥉' },
    { ring: 'ring-slate-200',  bg: 'bg-white',     text: 'text-slate-400',  medal: null },
    { ring: 'ring-slate-200',  bg: 'bg-white',     text: 'text-slate-400',  medal: null },
]

export default async function HomeLeaderboard({ topReaders }: { topReaders: Reader[] }) {
    const t = await getTranslations('HomeLeaderboard')
    if (!topReaders || topReaders.length === 0) return null

    const top5 = topReaders.slice(0, 5)

    return (
        <section className="py-16 md:py-24 bg-stone-50 border-y border-stone-100">
            <div className="max-w-5xl mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-20 items-center">

                    {/* ── Colonne classement ── */}
                    <div>
                        {/* Badge live */}
                        <div className="inline-flex items-center gap-1.5 text-rose-500 font-black text-[10px] uppercase tracking-[0.3em] bg-white border border-rose-100 px-3 py-1.5 rounded-full shadow-sm mb-5">
                            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
                            {t('Badge')}
                        </div>

                        <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-2">
                            <Trophy className="w-6 h-6 text-yellow-500" />
                            {t('WallOfFame')}
                        </h2>

                        <div className="flex flex-col gap-2.5">
                            {top5.map((reader, idx) => {
                                const books  = reader.booksRead ?? 0
                                const pages  = books * PAGES_PER_BOOK
                                const hours  = Math.round(pages / PAGES_PER_HOUR)
                                const style  = rankStyle[idx] ?? rankStyle[3]

                                return (
                                    <div
                                        key={reader.id}
                                        className={`flex items-center gap-3 bg-white border border-slate-100 px-4 py-3 rounded-2xl shadow-sm hover:shadow-md transition-all ${idx === 0 ? 'ring-2 ring-yellow-200' : ''}`}
                                    >
                                        {/* Rang */}
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs flex-shrink-0 ring-2 ${style.ring} ${style.bg} ${style.text}`}>
                                            {style.medal ?? reader.rank}
                                        </div>

                                        {/* Avatar */}
                                        <div className="w-9 h-9 rounded-full bg-slate-100 overflow-hidden relative flex-shrink-0 border border-slate-200">
                                            {reader.image ? (
                                                <Image src={reader.image} alt={reader.name || ''} fill className="object-cover" unoptimized />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center font-black text-sm text-slate-400">
                                                    {reader.name?.charAt(0).toUpperCase() ?? 'U'}
                                                </div>
                                            )}
                                        </div>

                                        {/* Nom + Ville */}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-black text-slate-900 text-sm truncate leading-tight">{reader.name || t('Anonymous')}</p>
                                            {reader.city && (
                                                <p className="text-[10px] font-semibold text-slate-400 truncate">{reader.city}</p>
                                            )}
                                        </div>

                                        {/* 3 stats */}
                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                            <Stat value={books}  label={t('Books')} color="emerald" />
                                            <Stat value={pages.toLocaleString()} label={t('Pages')} color="blue" />
                                            <Stat value={`${hours}${t('Hours')}`} label="est." color="amber" />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* ── Colonne copywriting ── */}
                    <div className="flex flex-col">
                        <div className="inline-flex items-center gap-2 text-orange-500 font-black text-[10px] uppercase tracking-[0.25em] mb-5">
                            <Flame className="w-4 h-4" />
                            Challenge
                        </div>

                        <h3 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight mb-5">
                            {t('Headline')}
                        </h3>

                        <p className="text-slate-500 font-medium leading-relaxed text-base mb-8 max-w-sm">
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
function Stat({ value, label, color }: { value: string | number; label: string; color: 'emerald' | 'blue' | 'amber' }) {
    const colors = {
        emerald: 'bg-emerald-50 border-emerald-100 text-emerald-600 text-emerald-500',
        blue:    'bg-blue-50 border-blue-100 text-blue-600 text-blue-500',
        amber:   'bg-amber-50 border-amber-100 text-amber-600 text-amber-500',
    }
    const [bg, border, val, sub] = colors[color].split(' ')

    return (
        <div className={`flex flex-col items-center px-2 py-1 ${bg} border ${border} rounded-lg min-w-[32px]`}>
            <span className={`font-black text-xs leading-none ${val}`}>{value}</span>
            <span className={`text-[7px] font-bold uppercase mt-0.5 ${sub}/70`}>{label}</span>
        </div>
    )
}
