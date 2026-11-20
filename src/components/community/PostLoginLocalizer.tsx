'use client'

import { useState, useEffect } from 'react'
import { MapPin, Loader2, X, Navigation } from 'lucide-react'
import { updateUserCity } from '@/lib/actions/community-user'

// Liste des villes marocaines principales
const MOROCCAN_CITIES = [
    'Casablanca', 'Rabat', 'Marrakech', 'Fès', 'Tanger', 'Agadir',
    'Meknès', 'Oujda', 'Kénitra', 'Tétouan', 'Salé', 'Nador',
    'Mohammedia', 'El Jadida', 'Béni Mellal', 'Khémisset',
    'Settat', 'Taza', 'Larache', 'Khouribga', 'Berkane', 'Safi',
    'Errachidia', 'Guelmim', 'Ifrane', 'Essaouira', 'Tiznit',
    'Ouarzazate', 'Al Hoceima', 'Dakhla', 'Laâyoune'
]

interface PostLoginLocalizerProps {
    hasCity: boolean
    isNewRegistration: boolean
}

export default function PostLoginLocalizer({ hasCity, isNewRegistration }: PostLoginLocalizerProps) {
    const [show, setShow] = useState(false)
    const [loading, setLoading] = useState(false)
    const [manualCity, setManualCity] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)

    useEffect(() => {
        // Afficher le popup uniquement si pas de ville ET nouveau login/inscription
        if (!hasCity && isNewRegistration) {
            const timer = setTimeout(() => setShow(true), 800)
            return () => clearTimeout(timer)
        }
    }, [hasCity, isNewRegistration])

    if (!show || success) return null

    // Géolocalisation automatique via navigateur
    const handleAutoLocalize = () => {
        if (!navigator.geolocation) {
            setError("La géolocalisation n'est pas supportée par votre navigateur.")
            return
        }

        setLoading(true)
        setError(null)

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords
                    const res = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
                        { headers: { 'Accept-Language': 'fr' } }
                    )

                    if (!res.ok) throw new Error('Erreur API Géolocalisation')

                    const data = await res.json()
                    const detectedCity = data.address.city || data.address.town || data.address.village || data.address.county || data.address.state

                    if (!detectedCity) throw new Error('Ville non trouvée')

                    const result = await updateUserCity(detectedCity)
                    if (!result.success) throw new Error(result.error)

                    setSuccess(true)
                    setTimeout(() => setShow(false), 1500)
                } catch (err: any) {
                    setError(err.message || 'Erreur lors de la localisation')
                } finally {
                    setLoading(false)
                }
            },
            () => {
                setError('Permission de localisation refusée.')
                setLoading(false)
            },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }
        )
    }

    // Sélection manuelle
    const handleManualSelect = async (city: string) => {
        if (!city) return
        setLoading(true)
        setError(null)

        try {
            const result = await updateUserCity(city)
            if (!result.success) throw new Error(result.error)

            setSuccess(true)
            setTimeout(() => setShow(false), 1500)
        } catch (err: any) {
            setError(err.message || 'Erreur lors de la mise à jour')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full mx-4 p-8 relative animate-in slide-in-from-bottom-4 duration-500">
                {/* Bouton fermer */}
                <button
                    onClick={() => setShow(false)}
                    className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                    aria-label="Fermer"
                >
                    <X className="w-4 h-4" />
                </button>

                {/* Icone + titre */}
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-4">
                        <MapPin className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-black tracking-tight">
                        Où êtes-vous ?
                    </h3>
                    <p className="text-gray-500 text-sm mt-2">
                        Partagez votre ville pour trouver des lecteurs près de chez vous
                    </p>
                </div>

                {/* Bouton localisation automatique */}
                <button
                    onClick={handleAutoLocalize}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 py-4 bg-black text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-800 transition-all disabled:opacity-50 mb-4"
                >
                    {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <Navigation className="w-5 h-5" />
                    )}
                    Me localiser automatiquement
                </button>

                {/* Séparateur */}
                <div className="flex items-center gap-4 my-4">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">ou choisir</span>
                    <div className="flex-1 h-px bg-gray-200" />
                </div>

                {/* Sélection manuelle */}
                <div className="relative">
                    <select
                        value={manualCity}
                        onChange={(e) => {
                            setManualCity(e.target.value)
                            if (e.target.value) handleManualSelect(e.target.value)
                        }}
                        disabled={loading}
                        className="w-full appearance-none bg-gray-50 border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-sm font-bold focus:border-black focus:ring-0 transition-colors cursor-pointer disabled:opacity-50"
                    >
                        <option value="">Sélectionnez votre ville...</option>
                        {MOROCCAN_CITIES.map(city => (
                            <option key={city} value={city}>{city}</option>
                        ))}
                    </select>
                    <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>

                {/* Erreur */}
                {error && (
                    <p className="mt-3 text-center text-xs font-bold text-red-500 bg-red-50 py-2 px-4 rounded-xl">
                        {error}
                    </p>
                )}

                {/* Succes */}
                {success && (
                    <p className="mt-3 text-center text-xs font-bold text-green-600 bg-green-50 py-2 px-4 rounded-xl">
                        Localisation enregistrée !
                    </p>
                )}

                {/* Skip */}
                <button
                    onClick={() => setShow(false)}
                    className="w-full mt-4 text-center text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors py-2"
                >
                    Passer cette étape
                </button>
            </div>
        </div>
    )
}
