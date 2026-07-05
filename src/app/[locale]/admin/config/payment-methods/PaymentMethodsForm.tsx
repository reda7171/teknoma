'use client'

import { useState } from 'react'
import { Save, Banknote, RefreshCw, CreditCard, Wallet, CircleDollarSign } from 'lucide-react'
import { updateSetting } from '@/lib/actions/site-settings'
import { useUIStore } from '@/store/ui'

interface PaymentSettings {
    codEnabled: boolean
    paypalEnabled: boolean
    paypalClientId: string
    paypalClientSecret: string
    paypalMode: string
    stripeEnabled: boolean
    stripePublicKey: string
    stripeSecretKey: string
    cmiEnabled: boolean
    cmiClientId: string
    cmiStoreKey: string
    cmiMode: string
}

export default function PaymentMethodsForm({ initialSettings }: { initialSettings: PaymentSettings }) {
    const [settings, setSettings] = useState<PaymentSettings>(initialSettings)
    const [isLoading, setIsLoading] = useState(false)
    const showNotification = useUIStore(state => state.showNotification)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            await updateSetting('payment_cod_enabled', String(settings.codEnabled), 'config', 'Paiement à la livraison')
            
            await updateSetting('payment_paypal_enabled', String(settings.paypalEnabled), 'config', 'Paiement PayPal')
            await updateSetting('payment_paypal_client_id', settings.paypalClientId, 'config', 'Client ID PayPal')
            await updateSetting('payment_paypal_client_secret', settings.paypalClientSecret, 'config', 'Client Secret PayPal')
            await updateSetting('payment_paypal_mode', settings.paypalMode, 'config', 'Mode PayPal')

            await updateSetting('payment_stripe_enabled', String(settings.stripeEnabled), 'config', 'Paiement Stripe')
            await updateSetting('payment_stripe_public_key', settings.stripePublicKey, 'config', 'Clé Publique Stripe')
            await updateSetting('payment_stripe_secret_key', settings.stripeSecretKey, 'config', 'Clé Secrète Stripe')

            await updateSetting('payment_cmi_enabled', String(settings.cmiEnabled), 'config', 'Paiement CMI')
            await updateSetting('payment_cmi_client_id', settings.cmiClientId, 'config', 'Client ID CMI')
            await updateSetting('payment_cmi_store_key', settings.cmiStoreKey, 'config', 'Store Key CMI')
            await updateSetting('payment_cmi_mode', settings.cmiMode, 'config', 'Mode CMI')
            
            showNotification('Méthodes de paiement mises à jour avec succès', 'success')
        } catch (error) {
            console.error('Erreur lors de la mise à jour des paiements:', error)
            showNotification('Erreur lors de la mise à jour', 'error')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Paiement à la livraison (COD) */}
            <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
                <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                        <Banknote className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-900">Paiement à la livraison (COD)</h2>
                        <p className="text-sm text-slate-500">Le client paie en espèces lors de la réception de la commande.</p>
                    </div>
                    <div className="ml-auto">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                className="sr-only peer" 
                                checked={settings.codEnabled}
                                onChange={(e) => setSettings({ ...settings, codEnabled: e.target.checked })}
                            />
                            <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                    </div>
                </div>
            </div>

            {/* PayPal */}
            <div className={`bg-white p-6 md:p-8 rounded-[2rem] border transition-all shadow-sm space-y-6 ${settings.paypalEnabled ? 'border-blue-200 ring-2 ring-blue-50' : 'border-slate-100'}`}>
                <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                        <CircleDollarSign className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-900">PayPal</h2>
                        <p className="text-sm text-slate-500">Acceptez les paiements sécurisés via PayPal.</p>
                    </div>
                    <div className="ml-auto">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                className="sr-only peer" 
                                checked={settings.paypalEnabled}
                                onChange={(e) => setSettings({ ...settings, paypalEnabled: e.target.checked })}
                            />
                            <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-500"></div>
                        </label>
                    </div>
                </div>

                {settings.paypalEnabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Mode de l'environnement</label>
                            <select
                                value={settings.paypalMode}
                                onChange={(e) => setSettings({ ...settings, paypalMode: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all"
                            >
                                <option value="sandbox">Sandbox (Test)</option>
                                <option value="live">Live (Production)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Client ID</label>
                            <input
                                type="text"
                                value={settings.paypalClientId}
                                onChange={(e) => setSettings({ ...settings, paypalClientId: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all"
                                placeholder="Client ID fourni par PayPal"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Secret Key</label>
                            <input
                                type="password"
                                value={settings.paypalClientSecret}
                                onChange={(e) => setSettings({ ...settings, paypalClientSecret: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all"
                                placeholder="Clé secrète PayPal"
                            />
                        </div>
                    </div>
                )}
                
                <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-800">
                    <strong>Documentation PayPal :</strong> Vous pouvez créer une application et obtenir votre Client ID et Secret Key depuis le <a href="https://developer.paypal.com/dashboard" target="_blank" rel="noreferrer" className="underline font-bold">Portail Développeur PayPal</a>. Assurez-vous d'activer les paiements en direct si vous choisissez le mode Production.
                </div>
            </div>

            {/* Stripe */}
            <div className={`bg-white p-6 md:p-8 rounded-[2rem] border transition-all shadow-sm space-y-6 ${settings.stripeEnabled ? 'border-indigo-200 ring-2 ring-indigo-50' : 'border-slate-100'}`}>
                <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                    <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                        <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-900">Stripe</h2>
                        <p className="text-sm text-slate-500">Paiements par carte de crédit/débit (Visa, Mastercard, etc.).</p>
                    </div>
                    <div className="ml-auto">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                className="sr-only peer" 
                                checked={settings.stripeEnabled}
                                onChange={(e) => setSettings({ ...settings, stripeEnabled: e.target.checked })}
                            />
                            <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-500"></div>
                        </label>
                    </div>
                </div>

                {settings.stripeEnabled && (
                    <div className="grid grid-cols-1 gap-6 pt-2">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Clé Publique (Publishable key)</label>
                            <input
                                type="text"
                                value={settings.stripePublicKey}
                                onChange={(e) => setSettings({ ...settings, stripePublicKey: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all"
                                placeholder="pk_test_..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Clé Secrète (Secret key)</label>
                            <input
                                type="password"
                                value={settings.stripeSecretKey}
                                onChange={(e) => setSettings({ ...settings, stripeSecretKey: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all"
                                placeholder="sk_test_..."
                            />
                        </div>
                    </div>
                )}
                
                <div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-sm text-indigo-800">
                    <strong>Documentation Stripe :</strong> Pour recevoir les confirmations de paiement en temps réel, veuillez ajouter l'URL de Webhook <code>https://riwaya.store/api/webhooks/stripe</code> dans votre tableau de bord Stripe. N'oubliez pas d'ajouter la clé secrète du Webhook dans votre fichier <code>.env</code> (<code>STRIPE_WEBHOOK_SECRET</code>).
                </div>
            </div>

            {/* CMI */}
            <div className={`bg-white p-6 md:p-8 rounded-[2rem] border transition-all shadow-sm space-y-6 ${settings.cmiEnabled ? 'border-amber-200 ring-2 ring-amber-50' : 'border-slate-100'}`}>
                <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                    <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                        <Wallet className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-900">CMI (Maroc)</h2>
                        <p className="text-sm text-slate-500">Paiements par carte bancaire marocaine via le CMI.</p>
                    </div>
                    <div className="ml-auto">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                className="sr-only peer" 
                                checked={settings.cmiEnabled}
                                onChange={(e) => setSettings({ ...settings, cmiEnabled: e.target.checked })}
                            />
                            <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-amber-500"></div>
                        </label>
                    </div>
                </div>

                {settings.cmiEnabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Mode de l'environnement</label>
                            <select
                                value={settings.cmiMode}
                                onChange={(e) => setSettings({ ...settings, cmiMode: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-50 outline-none transition-all"
                            >
                                <option value="test">Test</option>
                                <option value="prod">Production</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Client ID</label>
                            <input
                                type="text"
                                value={settings.cmiClientId}
                                onChange={(e) => setSettings({ ...settings, cmiClientId: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-50 outline-none transition-all"
                                placeholder="ID Client CMI"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Store Key</label>
                            <input
                                type="password"
                                value={settings.cmiStoreKey}
                                onChange={(e) => setSettings({ ...settings, cmiStoreKey: e.target.value })}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-50 outline-none transition-all"
                                placeholder="Clé de la boutique CMI"
                            />
                        </div>
                    </div>
                )}
                
                <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-800">
                    <strong>Documentation CMI :</strong> Le système génère automatiquement l'empreinte SHA-512 pour sécuriser vos paiements. Si CMI vous demande de leur fournir une "Callback URL", donnez-leur : <code>https://riwaya.store/api/webhooks/cmi</code>.
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <button
                    type="submit"
                    disabled={isLoading}
                    className="px-8 py-4 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-black/10"
                >
                    {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {isLoading ? 'Sauvegarde...' : 'Sauvegarder les paiements'}
                </button>
            </div>
        </form>
    )
}
