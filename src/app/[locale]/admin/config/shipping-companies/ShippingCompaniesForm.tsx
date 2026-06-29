'use client'

import { useState } from 'react'
import { updateMultipleSettings } from '@/lib/actions/site-settings'
import { Save, Settings } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ShippingCompaniesForm({
    initialOlivraisonEnabled,
    initialOlivraisonApiKey,
    initialOlivraisonSecretKey
}: {
    initialOlivraisonEnabled: boolean,
    initialOlivraisonApiKey: string,
    initialOlivraisonSecretKey: string
}) {
    const [olivraisonEnabled, setOlivraisonEnabled] = useState(initialOlivraisonEnabled)
    const [olivraisonApiKey, setOlivraisonApiKey] = useState(initialOlivraisonApiKey)
    const [olivraisonSecretKey, setOlivraisonSecretKey] = useState(initialOlivraisonSecretKey)
    
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const router = useRouter()

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setMessage('')

        try {
            await updateMultipleSettings([
                { key: 'olivraison_enabled', value: olivraisonEnabled ? 'true' : 'false', category: 'config', description: 'Activer la société de livraison Olivraison' },
                { key: 'olivraison_api_key', value: olivraisonApiKey, category: 'config', description: 'Clé API Olivraison' },
                { key: 'olivraison_secret_key', value: olivraisonSecretKey, category: 'config', description: 'Secret Key Olivraison' }
            ])
            setMessage('Configuration de la société enregistrée avec succès !')
            router.refresh()
        } catch (error) {
            setMessage('Erreur lors de l\'enregistrement.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-10">
            {message && (
                <div className={`p-4 rounded-xl text-sm font-medium ${message.includes('succès') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {message}
                </div>
            )}

            <div className="space-y-6">
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-400 pb-2 border-b border-gray-100 flex items-center gap-2">
                    <Settings className="w-4 h-4" /> Statut & API
                </h3>
                
                <div className="flex items-center gap-4 bg-gray-50 p-6 rounded-3xl mb-6">
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={olivraisonEnabled}
                            onChange={(e) => setOlivraisonEnabled(e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                    </label>
                    <span className="text-xs font-black uppercase tracking-widest text-black flex flex-col">
                        <span>Activer Olivraison</span>
                        <span className="text-[10px] text-gray-400 normal-case mt-1">Activer ou désactiver cette société de livraison</span>
                    </span>
                </div>

                <div className={`space-y-6 transition-opacity duration-300 ${olivraisonEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="olivraisonApiKey" className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
                                API Key
                            </label>
                            <input
                                type="text"
                                id="olivraisonApiKey"
                                value={olivraisonApiKey}
                                onChange={(e) => setOlivraisonApiKey(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-black outline-none transition-all font-medium"
                                placeholder="Clé API Olivraison"
                                required={olivraisonEnabled}
                            />
                        </div>

                        <div>
                            <label htmlFor="olivraisonSecretKey" className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
                                Secret Key
                            </label>
                            <input
                                type="password"
                                id="olivraisonSecretKey"
                                value={olivraisonSecretKey}
                                onChange={(e) => setOlivraisonSecretKey(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-black outline-none transition-all font-medium"
                                placeholder="Clé secrète Olivraison"
                                required={olivraisonEnabled}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full px-10 py-5 bg-black text-white text-[10px] font-black uppercase tracking-[0.3em] rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-4 shadow-xl shadow-black/10 disabled:opacity-50"
            >
                <Save className="w-4 h-4" />
                {loading ? 'Enregistrement...' : 'Enregistrer la configuration'}
            </button>
        </form>
    )
}
