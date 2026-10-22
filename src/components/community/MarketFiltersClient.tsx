'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter, usePathname } from '@/i18n/routing'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Search, MapPin, Loader2 } from 'lucide-react'
import { MOROCCO_CITIES } from '@/lib/constants/cities'

// Simple debounce
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value)

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value)
        }, delay)

        return () => {
            clearTimeout(handler)
        }
    }, [value, delay])

    return debouncedValue
}

interface MarketFiltersProps {
    onPendingChange?: (isPending: boolean) => void
    embedded?: boolean
}

export default function MarketFiltersClient({ onPendingChange, embedded = false }: MarketFiltersProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const t = useTranslations('Community.Market')
    const [isPending, startTransition] = useTransition()

    // Notify parent of pending state
    useEffect(() => {
        onPendingChange?.(isPending)
    }, [isPending, onPendingChange])

    const [search, setSearch] = useState(searchParams.get('search') || '')
    const [city, setCity] = useState(searchParams.get('city') || '')

    // Debounce search input
    const debouncedSearch = useDebounce(search, 500)
    const debouncedCity = useDebounce(city, 500)

    useEffect(() => {
        const params = new URLSearchParams(searchParams)

        if (debouncedSearch) {
            params.set('search', debouncedSearch)
        } else {
            params.delete('search')
        }

        if (debouncedCity) {
            params.set('city', debouncedCity)
        } else {
            params.delete('city')
        }

        const newQuery = params.toString()
        const currentQuery = searchParams.toString()

        if (newQuery !== currentQuery) {
            startTransition(() => {
                router.replace(`${pathname}?${newQuery}`, { scroll: false })
            })
        }
    }, [debouncedSearch, debouncedCity, pathname, router, searchParams])

    return (
        <div className={`flex flex-col sm:flex-row gap-2.5 sm:gap-4 ${embedded ? 'm-0 rounded-2xl sm:rounded-[1.5rem] bg-white/95 p-2 sm:p-2.5 shadow-xl sm:shadow-2xl ring-1 ring-black/5 backdrop-blur-xl border border-gray-100 sm:border-transparent' : 'mb-8'}`}>
            <div className="flex-1 lg:max-w-2xl relative">
                <Search className="absolute ltr:left-4 ltr:right-auto rtl:right-4 rtl:left-auto top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400 pointer-events-none" />
                <input
                    type="text"
                    placeholder={t('SearchPlaceholder')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full ltr:pl-11 ltr:pr-10 rtl:pr-11 rtl:pl-10 py-3 sm:py-4 bg-white border border-gray-100 rounded-xl sm:rounded-2xl shadow-sm focus:border-black focus:ring-0 outline-none transition-all font-bold text-xs sm:text-sm"
                />
                {isPending && (
                    <div className="absolute ltr:right-4 ltr:left-auto rtl:left-4 rtl:right-auto top-1/2 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-black animate-spin" />
                    </div>
                )}
            </div>
            <div className="w-full sm:w-56 md:w-64 relative">
                <MapPin className="absolute ltr:left-4 ltr:right-auto rtl:right-4 rtl:left-auto top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400 pointer-events-none z-10" />
                <select aria-label="Champ de sélection"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full ltr:pl-11 ltr:pr-9 rtl:pr-11 rtl:pl-9 py-3 sm:py-4 bg-white border border-gray-100 rounded-xl sm:rounded-2xl shadow-sm focus:border-black focus:ring-0 outline-none transition-all font-bold text-xs sm:text-sm appearance-none cursor-pointer"
                >
                    <option value="">{t('AllCities')}</option>
                    {MOROCCO_CITIES.map((cityName) => (
                        <option key={cityName} value={cityName}>{cityName}</option>
                    ))}
                </select>
                <div className="absolute ltr:right-4 ltr:left-auto rtl:left-4 rtl:right-auto top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>
        </div>
    )
}
