'use client'

import { useState } from 'react'
import { Send, CheckCircle2, X, Copy, Search, Clock, Loader2, Store } from 'lucide-react'
import { createSellerRequest, getSellerRequestStatus } from '@/lib/actions/seller-requests'
import { useTranslations } from 'next-intl'

export default function BecomeSellerForm() {
    const [mode, setMode] = useState<'FORM' | 'TRACK'>('FORM')
    const [showAlert, setShowAlert] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errorMsg, setErrorMsg] = useState('')
    const [trackingCode, setTrackingCode] = useState('')
    const [copied, setCopied] = useState(false)

    // État de consultation du dossier
    const [trackQuery, setTrackQuery] = useState('')
    const [isSearching, setIsSearching] = useState(false)
    const [trackResult, setTrackResult] = useState<any>(null)
    const [trackError, setTrackError] = useState('')

    const t = useTranslations('DevenirVendeurForm')

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsSubmitting(true)
        setErrorMsg('')
        const form = e.currentTarget
        const formData = new FormData(form)
        
        const data = {
            storeName: formData.get('storeName') as string,
            managerName: formData.get('managerName') as string,
            email: formData.get('email') as string,
            phone: formData.get('phone') as string,
            city: formData.get('city') as string,
            stockSize: formData.get('stockSize') as string,
            honeypot: (formData.get('website') as string) || undefined,
        }

        const res = await createSellerRequest(data)

        setIsSubmitting(false)
        if (res.success) {
            setTrackingCode(res.trackingCode || '')
            setShowAlert(true)
            form.reset()
        } else {
            setErrorMsg(res.error || t('ErrorMsg'))
        }
    }

    const handleSearchTrack = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!trackQuery.trim()) return
        setIsSearching(true)
        setTrackError('')
        setTrackResult(null)

        try {
            const res = await getSellerRequestStatus(trackQuery)
            if (res.success && res.data) {
                setTrackResult(res.data)
            } else {
                setTrackError(res.error || t('NotFoundApplication'))
            }
        } catch {
            setTrackError(t('NotFoundApplication'))
        } finally {
            setIsSearching(false)
        }
    }

    return (
        <div className="space-y-8">
            {/* Sélecteur de mode Formulaire / Suivi */}
            <div className="flex bg-gray-100 p-1.5 rounded-2xl max-w-md mx-auto">
                <button
                    type="button"
                    onClick={() => { setMode('FORM'); setErrorMsg('') }}
                    className={`flex-1 py-3 px-4 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all text-center ${
                        mode === 'FORM'
                            ? 'bg-black text-white shadow-md'
                            : 'text-gray-500 hover:text-black'
                    }`}
                >
                    {t('FormTabTitle')}
                </button>
                <button
                    type="button"
                    onClick={() => { setMode('TRACK'); setTrackError('') }}
                    className={`flex-1 py-3 px-4 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all text-center ${
                        mode === 'TRACK'
                            ? 'bg-black text-white shadow-md'
                            : 'text-gray-500 hover:text-black'
                    }`}
                >
                    {t('TrackTabTitle')}
                </button>
            </div>

            {mode === 'FORM' ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Honeypot anti-spam invisible */}
                    <input
                        type="text"
                        name="website"
                        tabIndex={-1}
                        autoComplete="off"
                        className="hidden opacity-0 h-0 w-0 absolute pointer-events-none"
                        aria-hidden="true"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">{t('StoreNameLabel')}</label>
                            <input
                                type="text"
                                name="storeName"
                                required
                                className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:outline-none focus:border-black focus:bg-white transition-all font-medium placeholder-gray-400"
                                placeholder={t('StoreNamePlaceholder')}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">{t('ManagerNameLabel')}</label>
                            <input
                                type="text"
                                name="managerName"
                                required
                                className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:outline-none focus:border-black focus:bg-white transition-all font-medium placeholder-gray-400"
                                placeholder={t('ManagerNamePlaceholder')}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">{t('EmailLabel')}</label>
                            <input
                                type="email"
                                name="email"
                                required
                                className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:outline-none focus:border-black focus:bg-white transition-all font-medium placeholder-gray-400"
                                placeholder="contact@boutique.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">{t('PhoneLabel')}</label>
                            <input
                                type="tel"
                                name="phone"
                                required
                                className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:outline-none focus:border-black focus:bg-white transition-all font-medium placeholder-gray-400"
                                placeholder="+212 6..."
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">{t('CityLabel')}</label>
                            <input
                                type="text"
                                name="city"
                                required
                                className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:outline-none focus:border-black focus:bg-white transition-all font-medium placeholder-gray-400"
                                placeholder={t('CityPlaceholder')}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">{t('StockSizeLabel')}</label>
                            <select
                                aria-label="Sélection stockSize"
                                name="stockSize"
                                required
                                className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:outline-none focus:border-black focus:bg-white transition-all font-medium text-gray-700 appearance-none bg-no-repeat bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0iIzQ3NTU2OSI+PHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBkPSJNMTAgMjhMMTAgMTJsLTYgNmwtNi02eiIgY2xpcC1ydWxlPSJldmVub2RkIi8+PC9zdmc+')] bg-[length:20px_20px] bg-[position:right_1rem_center]"
                            >
                                <option value="">{t('SelectPlaceholder')}</option>
                                <option value="1-50">{t('Stock1')}</option>
                                <option value="50-200">{t('Stock2')}</option>
                                <option value="200-1000">{t('Stock3')}</option>
                                <option value="1000+">{t('Stock4')}</option>
                            </select>
                        </div>
                    </div>

                    <div className="pt-4">
                        {errorMsg && <p className="text-red-500 font-bold mb-4">{errorMsg}</p>}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`w-full px-8 py-5 bg-black text-white font-black text-sm uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl ${isSubmitting ? 'opacity-70 cursor-wait' : 'hover:bg-gray-800 hover:shadow-black/20 hover:-translate-y-1'}`}
                        >
                            <span>{isSubmitting ? t('Submitting') : t('SubmitBtn')}</span>
                            {!isSubmitting && <Send className="w-5 h-5" />}
                        </button>
                        <p className="text-center text-xs text-gray-400 font-bold mt-4">
                            {t('Disclaimer')}
                        </p>
                    </div>
                </form>
            ) : (
                /* Mode consultation du statut du dossier */
                <div className="space-y-6">
                    <form onSubmit={handleSearchTrack} className="flex flex-col sm:flex-row gap-3">
                        <input
                            type="text"
                            value={trackQuery}
                            onChange={(e) => setTrackQuery(e.target.value)}
                            placeholder={t('TrackPlaceholder')}
                            required
                            className="flex-1 px-5 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:outline-none focus:border-black focus:bg-white transition-all font-medium placeholder-gray-400 text-sm"
                        />
                        <button
                            type="submit"
                            disabled={isSearching}
                            className="px-6 py-4 bg-black text-white font-black text-xs sm:text-sm uppercase tracking-widest rounded-2xl hover:bg-gray-800 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-60"
                        >
                            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                            <span>{t('TrackBtn')}</span>
                        </button>
                    </form>

                    {trackError && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs sm:text-sm font-bold text-center">
                            {trackError}
                        </div>
                    )}

                    {trackResult && (
                        <div className="bg-gray-50 border border-gray-200 rounded-3xl p-6 sm:p-8 space-y-4 animate-in fade-in duration-300">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 pb-4">
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">
                                        {t('TrackingCodeLabel')}
                                    </span>
                                    <span className="font-mono font-black text-base text-black">
                                        {trackResult.trackingCode}
                                    </span>
                                </div>
                                <div>
                                    {trackResult.status === 'APPROVED' ? (
                                        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                                            <CheckCircle2 className="w-4 h-4" />
                                            {t('StatusApproved')}
                                        </span>
                                    ) : trackResult.status === 'REJECTED' ? (
                                        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black bg-gray-200 text-gray-700">
                                            {t('StatusRejected')}
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-200">
                                            <Clock className="w-4 h-4" />
                                            {t('StatusPending')}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm pt-2">
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-0.5">
                                        Boutique / Ville
                                    </span>
                                    <span className="font-black text-black flex items-center gap-1.5">
                                        <Store className="w-4 h-4 text-gray-400" />
                                        {trackResult.storeName} ({trackResult.city})
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-0.5">
                                        Date de dépôt
                                    </span>
                                    <span className="font-bold text-gray-600">
                                        {new Date(trackResult.createdAt).toLocaleDateString('fr-FR', {
                                            day: '2-digit',
                                            month: 'long',
                                            year: 'numeric'
                                        })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Custom Alert Overlay avec code de suivi du dossier */}
            {showAlert && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300 left-0 top-0">
                    <div className="bg-white rounded-[2rem] p-6 sm:p-8 max-w-sm w-full shadow-2xl relative animate-in zoom-in-95 duration-300">
                        <button 
                            type="button"
                            onClick={() => setShowAlert(false)}
                            className="absolute right-6 top-6 text-gray-400 hover:text-black transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <h3 className="text-2xl font-black text-center mb-2">{t('ThanksTitle')}</h3>
                        <p className="text-gray-500 font-medium text-xs sm:text-sm text-center leading-relaxed">
                            {t('ThanksMsg')}
                        </p>

                        {trackingCode && (
                            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 my-4 text-center">
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">
                                    {t('TrackingCodeLabel')}
                                </span>
                                <span className="font-mono font-black text-base text-black tracking-wider block mb-2 select-all">
                                    {trackingCode}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        navigator.clipboard.writeText(trackingCode)
                                        setCopied(true)
                                        setTimeout(() => setCopied(false), 2000)
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black text-white text-[11px] font-bold rounded-lg hover:bg-gray-800 transition-colors"
                                >
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>{copied ? t('TrackingCodeCopied') : t('TrackingCodeCopy')}</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
