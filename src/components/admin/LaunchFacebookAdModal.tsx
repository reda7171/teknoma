'use client'

import { useState, useMemo } from 'react'
import { X, Megaphone, Loader2, Target, CreditCard, Type, MapPin, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { launchFacebookAd } from '@/lib/actions/facebook-ads'
import { generateGoogleAdsCampaignWithGemini } from '@/lib/actions/google-ads'
import { appendUtmParams } from '@/lib/utils/utm'
import { STORE_POLICY } from '@/lib/constants/store-policy'
import MetaAdPreviewCard from './MetaAdPreviewCard'
import MetaApiErrorBanner, { MetaApiErrorState } from './MetaApiErrorBanner'

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
    'Meknès', 'Oujda', 'Kenitra', 'Tétouan', 'Safi', 'Mohammedia',
]

export default function LaunchFacebookAdModal({ isOpen, onClose, asset }: LaunchFacebookAdModalProps) {
    const [loading, setLoading] = useState(false)
    const [generatingAi, setGeneratingAi] = useState(false)
    const [metaApiError, setMetaApiError] = useState<MetaApiErrorState | null>(null)
    const [name, setName] = useState('')
    const [dailyBudget, setDailyBudget] = useState(50)
    const [primaryText, setPrimaryText] = useState(
        `Découvrez ce livre sur Riwaya ! Livraison ${STORE_POLICY.deliveryMajorCitiesMinHours}-${STORE_POLICY.deliveryMajorCitiesMaxHours}h au Maroc (${STORE_POLICY.shippingFeeMorocco} MAD, gratuit dès ${STORE_POLICY.freeShippingThreshold} MAD), paiement à la livraison.`
    )
    const [headline, setHeadline] = useState('Commandez maintenant (COD)')
    const [selectedCities, setSelectedCities] = useState<string[]>([])
    const [objective, setObjective] = useState('OUTCOME_TRAFFIC')

    const isPack = asset?.type === 'PACK'
    const baseLinkUrl = asset
        ? `https://riwaya.store/fr/${isPack ? 'packs' : 'books'}/${isPack ? asset.packId || '' : asset.bookId || ''}`
        : 'https://riwaya.store/fr/books'

    const trackedLinkUrl = useMemo(
        () =>
            appendUtmParams(baseLinkUrl, {
                source: 'facebook',
                medium: 'paid_social',
                campaign: name || `promo-${asset?.type || 'riwaya'}`,
            }),
        [baseLinkUrl, name, asset?.type]
    )

    if (!isOpen || !asset) return null

    const toggleCity = (city: string) => {
        setSelectedCities((prev) =>
            prev.includes(city) ? prev.filter((c) => c !== city) : [...prev, city]
        )
    }

    const handleSuggestAiCopy = async () => {
        setGeneratingAi(true)
        try {
            const res = await generateGoogleAdsCampaignWithGemini({
                campaignType: 'META_ADS',
                customFocus: `Publicité Meta ciblée pour "${asset.name}" (${asset.type})`,
                dailyBudgetMad: dailyBudget,
            })
            if (res.success && res.data?.metaCreative) {
                setPrimaryText(res.data.metaCreative.primaryText)
                setHeadline(res.data.metaCreative.headline)
                if (!name) setName(asset.name)
                if (res.data.metaCreative.targetCities.length > 0) {
                    setSelectedCities(
                        res.data.metaCreative.targetCities.filter((c) => MOROCCAN_CITIES.includes(c))
                    )
                }
                toast.success('Texte Meta Ads généré par Gemini !')
            } else {
                toast.error(res.error || 'Impossible de générer le texte Meta Ads.')
            }
        } catch {
            toast.error('Erreur réseau lors de la suggestion Gemini.')
        } finally {
            setGeneratingAi(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMetaApiError(null)
        try {
            const res = await launchFacebookAd({
                name: name || `Promo ${asset.type}`,
                dailyBudgetMad: dailyBudget,
                primaryText,
                headline,
                linkUrl: trackedLinkUrl,
                imageUrl: asset.url,
                objective,
                targeting: {
                    cities: selectedCities.map((c) => ({ name: c })),
                },
            })

            if (res.success) {
                toast.success(res.message)
                onClose()
            } else {
                const errMsg = res.error || 'Erreur lors du lancement de la pub Meta.'
                setMetaApiError({
                    error: errMsg,
                    errorCode: res.errorCode,
                    configPath: res.configPath,
                })
                toast.error(errMsg)
            }
        } catch {
            toast.error('Erreur réseau lors de l\'appel Meta Graph API.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95">
                {/* Header */}
                <div className="sticky top-0 bg-white/95 backdrop-blur-md z-10 border-b border-gray-100 p-6 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                            <Megaphone className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900 tracking-tight">Lancer une Publicité Meta</h2>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                                API Graph Marketing + UTM Automatique
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            disabled={generatingAi}
                            onClick={handleSuggestAiCopy}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-black transition-all disabled:opacity-50"
                        >
                            {generatingAi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                            <span>Suggérer via Gemini</span>
                        </button>
                        <button
                            aria-label="Fermer"
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-7 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                    <Target className="w-3.5 h-3.5" /> Nom de la Campagne
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder={`Ex: ${asset.name}`}
                                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black"
                                />
                            </div>
                            <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                    <CreditCard className="w-3.5 h-3.5" /> Budget Quotidien (MAD)
                                </label>
                                <input
                                    type="number"
                                    min="20"
                                    value={dailyBudget}
                                    onChange={(e) => setDailyBudget(Number(e.target.value))}
                                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold font-mono focus:outline-none focus:ring-2 focus:ring-black"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                    <Target className="w-3.5 h-3.5" /> Objectif
                                </label>
                                <select
                                    aria-label="Objectif campagne"
                                    value={objective}
                                    onChange={(e) => setObjective(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black"
                                >
                                    <option value="OUTCOME_TRAFFIC">Trafic (Clics UTM)</option>
                                    <option value="OUTCOME_SALES">Ventes (Pixel PURCHASE)</option>
                                    <option value="OUTCOME_ENGAGEMENT">Engagement</option>
                                </select>
                            </div>
                            <div>
                                <label className="flex items-center justify-between text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                    <span className="flex items-center gap-1.5"><Type className="w-3.5 h-3.5" /> Titre</span>
                                    <span className={`font-mono text-[10px] ${headline.length > 40 ? 'text-red-600' : 'text-gray-400'}`}>
                                        {headline.length}/40
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    value={headline}
                                    onChange={(e) => setHeadline(e.target.value)}
                                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-black"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="flex items-center justify-between text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                <span className="flex items-center gap-1.5"><Type className="w-3.5 h-3.5" /> Texte Principal</span>
                                <span className="font-mono text-[10px] text-gray-400">{primaryText.length} car.</span>
                            </label>
                            <textarea
                                rows={3}
                                value={primaryText}
                                onChange={(e) => setPrimaryText(e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium resize-none focus:outline-none focus:ring-2 focus:ring-black"
                            />
                        </div>

                        <div>
                            <label className="flex items-center justify-between text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                                <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Villes Cibles (résolues via Meta Geo API)</span>
                                {selectedCities.length === 0 && (
                                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Tout le Maroc</span>
                                )}
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                                {MOROCCAN_CITIES.map((city) => (
                                    <button
                                        key={city}
                                        type="button"
                                        onClick={() => toggleCity(city)}
                                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                                            selectedCities.includes(city)
                                                ? 'bg-black text-white'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        {city}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <MetaApiErrorBanner banner={metaApiError} onNavigate={onClose} />

                        <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />}
                                Lancer (PAUSED)
                            </button>
                        </div>
                    </div>

                    {/* Aperçu direct Meta Feed */}
                    <div className="lg:col-span-5 space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">
                            Aperçu Feed Facebook / Instagram
                        </p>
                        <MetaAdPreviewCard
                            headline={headline}
                            primaryText={primaryText}
                            imageUrl={asset.url}
                            linkUrl={trackedLinkUrl}
                        />
                    </div>
                </form>
            </div>
        </div>
    )
}
