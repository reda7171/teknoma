'use client'

import { useState } from 'react'
import { MapPin, Loader2 } from 'lucide-react'
import { updateUserCity } from '@/lib/actions/community-user'

export default function CityLocalizer({ currentCity }: { currentCity: string }) {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [city, setCity] = useState(currentCity)

    const handleLocalize = () => {
        if (!navigator.geolocation) {
            setError("La géolocalisation n'est pas supportée.")
            return
        }

        setLoading(true)
        setError(null)

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`, {
                        headers: {
                            'Accept-Language': 'fr'
                        }
                    })
                    
                    if (!res.ok) throw new Error('Erreur API Géolocalisation')
                    
                    const data = await res.json()
                    
                    const newCity = data.address.city || data.address.town || data.address.village || data.address.county || data.address.state

                    if (!newCity) {
                        throw new Error("Ville non trouvée")
                    }

                    const result = await updateUserCity(newCity)
                    
                    if (!result.success) {
                        throw new Error(result.error)
                    }

                    setCity(result.city)

                } catch (err: any) {
                    console.error("Localizer Error:", err)
                    setError(err.message || "Erreur lors de la localisation")
                    setTimeout(() => setError(null), 3000)
                } finally {
                    setLoading(false)
                }
            },
            (err) => {
                console.error("Geolocation Error:", err)
                setError("Permission refusée.")
                setTimeout(() => setError(null), 3000)
                setLoading(false)
            },
            {
                enableHighAccuracy: false,
                timeout: 10000,
                maximumAge: 0
            }
        )
    }

    return (
        <button 
            onClick={handleLocalize}
            disabled={loading}
            title="Cliquez pour me localiser"
            className="flex items-center gap-1 bg-gray-50 px-3 py-1 rounded-full hover:bg-gray-200 transition-colors group relative cursor-pointer"
        >
            {loading ? (
                <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
            ) : (
                <MapPin className="w-3 h-3 text-gray-500 group-hover:text-black transition-colors" />
            )}
            
            <span className="truncate max-w-[150px]">{city}</span>
            
            {error && (
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-red-100 text-red-600 text-[10px] px-2 py-1 rounded shadow-sm z-10">
                    {error}
                </span>
            )}
        </button>
    )
}
