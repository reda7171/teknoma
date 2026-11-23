'use client'

import React, { useMemo } from 'react'
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api'
import { MapPin, BookOpen } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { getPrimaryImage } from '@/lib/utils/image'
import { normalizeImage } from '@/lib/utils'
import { Link } from '@/i18n/routing'
import { useUIStore } from '@/store/ui'

const MOROCCO_CITIES: Record<string, { lat: number, lng: number }> = {
    "Casablanca": { lat: 33.5731, lng: -7.5898 },
    "Rabat": { lat: 34.0209, lng: -6.8416 },
    "Marrakech": { lat: 31.6295, lng: -7.9811 },
    "Fès": { lat: 34.0331, lng: -5.0003 },
    "Tanger": { lat: 35.7595, lng: -5.8340 },
    "Agadir": { lat: 30.4202, lng: -9.5982 },
    "Oujda": { lat: 34.6814, lng: -1.9086 },
    "Meknès": { lat: 33.8935, lng: -5.5496 },
    "Kenitra": { lat: 34.2541, lng: -6.5890 },
    "Tétouan": { lat: 35.5785, lng: -5.3684 },
    "Safi": { lat: 32.2994, lng: -9.2372 },
    "El Jadida": { lat: 33.2316, lng: -8.5007 },
    "Béni Mellal": { lat: 32.3373, lng: -6.3498 },
    "Nador": { lat: 35.1667, lng: -2.9333 },
    "Mohammedia": { lat: 33.6822, lng: -7.3881 },
    "Salé": { lat: 34.0389, lng: -6.8166 }
}

const mapContainerStyle = {
    width: '100%',
    height: '100%'
};

const center = {
    lat: 31.7917,
    lng: -7.0926
};

export default function MarketMap({ books, isBlurred, isLoggedIn }: { books: any[], isBlurred?: boolean, isLoggedIn?: boolean }) {
    const tc = useTranslations('Community.Market')
    const locale = useLocale()
    const isRtl = locale === 'ar'
    const openAuthModal = useUIStore((state) => state.openAuthModal)

    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
    })

    const [selectedCity, setSelectedCity] = React.useState<string | null>(null)
    const [mapCenter, setMapCenter] = React.useState(center)
    const [mapZoom, setMapZoom] = React.useState(6)
    
    const mapRef = React.useRef<google.maps.Map | null>(null)

    const onMapLoad = React.useCallback((map: google.maps.Map) => {
        mapRef.current = map
    }, [])

    const onMapUnmount = React.useCallback(() => {
        mapRef.current = null
    }, [])

    React.useEffect(() => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition((position) => {
                const newPos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                }
                
                if (mapRef.current) {
                    // Animation : On se déplace d'abord, puis on zoome
                    mapRef.current.panTo(newPos)
                    setTimeout(() => {
                        if (mapRef.current) {
                            mapRef.current.setZoom(12)
                        }
                    }, 800)
                } else {
                    setMapCenter(newPos)
                    setMapZoom(12)
                }
            }, (error) => {
                console.error("Erreur de géolocalisation:", error)
            })
        }
    }, [])

    const cityData = useMemo(() => {
        const counts: Record<string, number> = {}
        const bookLists: Record<string, any[]> = {}
        
        books.forEach(book => {
            let city = book.owner?.city || 'Casablanca'
            const matchingCity = Object.keys(MOROCCO_CITIES).find(c => city.toLowerCase().includes(c.toLowerCase()))
            if (matchingCity) {
                city = matchingCity
            } else {
                city = 'Casablanca'
            }

            counts[city] = (counts[city] || 0) + 1
            if (!bookLists[city]) bookLists[city] = []
            bookLists[city].push(book)
        })

        return Object.entries(counts).map(([cityName, count]) => ({
            name: cityName,
            count,
            position: MOROCCO_CITIES[cityName],
            books: bookLists[cityName]
        }))
    }, [books])

    if (!isLoaded) {
        return (
            <div className="w-full h-[360px] sm:h-[460px] md:h-[540px] min-h-[320px] bg-gray-100 animate-pulse flex items-center justify-center text-gray-400 font-bold text-sm">
                Chargement de la carte...
            </div>
        )
    }

    return (
        <div className="w-full h-[360px] sm:h-[460px] md:h-[540px] min-h-[320px] relative z-0">
            <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={mapCenter}
                zoom={mapZoom}
                onLoad={onMapLoad}
                onUnmount={onMapUnmount}
                options={{
                    disableDefaultUI: false,
                    zoomControl: true,
                    streetViewControl: false,
                    mapTypeControl: false,
                    fullscreenControl: true,
                    gestureHandling: 'cooperative'
                }}
            >
                {cityData.map((city, i) => (
                    city.position && (
                        <Marker
                            key={i}
                            position={city.position}
                            onClick={() => setSelectedCity(city.name)}
                            icon={
                                typeof window !== 'undefined' && window.google ? {
                                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                                        <svg width="40" height="40" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" fill="#10b981" />
                                            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" fill="#10b981" />
                                            <text x="12" y="15" font-family="Arial" font-size="8" font-weight="bold" fill="white" text-anchor="middle">${city.count}</text>
                                        </svg>
                                    `),
                                    scaledSize: new window.google.maps.Size(40, 40),
                                    anchor: new window.google.maps.Point(20, 20)
                                } : undefined
                            }
                        />
                    )
                ))}

                {selectedCity && (() => {
                    const selectedCityData = cityData.find(c => c.name === selectedCity);
                    if (!selectedCityData) return null;
                    return (
                        <InfoWindow
                            position={MOROCCO_CITIES[selectedCity]}
                            onCloseClick={() => setSelectedCity(null)}
                        >
                            <div className="p-2 max-w-[220px]">
                                <h3 className="font-black text-black uppercase tracking-widest text-xs mb-2 flex items-center gap-2">
                                    <MapPin className="w-3 h-3 text-emerald-600" />
                                    {selectedCity}
                                </h3>
                                <p className="text-gray-600 text-xs mb-3 font-medium">
                                    {selectedCityData.count} {tc('In')} {selectedCity}.
                                </p>
                                
                                {selectedCityData.books && selectedCityData.books.length > 0 && (
                                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-200">
                                        {selectedCityData.books.slice(0, 10).map((book, idx) => {
                                            const primaryImage = getPrimaryImage(book.image);
                                            return primaryImage ? (
                                                <div key={book.id || idx} className="w-12 h-16 shrink-0 rounded overflow-hidden shadow-sm border border-gray-100 relative bg-gray-50">
                                                    <img 
                                                        src={normalizeImage(primaryImage)} 
                                                        alt={book.title || 'Book cover'}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                            ) : (
                                                <div key={book.id || idx} className="w-12 h-16 shrink-0 rounded shadow-sm border border-gray-100 bg-gray-100 flex items-center justify-center">
                                                    <BookOpen className="w-4 h-4 text-gray-300" />
                                                </div>
                                            );
                                        })}
                                        {selectedCityData.books.length > 10 && (
                                            <div className="w-12 h-16 shrink-0 rounded shadow-sm border border-gray-100 bg-gray-50 flex flex-col items-center justify-center text-xs font-bold text-gray-500">
                                                +{selectedCityData.books.length - 10}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </InfoWindow>
                    );
                })()}
            </GoogleMap>
            
            {isBlurred && (
                <div className="absolute inset-0 z-20 backdrop-blur-md bg-black/60 flex flex-col items-center justify-center p-3 sm:p-6 text-center animate-in fade-in duration-500 overflow-y-auto" dir={isRtl ? 'rtl' : 'ltr'}>
                    <div className="bg-white rounded-3xl sm:rounded-[2rem] p-5 sm:p-8 max-w-md w-full shadow-2xl border border-gray-100 flex flex-col items-center relative overflow-hidden my-auto">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-emerald-600"></div>
                        <div className="w-10 h-10 sm:w-16 sm:h-16 bg-emerald-50 text-emerald-500 rounded-xl sm:rounded-[1.5rem] flex items-center justify-center mb-3 sm:mb-6 shadow-inner border border-emerald-100/50">
                            <MapPin className="w-5 h-5 sm:w-8 sm:h-8" />
                        </div>
                        <h2 className="text-lg sm:text-2xl font-black text-black uppercase tracking-tight mb-2 sm:mb-3">
                            {tc('UnlockMap')}
                        </h2>
                        <p className="text-xs sm:text-sm md:text-base font-bold text-gray-500 uppercase tracking-wider mb-4 sm:mb-8 leading-relaxed">
                            {tc('UnlockDesc')}
                        </p>
                        
                        <div className="flex flex-col gap-2.5 sm:gap-4 w-full">
                            {isLoggedIn ? (
                                <Link href="/books" className="w-full py-3.5 sm:py-5 bg-black text-white rounded-xl sm:rounded-2xl font-black text-xs sm:text-base uppercase tracking-wider shadow-xl shadow-black/20 hover:bg-gray-900 transition-all flex items-center justify-center gap-2 hover:-translate-y-1">
                                    <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                                    {tc('OrderCTA')}
                                </Link>
                            ) : (
                                <button 
                                    onClick={(e) => {
                                        e.preventDefault();
                                        openAuthModal();
                                    }} 
                                    className="w-full py-3.5 sm:py-5 bg-black text-white rounded-xl sm:rounded-2xl font-black text-xs sm:text-base uppercase tracking-wider shadow-xl shadow-black/20 hover:bg-gray-900 transition-all flex items-center justify-center gap-2 hover:-translate-y-1"
                                >
                                    <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                                    {tc('SignUpCTA')}
                                </button>
                            )}
                            <a href="https://wa.me/212769686055" target="_blank" rel="noreferrer" className="w-full py-3.5 sm:py-5 bg-[#25D366] text-white rounded-xl sm:rounded-2xl font-black text-xs sm:text-base uppercase tracking-wider shadow-xl shadow-[#25D366]/20 hover:bg-[#20bd5a] transition-all flex items-center justify-center gap-2 hover:-translate-y-1">
                                <svg className="w-4 h-4 sm:w-5 sm:h-5 fill-current shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
                                {tc('WhatsAppSupport')}
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
