'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter, usePathname } from '@/i18n/routing'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Search, MapPin, Loader2, Navigation, X } from 'lucide-react'
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

    const paramLat = searchParams.get('lat')
    const paramLng = searchParams.get('lng')
    const paramRadius = searchParams.get('radius')
    const isGeoActive = Boolean(paramLat && paramLng)

    const [search, setSearch] = useState(searchParams.get('search') || '')
    const [city, setCity] = useState(searchParams.get('city') || '')
    const [isLocating, setIsLocating] = useState(false)
    const [radius, setRadius] = useState<number>(paramRadius ? Number(paramRadius) : 25)

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

    const handleEnableLocation = () => {
        if (typeof window === 'undefined' || !navigator.geolocation) {
            alert("La géolocalisation n'est pas supportée par votre navigateur.")
            return
        }

        setIsLocating(true)
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setIsLocating(false)
                const lat = pos.coords.latitude.toFixed(4)
                const lng = pos.coords.longitude.toFixed(4)
                const params = new URLSearchParams(searchParams)
                params.set('lat', lat)
                params.set('lng', lng)
                params.set('radius', String(radius))
                params.delete('city')
                setCity('')
                startTransition(() => {
                    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
                })
            },
            (err) => {
                setIsLocating(false)
                console.warn('Geolocation error:', err.message)
                alert("Impossible d'accéder à votre position. Veuillez autoriser la géolocalisation.")
            },
            { enableHighAccuracy: true, timeout: 10000 }
        )
    }

    const handleDisableLocation = () => {
        const params = new URLSearchParams(searchParams)
        params.delete('lat')
        params.delete('lng')
        params.delete('radius')
        startTransition(() => {
            router.replace(`${pathname}?${params.toString()}`, { scroll: false })
        })
    }

    const handleRadiusChange = (newRadius: number) => {
        setRadius(newRadius)
        if (isGeoActive) {
            const params = new URLSearchParams(searchParams)
            params.set('radius', String(newRadius))
            startTransition(() => {
                router.replace(`${pathname}?${params.toString()}`, { scroll: false })
            })
        }
    }

    return (
        <div className={`flex flex-col md:flex-row items-stretch md:items-center gap-2.5 sm:gap-3 ${embedded ? 'm-0 rounded-2xl sm:rounded-[1.5rem] bg-white/95 p-2 sm:p-2.5 shadow-xl sm:shadow-2xl ring-1 ring-black/5 backdrop-blur-xl border border-gray-100 sm:border-transparent' : 'mb-8'}`}>
            {/* Search Input */}
            <div className="flex-1 relative">
                <Search className="absolute ltr:left-4 ltr:right-auto rtl:right-4 rtl:left-auto top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400 pointer-events-none" />
                <input
                    type="text"
                    placeholder={t('SearchPlaceholder')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full ltr:pl-11 ltr:pr-10 rtl:pr-11 rtl:pl-10 py-3 sm:py-3.5 bg-white border border-gray-100 rounded-xl sm:rounded-2xl shadow-sm focus:border-black focus:ring-0 outline-none transition-all font-bold text-xs sm:text-sm"
                />
                {isPending && (
                    <div className="absolute ltr:right-4 ltr:left-auto rtl:left-4 rtl:right-auto top-1/2 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-black animate-spin" />
                    </div>
                )}
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                {/* Proximity / GPS Button */}
                {isGeoActive ? (
                    <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200/80 rounded-xl sm:rounded-2xl px-3 py-2 text-emerald-900 text-xs font-bold shrink-0 shadow-xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                        <Navigation className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span className="hidden xs:inline text-[11px] font-black uppercase text-emerald-800">Rayon:</span>
                        <select
                            value={radius}
                            onChange={(e) => handleRadiusChange(Number(e.target.value))}
                            className="bg-transparent font-black text-xs text-emerald-950 border-none outline-none cursor-pointer pr-1"
                            aria-label="Rayon de recherche"
                        >
                            <option value={10}>10 km</option>
                            <option value={25}>25 km</option>
                            <option value={50}>50 km</option>
                            <option value={100}>100 km</option>
                        </select>
                        <button
                            type="button"
                            onClick={handleDisableLocation}
                            className="w-5 h-5 rounded-full hover:bg-emerald-200/60 flex items-center justify-center text-emerald-800 transition-colors ml-1 cursor-pointer"
                            title={t('CancelLocation')}
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={handleEnableLocation}
                        disabled={isLocating}
                        className="inline-flex items-center justify-center gap-2 px-3.5 py-3 sm:py-3.5 bg-white hover:bg-emerald-50/60 border border-gray-100 hover:border-emerald-200 rounded-xl sm:rounded-2xl shadow-sm font-bold text-xs sm:text-sm text-gray-700 hover:text-emerald-900 transition-all shrink-0 cursor-pointer whitespace-nowrap active:scale-95"
                        title={t('NearMe')}
                    >
                        {isLocating ? (
                            <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                        ) : (
                            <Navigation className="w-4 h-4 text-emerald-600" />
                        )}
                        <span>{isLocating ? t('Locating') : t('NearMe')}</span>
                    </button>
                )}

                {/* City Select */}
                <div className="w-full sm:w-48 md:w-56 relative">
                    <MapPin className="absolute ltr:left-3.5 ltr:right-auto rtl:right-3.5 rtl:left-auto top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                    <select
                        aria-label="Filtrer par ville"
                        value={city}
                        onChange={(e) => {
                            setCity(e.target.value)
                            if (e.target.value && isGeoActive) {
                                handleDisableLocation()
                            }
                        }}
                        className="w-full ltr:pl-10 ltr:pr-8 rtl:pr-10 rtl:pl-8 py-3 sm:py-3.5 bg-white border border-gray-100 rounded-xl sm:rounded-2xl shadow-sm focus:border-black focus:ring-0 outline-none transition-all font-bold text-xs sm:text-sm appearance-none cursor-pointer"
                    >
                        <option value="">{t('AllCities')}</option>
                        {MOROCCO_CITIES.map((cityName) => (
                            <option key={cityName} value={cityName}>{cityName}</option>
                        ))}
                    </select>
                    <div className="absolute ltr:right-3.5 ltr:left-auto rtl:left-3.5 rtl:right-auto top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    )
}

