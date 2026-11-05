'use client'

import React from 'react'
import { Trophy, Medal, Award, BookOpen } from 'lucide-react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'

interface Reader {
    id: string;
    name: string | null;
    city: string | null;
    image: string | null;
    booksRead: number;
    rank: number;
}

export default function ReadingLeaderboard({ topReaders }: { topReaders: Reader[] }) {
    const t = useTranslations('Community.ReadingList.Leaderboard')

    if (!topReaders || topReaders.length === 0) return null

    const getMedal = (rank: number) => {
        switch (rank) {
            case 1: return <Trophy className="w-6 h-6 text-yellow-500 drop-shadow-md" />
            case 2: return <Medal className="w-6 h-6 text-gray-400 drop-shadow-md" />
            case 3: return <Award className="w-6 h-6 text-amber-700 drop-shadow-md" />
            default: return <span className="w-6 h-6 flex items-center justify-center font-black text-gray-400">{rank}</span>
        }
    }

    const getBgColor = (rank: number) => {
        switch (rank) {
            case 1: return 'bg-yellow-50/50 border-yellow-200'
            case 2: return 'bg-gray-50 border-gray-200'
            case 3: return 'bg-amber-50/50 border-amber-200'
            default: return 'bg-white border-gray-100'
        }
    }

    return (
        <div className="w-full max-w-4xl mx-auto mb-16 px-4">
            <div className="text-center mb-8">
                <h2 className="text-3xl sm:text-4xl font-black text-black uppercase tracking-tighter mb-3">{t('Title')}</h2>
                <p className="text-gray-500 font-medium max-w-xl mx-auto">{t('Subtitle')}</p>
            </div>

            <div className="flex flex-col gap-3">
                {topReaders.map((reader) => (
                    <div 
                        key={reader.id} 
                        className={`flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-[1.5rem] border ${getBgColor(reader.rank)} shadow-sm hover:shadow-md transition-shadow`}
                    >
                        <div className="flex-shrink-0 flex items-center justify-center w-8 sm:w-10">
                            {getMedal(reader.rank)}
                        </div>
                        
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-200 overflow-hidden relative flex-shrink-0 border-2 border-white shadow-sm">
                            {reader.image ? (
                                <Image
                                    src={reader.image}
                                    alt={reader.name || 'User'}
                                    fill
                                    sizes="(max-width: 639px) 40px, 48px"
                                    className="object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-blue-50 text-blue-600 font-black text-lg">
                                    {reader.name ? reader.name.charAt(0).toUpperCase() : 'U'}
                                </div>
                            )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                            <h3 className="text-base sm:text-lg font-black text-black truncate">{reader.name || t('Anonymous')}</h3>
                            {reader.city && (
                                <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">{reader.city}</p>
                            )}
                        </div>
                        
                        <div className="flex items-center gap-1.5 sm:gap-2 bg-white/80 backdrop-blur px-3 sm:px-4 py-2 rounded-xl border border-gray-100 shadow-sm ml-auto">
                            <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
                            <span className="font-black text-blue-600 text-base sm:text-lg">{reader.booksRead}</span>
                            <span className="text-[9px] sm:text-[10px] font-black text-gray-500 uppercase tracking-widest hidden sm:inline">{t('BooksRead')}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
