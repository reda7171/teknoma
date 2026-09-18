'use client'

import { useState } from 'react'
import { Save, Banknote, RefreshCw, CreditCard, Wallet, CircleDollarSign, Landmark, Plus, Trash2, Eye, EyeOff, Upload, Loader2 } from 'lucide-react'
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
    bankTransferEnabled: boolean
    bankTransferAccounts: string
}

interface BankAccount {
    bankName: string;
    accountName: string;
    rib: string;
    logo?: string;
    qrCode?: string;
}

export default function PaymentMethodsForm({ initialSettings }: { initialSettings: PaymentSettings }) {
    const [settings, setSettings] = useState<PaymentSettings>(initialSettings)
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() => {
        try {
            return JSON.parse(initialSettings.bankTransferAccounts || '[]')
        } catch {
            return []
        }
    })
    const [isLoading, setIsLoading] = useState(false)
    const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)
    const [uploadingQrIndex, setUploadingQrIndex] = useState<number | null>(null)
    const [showPaypalSecret, setShowPaypalSecret] = useState(false)
    const [showStripeSecret, setShowStripeSecret] = useState(false)
    const [showCmiKey, setShowCmiKey] = useState(false)
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
            
            await updateSetting('payment_bank_transfer_enabled', String(settings.bankTransferEnabled), 'config', 'Virement bancaire')
            await updateSetting('payment_bank_transfer_accounts', JSON.stringify(bankAccounts), 'config', 'Comptes bancaires')
            
            showNotification('Méthodes de paiement mises à jour avec succès', 'success')
        } catch (error) {
            console.error('Erreur lors de la mise à jour des paiements:', error)
            showNotification('Erreur lors de la mise à jour', 'error')
        } finally {
            setIsLoading(false)
        }
    }

    const addBankAccount = () => {
        setBankAccounts([...bankAccounts, { bankName: '', accountName: '', rib: '', logo: '', qrCode: '' }])
    }

    const updateBankAccount = (index: number, field: keyof BankAccount, value: string) => {
        const newAccounts = [...bankAccounts]
        newAccounts[index][field] = value
        setBankAccounts(newAccounts)
    }

    const removeBankAccount = (index: number) => {
        const newAccounts = [...bankAccounts]
        newAccounts.splice(index, 1)
        setBankAccounts(newAccounts)
    }

    const handleLogoUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploadingIndex(index)
        try {
            const formData = new FormData()
            formData.append('file', file)
            
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            })
            
            const data = await res.json()
            if (data.success && data.url) {
                updateBankAccount(index, 'logo', data.url)
                showNotification('Logo uploadé avec succès', 'success')
            } else {
                throw new Error(data.error || "Erreur lors de l'upload")
            }
        } catch (error) {
            console.error('Erreur upload:', error)
            showNotification("Erreur lors de l'upload du logo", 'error')
        } finally {
            setUploadingIndex(null)
            if (e.target) e.target.value = ''
        }
    }

    const handleQrUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploadingQrIndex(index)
        try {
            const formData = new FormData()
            formData.append('file', file)
            
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            })
            
            const data = await res.json()
            if (data.success && data.url) {
                updateBankAccount(index, 'qrCode', data.url)
                showNotification('QR Code uploadé avec succès', 'success')
            } else {
                throw new Error(data.error || "Erreur lors de l'upload")
            }
        } catch (error) {
            console.error('Erreur upload:', error)
            showNotification("Erreur lors de l'upload du QR Code", 'error')
        } finally {
            setUploadingQrIndex(null)
            if (e.target) e.target.value = ''
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
                            <select aria-label="Champ de sélection"
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
                            <div className="relative">
                                <input
                                    type={showPaypalSecret ? 'text' : 'password'}
                                    value={settings.paypalClientSecret}
                                    onChange={(e) => setSettings({ ...settings, paypalClientSecret: e.target.value })}
                                    className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all"
                                    placeholder="Clé secrète PayPal"
                                />
                                <button type="button" onClick={() => setShowPaypalSecret(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors">
                                    {showPaypalSecret ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
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
                            <div className="relative">
                                <input
                                    type={showStripeSecret ? 'text' : 'password'}
                                    value={settings.stripeSecretKey}
                                    onChange={(e) => setSettings({ ...settings, stripeSecretKey: e.target.value })}
                                    className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all"
                                    placeholder="sk_test_..."
                                />
                                <button type="button" onClick={() => setShowStripeSecret(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors">
                                    {showStripeSecret ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
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
                            <select aria-label="Champ de sélection"
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
                            <div className="relative">
                                <input
                                    type={showCmiKey ? 'text' : 'password'}
                                    value={settings.cmiStoreKey}
                                    onChange={(e) => setSettings({ ...settings, cmiStoreKey: e.target.value })}
                                    className="w-full px-4 py-3 pr-12 rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-50 outline-none transition-all"
                                    placeholder="Clé de la boutique CMI"
                                />
                                <button type="button" onClick={() => setShowCmiKey(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors">
                                    {showCmiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                
                <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-800">
                    <strong>Documentation CMI :</strong> Le système génère automatiquement l'empreinte SHA-512 pour sécuriser vos paiements. Si CMI vous demande de leur fournir une "Callback URL", donnez-leur : <code>https://riwaya.store/api/webhooks/cmi</code>.
                </div>
            </div>

            {/* Virement Bancaire */}
            <div className={`bg-white p-6 md:p-8 rounded-[2rem] border transition-all shadow-sm space-y-6 ${settings.bankTransferEnabled ? 'border-teal-200 ring-2 ring-teal-50' : 'border-slate-100'}`}>
                <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                    <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center text-teal-600">
                        <Landmark className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-900">Virement Bancaire</h2>
                        <p className="text-sm text-slate-500">Le client vous transfère l'argent sur votre compte bancaire.</p>
                    </div>
                    <div className="ml-auto">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                className="sr-only peer" 
                                checked={settings.bankTransferEnabled}
                                onChange={(e) => setSettings({ ...settings, bankTransferEnabled: e.target.checked })}
                            />
                            <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-teal-500"></div>
                        </label>
                    </div>
                </div>

                {settings.bankTransferEnabled && (
                    <div className="pt-2 space-y-4">
                        <div className="flex justify-between items-center mb-4">
                            <label className="block text-sm font-bold text-slate-700">Comptes bancaires</label>
                            <button
                                type="button"
                                onClick={addBankAccount}
                                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold transition-all flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Ajouter un compte
                            </button>
                        </div>
                        
                        {bankAccounts.length === 0 ? (
                            <div className="text-center p-8 bg-slate-50 rounded-xl border border-slate-200 border-dashed text-slate-500 text-sm">
                                Aucun compte bancaire configuré. Cliquez sur "Ajouter un compte" pour commencer.
                            </div>
                        ) : (
                            bankAccounts.map((account, index) => (
                                <div key={index} className="flex flex-col gap-4 p-4 bg-slate-50 border border-slate-100 rounded-xl relative">
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                        <div className="md:col-span-3">
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Nom de la banque</label>
                                            <input
                                                type="text"
                                                value={account.bankName}
                                                onChange={(e) => updateBankAccount(index, 'bankName', e.target.value)}
                                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-50 outline-none transition-all text-sm"
                                                placeholder="Ex: CIH Bank"
                                            />
                                        </div>
                                        <div className="md:col-span-3">
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Nom du titulaire</label>
                                            <input
                                                type="text"
                                                value={account.accountName}
                                                onChange={(e) => updateBankAccount(index, 'accountName', e.target.value)}
                                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-50 outline-none transition-all text-sm"
                                                placeholder="Ex: Entreprise SARL"
                                            />
                                        </div>
                                        <div className="md:col-span-5">
                                            <label className="block text-xs font-bold text-slate-500 mb-1">RIB / IBAN</label>
                                            <input
                                                type="text"
                                                value={account.rib}
                                                onChange={(e) => updateBankAccount(index, 'rib', e.target.value)}
                                                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-50 outline-none transition-all text-sm font-mono"
                                                placeholder="RIB à 24 chiffres ou IBAN"
                                            />
                                        </div>
                                        <div className="md:col-span-1 flex items-end justify-end">
                                            <button
                                                type="button"
                                                onClick={() => removeBankAccount(index)}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors w-full flex justify-center"
                                                title="Supprimer"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">URL du Logo (Optionnel)</label>
                                            <div className="flex gap-4">
                                                {account.logo && (
                                                    <div className="w-10 h-10 shrink-0 bg-white border border-slate-200 rounded-lg p-1 flex items-center justify-center overflow-hidden">
                                                        <img src={account.logo} alt="Logo" className="max-w-full max-h-full object-contain" onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
                                                    </div>
                                                )}
                                                <div className="flex-1 flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={account.logo || ''}
                                                        onChange={(e) => updateBankAccount(index, 'logo', e.target.value)}
                                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-50 outline-none transition-all text-sm"
                                                        placeholder="URL vers l'image du logo"
                                                    />
                                                    <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg transition-colors flex items-center justify-center" title="Parcourir les images">
                                                        {uploadingIndex === index ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                                        <input 
                                                            type="file" 
                                                            className="hidden" 
                                                            accept="image/*" 
                                                            onChange={(e) => handleLogoUpload(index, e)} 
                                                            disabled={uploadingIndex === index}
                                                        />
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 mb-1">QR Code de paiement (Optionnel)</label>
                                            <div className="flex gap-4">
                                                {account.qrCode && (
                                                    <div className="w-10 h-10 shrink-0 bg-white border border-slate-200 rounded-lg p-1 flex items-center justify-center overflow-hidden">
                                                        <img src={account.qrCode} alt="QR" className="max-w-full max-h-full object-contain" onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
                                                    </div>
                                                )}
                                                <div className="flex-1 flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={account.qrCode || ''}
                                                        onChange={(e) => updateBankAccount(index, 'qrCode', e.target.value)}
                                                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-50 outline-none transition-all text-sm"
                                                        placeholder="URL vers le QR Code de paiement"
                                                    />
                                                    <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg transition-colors flex items-center justify-center" title="Parcourir les images">
                                                        {uploadingQrIndex === index ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                                        <input 
                                                            type="file" 
                                                            className="hidden" 
                                                            accept="image/*" 
                                                            onChange={(e) => handleQrUpload(index, e)} 
                                                            disabled={uploadingQrIndex === index}
                                                        />
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                        
                        <div className="mt-4 p-4 bg-teal-50 border border-teal-100 rounded-xl text-sm text-teal-800">
                            <strong>Fonctionnement :</strong> Lors du paiement, le client verra ces coordonnées pour effectuer le virement. La commande sera en attente jusqu'à ce que vous confirmiez la réception du paiement.
                        </div>
                    </div>
                )}
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
