'use client'

import { useState } from 'react'
import { X, Megaphone, Loader2, Target, CreditCard, Type, MapPin } from 'lucide-react'
import { launchFacebookAd } from '@/lib/actions/facebook-ads'
import Image from 'next/image'

interface Asset {
    name: string
    url: string
    type: string
    bookId?: string
    packId?: string
}

interface LaunchFacebookAdModalProps {
    isOpen: boolean
    onClose: () => void
    asset: Asset | null
}

const MOROCCAN_CITIES = [
    'Casablanca', 'Rabat', 'Marrakech', 'Fès', 'Tanger', 'Agadir', 
    'Meknès', 'Oujda', 'Kenitra', 'Tétouan', 'Safi', 'Mohammedia'
]

export default function LaunchFacebookAdModal({ isOpen, onClose, asset }: LaunchFacebookAdModalProps) {
    const [loading, setLoading] = useState(false)
    const [name, setName] = useState('')
    const [dailyBudget, setDailyBudget] = useState(50)
    const [primaryText, setPrimaryText] = useState('Découvrez notre nouveau livre ! 📚 Livraison à domicile partout au Maroc (Paiement à la livraison).')
    const [headline, setHeadline] = useState('Commandez maintenant')
    const [selectedCities, setSelectedCities] = useState<string[]>([])
    const [objective, setObjective] = useState('OUTCOME_TRAFFIC')

    if (!isOpen || !asset) return null

    const isPack = asset.type === 'PACK'
    const linkUrl = `https://riwaya.store/fr/${isPack ? 'packs' : 'books'}/${isPack ? asset.packId : asset.bookId}`

    const toggleCity = (city: string) => {
        setSelectedCities(prev => 
            prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city]
        )
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const res = await launchFacebookAd({
                name: name || `Promo ${asset.type}`,
                dailyBudgetMad: dailyBudget,
                primaryText,
                headline,
                linkUrl,
                imageUrl: asset.url,
                objective,
                targeting: {
                    cities: selectedCities.map(name => ({ name }))
                }
            })

            if (res.success) {
                alert(res.message)
                onClose()
            } else {
                alert(res.error || "Erreur lors du lancement de la pub.")
            }
        } catch (error) {
            alert("Erreur réseau")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
                
                {/* Header */}
                <div className="sticky top-0 bg-white/80 backdrop-blur-md z-10 border-b border-gray-100 p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                            <Megaphone className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900 tracking-tight">Lancer une Publicité FB</h2>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Via API Graph Marketing</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Aperçu du visuel */}
                    <div className="flex gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <div className="relative w-24 h-24 rounded-xl overflow-hidden shadow-sm shrink-0">
                            <Image src={asset.url} alt="Aperçu" fill className="object-cover" />
                        </div>
                        <div className="text-sm">
                            <p className="font-bold text-gray-900 mb-1">Visuel sélectionné</p>
                            <p className="text-xs text-gray-500 break-all">{asset.url.split('/').pop()}</p>
                            <p className="text-xs text-gray-500 mt-2 font-mono bg-white px-2 py-1 rounded inline-block border border-gray-200">
                                Lien: {linkUrl}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Infos base */}
                        <div className="space-y-4">
                            <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 ml-1">
                                    <Target className="w-3.5 h-3.5" /> Nom de la Campagne
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ex: Promo Été 2024"
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm font-medium"
                                />
                            </div>
                            <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 ml-1">
                                    <CreditCard className="w-3.5 h-3.5" /> Budget Quotidien (MAD)
                                </label>
                                <input
                                    type="number"
                                    min="20"
                                    value={dailyBudget}
                                    onChange={(e) => setDailyBudget(Number(e.target.value))}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm font-medium font-mono"
                                />
                            </div>
                            <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 ml-1">
                                    <Target className="w-3.5 h-3.5" /> Objectif de Campagne
                                </label>
                                <select
                                    value={objective}
                                    onChange={(e) => setObjective(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm font-medium"
                                >
                                    <option value="OUTCOME_TRAFFIC">Trafic (Clics sur le lien)</option>
                                    <option value="OUTCOME_SALES">Ventes (Conversions)</option>
                                    <option value="OUTCOME_ENGAGEMENT">Engagement</option>
                                </select>
                            </div>
                            <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 ml-1">
                                    <Type className="w-3.5 h-3.5" /> Titre (Headline)
                                </label>
                                <input
                                    type="text"
                                    value={headline}
                                    onChange={(e) => setHeadline(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm font-medium"
                                />
                            </div>
                        </div>

                        {/* Text & Targeting */}
                        <div className="space-y-4">
                            <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 ml-1">
                                    <Type className="w-3.5 h-3.5" /> Texte Principal
                                </label>
                                <textarea
                                    rows={4}
                                    value={primaryText}
                                    onChange={(e) => setPrimaryText(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm font-medium resize-none"
                                />
                            </div>
                            
                            <div>
                                <label className="flex items-center justify-between text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 ml-1">
                                    <span className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5" /> Villes Cibles</span>
                                    {selectedCities.length === 0 && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Tout le Maroc</span>}
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {MOROCCAN_CITIES.map(city => (
                                        <button
                                            key={city}
                                            type="button"
                                            onClick={() => toggleCity(city)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedCities.includes(city) ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                        >
                                            {city}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 mt-6 border-t border-gray-100 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-xl shadow-blue-500/20 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Megaphone className="w-5 h-5" />}
                            Lancer la Campagne
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
