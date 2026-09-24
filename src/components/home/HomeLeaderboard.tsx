import React from 'react'
import Image from 'next/image'
import { Trophy, Flame, BookOpen, MapPin } from 'lucide-react'
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

const rankConfig = [
    { medal: '🥇', ring: 'ring-2 ring-yellow-300', cardBg: 'bg-gradient-to-br from-yellow-50 to-amber-50/40 border-yellow-200', avatarRing: 'ring-4 ring-yellow-200', rankBg: 'text-6xl sm:text-7xl drop-shadow-lg', w: 'w-16 h-16 sm:w-20 sm:h-20' },
    { medal: '🥈', ring: 'ring-2 ring-slate-300', cardBg: 'bg-gradient-to-br from-slate-50 to-gray-50/40 border-slate-200', avatarRing: 'ring-2 ring-slate-200', rankBg: 'text-5xl sm:text-6xl drop-shadow-md', w: 'w-12 h-12 sm:w-14 sm:h-14' },
    { medal: '🥉', ring: 'ring-2 ring-amber-400', cardBg: 'bg-gradient-to-br from-amber-50 to-orange-50/40 border-amber-200', avatarRing: 'ring-2 ring-amber-200', rankBg: 'text-5xl sm:text-6xl drop-shadow-md', w: 'w-12 h-12 sm:w-14 sm:h-14' },
]

export default async function HomeLeaderboard({ topReaders }: { topReaders: Reader[] }) {
    const t = await getTranslations('HomeLeaderboard')
    const isAdmin = await isAuthenticated()
    if (!topReaders || topReaders.length === 0) return null

    const top3 = topReaders.slice(0, 3)

    return (
        <section className="py-20 md:py-28 bg-[#F9F7F4] border-y border-stone-100">
            <div className="max-w-6xl mx-auto px-4 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">

                    {/* ── Colonne classement ── */}
                    <div className="lg:col-span-7 space-y-3">

                        {/* Header */}
                        <div className="flex items-center gap-3 mb-6">
                            <div className="inline-flex items-center gap-1.5 text-rose-600 font-black text-[10px] uppercase tracking-[0.3em] bg-white border border-rose-200 px-3 py-1.5 rounded-full shadow-sm">
                                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
                                {t('Badge')}
                            </div>
                        </div>

                        <h2 className="text-3xl font-black text-slate-900 mb-6 flex items-center gap-3">
                            <Trophy className="w-8 h-8 text-yellow-500 fill-yellow-100" />
                            {t('WallOfFame')}
                        </h2>

                        {/* Liste des lecteurs */}
                        <div className="flex flex-col gap-3">
                            {top3.map((reader, idx) => {
                                const books  = reader.booksRead ?? 0
                                const pages  = books * PAGES_PER_BOOK
                                const hours  = Math.round(pages / PAGES_PER_HOUR)
                                const cfg    = rankConfig[idx] ?? rankConfig[3]
                                const isFirst = idx === 0

                                return (
                                    <div
                                        key={reader.id}
                                        className={`flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 border px-4 sm:px-6 py-4 sm:py-5 rounded-2xl transition-all hover:shadow-md ${cfg.cardBg} ${isFirst ? 'shadow-sm' : ''}`}
                                    >
                                        <div className="flex items-center gap-4 w-full sm:w-auto flex-1 min-w-0">
                                            {/* Rang */}
                                            <div className={`w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center font-black flex-shrink-0 ${cfg.rankBg}`}>
                                                {cfg.medal ?? reader.rank}
                                            </div>

                                            {/* Avatar */}
                                            <div className={`rounded-full bg-slate-100 overflow-hidden relative flex-shrink-0 border-2 border-white shadow-sm ${cfg.avatarRing} ${cfg.w}`}>
                                                {reader.image ? (
                                                    <Image
                                                        src={reader.image}
                                                        alt={reader.name || ''}
                                                        fill
                                                        sizes="(max-width: 640px) 64px, 80px"
                                                        className="object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center font-black text-lg sm:text-xl text-slate-400 bg-slate-50">
                                                        {reader.name?.charAt(0).toUpperCase() ?? 'U'}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Nom + Ville */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="font-black text-slate-900 text-base sm:text-lg truncate leading-tight">
                                                        {reader.name || t('Anonymous')}
                                                    </p>
                                                    {isAdmin && (
                                                        <Link href="/admin/users" target="_blank" className="text-[9px] bg-slate-100 hover:bg-slate-200 text-slate-500 px-2 py-0.5 rounded-md font-bold transition-colors shrink-0 border border-slate-200">
                                                            Éditer profil
                                                        </Link>
                                                    )}
                                                </div>
                                                {reader.city && (
                                                    <p className="text-xs text-slate-400 font-semibold mt-0.5 flex items-center gap-1">
                                                        <MapPin className="w-3 h-3" />
                                                        {reader.city}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Stats */}
                                        <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto mt-2 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100/80">
                                            <Stat value={books} label={t('Books')} color="emerald" tooltip="Total des livres lus" />
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
                        {/* Badge challenge */}
                        <div className="inline-flex items-center gap-2 text-orange-600 font-black text-[11px] uppercase tracking-[0.2em] mb-5">
                            <Flame className="w-5 h-5 fill-orange-100" />
                            {t('Challenge') || 'Challenge'}
                        </div>

                        <h3 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight mb-5">
                            {t('Headline')}
                        </h3>

                        <p className="text-slate-500 font-medium leading-relaxed text-base md:text-lg mb-10 max-w-md">
                            {t('Body')}
                        </p>

                        {/* Bouton Google Sign-In */}
                        <OpenAuthModalButton label={t('CTA')} sub={t('Sub')} />

                        {/* Indicateur de lecteurs actifs */}
                        <div className="mt-8 flex items-center gap-3 bg-white border border-slate-100 rounded-2xl px-4 py-3 shadow-sm">
                            <div className="flex -space-x-2">
                                {top3.slice(0, 3).map((r, i) => (
                                    <div key={r.id} className="w-7 h-7 rounded-full bg-slate-200 border-2 border-white overflow-hidden relative" style={{ zIndex: 3 - i }}>
                                        {r.image ? (
                                            <Image src={r.image} alt={r.name || ''} fill className="object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-slate-500">
                                                {r.name?.charAt(0) ?? 'U'}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-600">
                                <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
                                <p className="text-xs font-bold">
                                    <span className="font-black text-slate-900">{top3.length}+</span> lecteurs actifs ce mois
                                </p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    )
}

/* Micro-composant stat */
function Stat({ value, label, color, tooltip }: { value: string | number; label: string; color: 'emerald' | 'blue' | 'amber', tooltip?: string }) {
    const colors = {
        emerald: 'bg-emerald-50 border-emerald-100 text-emerald-700',
        blue:    'bg-blue-50 border-blue-100 text-blue-700',
        amber:   'bg-amber-50 border-amber-100 text-amber-700',
    }

    return (
        <div className={`group relative flex flex-col items-center px-3 sm:px-4 py-2 sm:py-2.5 ${colors[color]} border rounded-xl min-w-[50px] flex-1 sm:flex-none cursor-help hover:scale-105 hover:-translate-y-1 transition-all duration-300 shadow-sm hover:shadow-md`}>
            <span className="font-black text-sm sm:text-base leading-none">{value}</span>
            <span className="text-[10px] font-bold uppercase mt-1.5 opacity-70">{label}</span>

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
