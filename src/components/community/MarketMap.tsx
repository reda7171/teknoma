'use client'

import React, { useMemo } from 'react'
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api'
import { MapPin, BookOpen } from 'lucide-react'

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

export default function MarketMap({ books }: { books: any[] }) {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
    })

    const [selectedCity, setSelectedCity] = React.useState<string | null>(null)

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
            <div className="w-full h-[60vh] min-h-[400px] mb-12 bg-gray-100 animate-pulse rounded-3xl flex items-center justify-center text-gray-400">
                Chargement de la carte...
            </div>
        )
    }

    return (
        <div className="w-full h-[60vh] min-h-[400px] relative z-0">
            <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={center}
                zoom={6}
                options={{
                    disableDefaultUI: false,
                    zoomControl: true,
                    streetViewControl: false,
                    mapTypeControl: false,
                    fullscreenControl: true,
                    styles: [
                        { "elementType": "geometry", "stylers": [{ "color": "#111111" }] },
                        { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
                        { "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
                        { "elementType": "labels.text.stroke", "stylers": [{ "color": "#111111" }] },
                        { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "color": "#757575" }] },
                        { "featureType": "administrative.country", "elementType": "labels.text.fill", "stylers": [{ "color": "#9e9e9e" }] },
                        { "featureType": "poi", "stylers": [{ "visibility": "off" }] },
                        { "featureType": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#222222" }] },
                        { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#8a8a8a" }] },
                        { "featureType": "road.arterial", "elementType": "geometry", "stylers": [{ "color": "#373737" }] },
                        { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#3c3c3c" }] },
                        { "featureType": "transit", "stylers": [{ "visibility": "off" }] },
                        { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#000000" }] },
                        { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#3d3d3d" }] }
                    ]
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
                                        <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                                            <circle cx="20" cy="20" r="16" fill="#10b981" fill-opacity="0.3"/>
                                            <circle cx="20" cy="20" r="12" fill="#10b981"/>
                                            <text x="20" y="24" font-family="Arial" font-size="12" font-weight="bold" fill="white" text-anchor="middle">${city.count}</text>
                                        </svg>
                                    `),
                                    scaledSize: new window.google.maps.Size(40, 40),
                                    anchor: new window.google.maps.Point(20, 20)
                                } : undefined
                            }
                        />
                    )
                ))}

                {selectedCity && (
                    <InfoWindow
                        position={MOROCCO_CITIES[selectedCity]}
                        onCloseClick={() => setSelectedCity(null)}
                    >
                        <div className="p-2 max-w-[200px]">
                            <h3 className="font-black text-black uppercase tracking-widest text-xs mb-2 flex items-center gap-2">
                                <MapPin className="w-3 h-3" />
                                {selectedCity}
                            </h3>
                            <p className="text-gray-600 text-xs mb-3 font-medium">
                                {cityData.find(c => c.name === selectedCity)?.count} livres disponibles à l'échange dans cette ville.
                            </p>
                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                Parcourez la liste ci-dessous pour voir les détails.
                            </div>
                        </div>
                    </InfoWindow>
                )}
            </GoogleMap>
            
            <div className="absolute inset-0 pointer-events-none">
                <div className="max-w-7xl mx-auto h-full relative px-4 sm:px-6 lg:px-8">
                    <div className="absolute top-6 left-4 sm:left-6 lg:left-8 z-10 bg-white/90 backdrop-blur-md px-6 py-3 rounded-2xl shadow-xl border border-gray-100 flex items-center gap-3">
                        <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white">
                            <BookOpen className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                                Réseau Riwaya
                            </div>
                            <div className="text-sm font-black text-black leading-none mt-1">
                                Échange de livres
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
