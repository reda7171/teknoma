'use client'

import { useState } from 'react'
import { Target, Eye, EyeOff, Loader2 } from 'lucide-react'
import { testGoogleAdsConnectionAction } from '@/lib/actions/google-ads'

export interface GoogleAdsSettingsState {
    customerId: string
    loginCustomerId: string
    developerToken: string
    clientId: string
    clientSecret: string
    refreshToken: string
    conversionActionId: string
}

interface GoogleAdsConfigSectionProps {
    values: GoogleAdsSettingsState
    onChange: (next: GoogleAdsSettingsState) => void
}

/**
 * Section de configuration et test OAuth2 / Developer Token Google Ads API v17 dans Config > API.
 */
export default function GoogleAdsConfigSection({ values, onChange }: GoogleAdsConfigSectionProps) {
    const [showSecrets, setShowSecrets] = useState(false)
    const [testing, setTesting] = useState(false)
    const [testStatus, setTestStatus] = useState<{ ok: boolean; text: string } | null>(null)

    const updateField = (key: keyof GoogleAdsSettingsState, val: string) => {
        onChange({ ...values, [key]: val })
    }

    const handleTestGoogleAds = async () => {
        setTesting(true)
        setTestStatus(null)
        try {
            const res = await testGoogleAdsConnectionAction({
                customerId: values.customerId,
                loginCustomerId: values.loginCustomerId,
                developerToken: values.developerToken,
                clientId: values.clientId,
                clientSecret: values.clientSecret,
                refreshToken: values.refreshToken,
            })
            setTestStatus({
                ok: Boolean(res.success),
                text: res.success ? res.message || 'Connexion Google Ads OK' : res.error || 'Échec connexion Google Ads',
            })
        } catch {
            setTestStatus({ ok: false, text: 'Erreur lors du test Google Ads API.' })
        } finally {
            setTesting(false)
        }
    }

    return (
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm transition-all hover:shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                        <Target className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-gray-900">Google Ads API (Coûts &amp; Conversions)</h2>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-1">
                            Import ROAS &amp; Enhanced Conversions COD
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setShowSecrets(!showSecrets)}
                        className="px-3 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-bold inline-flex items-center gap-1.5"
                    >
                        {showSecrets ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{showSecrets ? 'Masquer' : 'Afficher'}</span>
                    </button>
                    <button
                        type="button"
                        disabled={testing || !values.customerId.trim() || !values.developerToken.trim()}
                        onClick={handleTestGoogleAds}
                        className="px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-black transition-all disabled:opacity-50 inline-flex items-center gap-1.5"
                    >
                        {testing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        <span>Tester Google Ads API</span>
                    </button>
                </div>
            </div>

            {testStatus && (
                <div
                    className={`mb-4 p-3 rounded-2xl text-xs font-bold border ${
                        testStatus.ok
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-red-50 text-red-800 border-red-200'
                    }`}
                >
                    {testStatus.text}
                </div>
            )}

            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[13px] font-black text-gray-700 uppercase tracking-wider mb-2 ml-1">
                            Customer ID (sans ou avec tirets)
                        </label>
                        <input
                            type="text"
                            value={values.customerId}
                            onChange={(e) => updateField('customerId', e.target.value)}
                            placeholder="123-456-7890"
                            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all font-mono text-sm text-gray-900"
                        />
                    </div>
                    <div>
                        <label className="block text-[13px] font-black text-gray-700 uppercase tracking-wider mb-2 ml-1">
                            Login Customer ID MCC (optionnel)
                        </label>
                        <input
                            type="text"
                            value={values.loginCustomerId}
                            onChange={(e) => updateField('loginCustomerId', e.target.value)}
                            placeholder="987-654-3210"
                            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all font-mono text-sm text-gray-900"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-[13px] font-black text-gray-700 uppercase tracking-wider mb-2 ml-1">
                        Developer Token
                    </label>
                    <input
                        type={showSecrets ? 'text' : 'password'}
                        value={values.developerToken}
                        onChange={(e) => updateField('developerToken', e.target.value)}
                        placeholder="ABcdEf..."
                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all font-mono text-sm text-gray-900"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[13px] font-black text-gray-700 uppercase tracking-wider mb-2 ml-1">
                            OAuth Client ID
                        </label>
                        <input
                            type="text"
                            value={values.clientId}
                            onChange={(e) => updateField('clientId', e.target.value)}
                            placeholder="....apps.googleusercontent.com"
                            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all font-mono text-sm text-gray-900"
                        />
                    </div>
                    <div>
                        <label className="block text-[13px] font-black text-gray-700 uppercase tracking-wider mb-2 ml-1">
                            OAuth Client Secret
                        </label>
                        <input
                            type={showSecrets ? 'text' : 'password'}
                            value={values.clientSecret}
                            onChange={(e) => updateField('clientSecret', e.target.value)}
                            placeholder="GOCSPX-..."
                            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all font-mono text-sm text-gray-900"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-[13px] font-black text-gray-700 uppercase tracking-wider mb-2 ml-1">
                            OAuth Refresh Token
                        </label>
                        <input
                            type={showSecrets ? 'text' : 'password'}
                            value={values.refreshToken}
                            onChange={(e) => updateField('refreshToken', e.target.value)}
                            placeholder="1//0..."
                            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all font-mono text-sm text-gray-900"
                        />
                    </div>
                    <div>
                        <label className="block text-[13px] font-black text-gray-700 uppercase tracking-wider mb-2 ml-1">
                            Conversion Action ID (COD Livré)
                        </label>
                        <input
                            type="text"
                            value={values.conversionActionId}
                            onChange={(e) => updateField('conversionActionId', e.target.value)}
                            placeholder="customers/123/conversionActions/456"
                            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all font-mono text-sm text-gray-900"
                        />
                    </div>
                </div>
                <p className="text-[11px] text-gray-500 font-medium ml-1">
                    Si votre Developer Token Google Ads est en attente d&apos;approbation, copiez le Script AdsApp gratuit directement depuis /fr/admin/analytics pour pousser vos coûts chaque jour.
                </p>
            </div>
        </div>
    )
}

