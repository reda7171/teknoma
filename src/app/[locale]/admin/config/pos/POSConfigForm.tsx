'use client'

import { useState } from 'react'
import { updateSetting } from '@/lib/actions/site-settings'
import { Save } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function POSConfigForm({ 
    initialStoreName, 
    initialStoreAddress, 
    initialStorePhone, 
    initialReceiptMessage,
    initialTaxRate,
    initialCurrency,
    initialEnablePrint,
    initialPrinterType,
    initialDefaultDiscount,
    initialMaxDiscount,
    initialFavoriteCategories,
    initialShowCategories,
    initialShowSearch,
    initialDefaultGridCols,
    initialDefaultTab,
    initialAllowOutOfStock,
    initialRequireCustomer,
    initialEnableSessions
}: { 
    initialStoreName: string, 
    initialStoreAddress: string, 
    initialStorePhone: string, 
    initialReceiptMessage: string,
    initialTaxRate: string,
    initialCurrency: string,
    initialEnablePrint: string,
    initialPrinterType: string,
    initialDefaultDiscount: string,
    initialMaxDiscount: string,
    initialFavoriteCategories: string,
    initialShowCategories: string,
    initialShowSearch: string,
    initialDefaultGridCols: string,
    initialDefaultTab: string,
    initialAllowOutOfStock: string,
    initialRequireCustomer: string,
    initialEnableSessions: string
}) {
    const [storeName, setStoreName] = useState(initialStoreName)
    const [storeAddress, setStoreAddress] = useState(initialStoreAddress)
    const [storePhone, setStorePhone] = useState(initialStorePhone)
    const [receiptMessage, setReceiptMessage] = useState(initialReceiptMessage)
    const [taxRate, setTaxRate] = useState(initialTaxRate)
    const [currency, setCurrency] = useState(initialCurrency)
    const [enablePrint, setEnablePrint] = useState(initialEnablePrint === 'true')
    const [printerType, setPrinterType] = useState(initialPrinterType)
    const [defaultDiscount, setDefaultDiscount] = useState(initialDefaultDiscount)
    const [maxDiscount, setMaxDiscount] = useState(initialMaxDiscount)
    const [favoriteCategories, setFavoriteCategories] = useState(initialFavoriteCategories)
    const [showCategories, setShowCategories] = useState(initialShowCategories === 'true')
    const [showSearch, setShowSearch] = useState(initialShowSearch === 'true')
    const [defaultGridCols, setDefaultGridCols] = useState(initialDefaultGridCols)
    const [defaultTab, setDefaultTab] = useState(initialDefaultTab)
    const [allowOutOfStock, setAllowOutOfStock] = useState(initialAllowOutOfStock === 'true')
    const [requireCustomer, setRequireCustomer] = useState(initialRequireCustomer === 'true')
    const [enableSessions, setEnableSessions] = useState(initialEnableSessions === 'true')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const router = useRouter()

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setMessage('')

        try {
            await updateSetting('pos_store_name', storeName, 'config', 'Nom de la boutique (Ticket POS)')
            await updateSetting('pos_store_address', storeAddress, 'config', 'Adresse de la boutique (Ticket POS)')
            await updateSetting('pos_store_phone', storePhone, 'config', 'Téléphone de la boutique (Ticket POS)')
            await updateSetting('pos_receipt_message', receiptMessage, 'config', 'Message de remerciement (Ticket POS)')
            await updateSetting('pos_tax_rate', taxRate, 'config', 'Taux de TVA (%)')
            await updateSetting('pos_currency', currency, 'config', 'Devise par défaut')
            await updateSetting('pos_enable_print', enablePrint ? 'true' : 'false', 'config', 'Impression automatique')
            await updateSetting('pos_printer_type', printerType, 'config', "Type d'imprimante")
            await updateSetting('pos_default_discount', defaultDiscount, 'config', 'Remise par défaut (%)')
            await updateSetting('pos_max_discount', maxDiscount, 'config', 'Remise maximale (%)')
            await updateSetting('pos_favorite_categories', favoriteCategories, 'config', 'Catégories favorites')
            await updateSetting('pos_show_categories', showCategories ? 'true' : 'false', 'config', 'Afficher la barre des catégories')
            await updateSetting('pos_show_search', showSearch ? 'true' : 'false', 'config', 'Afficher la barre de recherche')
            await updateSetting('pos_default_grid_cols', defaultGridCols, 'config', 'Colonnes par défaut (Grille)')
            await updateSetting('pos_default_tab', defaultTab, 'config', 'Onglet par défaut')
            await updateSetting('pos_allow_out_of_stock', allowOutOfStock ? 'true' : 'false', 'config', 'Autoriser la vente hors stock')
            await updateSetting('pos_require_customer', requireCustomer ? 'true' : 'false', 'config', 'Exiger les informations client')
            await updateSetting('pos_enable_sessions', enableSessions ? 'true' : 'false', 'config', 'Activer les Sessions de Caisse')
            setMessage('Configuration enregistrée avec succès !')
            router.refresh()
        } catch (error) {
            setMessage("Erreur lors de l'enregistrement.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {message && (
                <div className={`p-4 rounded-xl text-sm font-medium ${message.includes('succès') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {message}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                    <h3 className="text-lg font-black text-black uppercase tracking-tight mb-4 border-b border-gray-100 pb-2">Informations de la Boutique</h3>
                </div>

                <div>
                    <label htmlFor="storeName" className="block text-sm font-bold text-gray-900 mb-2">
                        Nom de la boutique
                    </label>
                    <input
                        type="text"
                        id="storeName"
                        value={storeName}
                        onChange={(e) => setStoreName(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder="Ex: Riwaya Store"
                    />
                </div>

                <div>
                    <label htmlFor="storePhone" className="block text-sm font-bold text-gray-900 mb-2">
                        Téléphone de la boutique
                    </label>
                    <input
                        type="text"
                        id="storePhone"
                        value={storePhone}
                        onChange={(e) => setStorePhone(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder="Ex: +212 600 000 000"
                    />
                </div>

                <div className="md:col-span-2">
                    <label htmlFor="storeAddress" className="block text-sm font-bold text-gray-900 mb-2">
                        Adresse de la boutique
                    </label>
                    <input
                        type="text"
                        id="storeAddress"
                        value={storeAddress}
                        onChange={(e) => setStoreAddress(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder="Ex: 123 Rue de la Lecture, Casablanca"
                    />
                </div>

                <div className="md:col-span-2">
                    <label htmlFor="receiptMessage" className="block text-sm font-bold text-gray-900 mb-2">
                        Message de remerciement (Ticket)
                    </label>
                    <textarea
                        id="receiptMessage"
                        value={receiptMessage}
                        onChange={(e) => setReceiptMessage(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all min-h-[100px]"
                        placeholder="Merci pour votre visite ! A bientôt."
                    />
                </div>

                <div className="md:col-span-2 mt-6">
                    <h3 className="text-lg font-black text-black uppercase tracking-tight mb-4 border-b border-gray-100 pb-2">Paramètres Financiers & Remises</h3>
                </div>

                <div>
                    <label htmlFor="taxRate" className="block text-sm font-bold text-gray-900 mb-2">
                        Taux de TVA (%)
                    </label>
                    <input
                        type="number"
                        id="taxRate"
                        value={taxRate}
                        onChange={(e) => setTaxRate(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder="0"
                        min="0"
                        step="0.1"
                    />
                </div>

                <div>
                    <label htmlFor="currency" className="block text-sm font-bold text-gray-900 mb-2">
                        Devise par défaut
                    </label>
                    <input
                        type="text"
                        id="currency"
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder="درهم"
                    />
                </div>

                <div>
                    <label htmlFor="defaultDiscount" className="block text-sm font-bold text-gray-900 mb-2">
                        Remise par défaut (%)
                    </label>
                    <input
                        type="number"
                        id="defaultDiscount"
                        value={defaultDiscount}
                        onChange={(e) => setDefaultDiscount(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder="0"
                        min="0"
                        step="0.1"
                    />
                </div>

                <div>
                    <label htmlFor="maxDiscount" className="block text-sm font-bold text-gray-900 mb-2">
                        Remise maximale autorisée (%)
                    </label>
                    <input
                        type="number"
                        id="maxDiscount"
                        value={maxDiscount}
                        onChange={(e) => setMaxDiscount(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder="100"
                        min="0"
                        max="100"
                        step="0.1"
                    />
                </div>

                <div className="md:col-span-2 mt-6">
                    <h3 className="text-lg font-black text-black uppercase tracking-tight mb-4 border-b border-gray-100 pb-2">Paramètres de la Caisse (Catégories & Impression)</h3>
                </div>

                <div className="md:col-span-2">
                    <label htmlFor="favoriteCategories" className="block text-sm font-bold text-gray-900 mb-2">
                        Catégories favorites (séparées par une virgule)
                    </label>
                    <input
                        type="text"
                        id="favoriteCategories"
                        value={favoriteCategories}
                        onChange={(e) => setFavoriteCategories(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder="Ex: Romans, Développement Personnel, Islam"
                    />
                    <p className="mt-2 text-xs text-gray-500 font-medium">
                        Ces catégories s'afficheront en premier sur la page du point de vente.
                    </p>
                    <div className="mt-4">
                        <label className="flex items-center justify-between cursor-pointer p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                            <div className="space-y-1">
                                <span className="block text-sm font-bold text-black">Sessions de Caisse</span>
                                <span className="block text-xs text-gray-500 font-medium">Fonds de tiroir et calcul des écarts à la fermeture</span>
                            </div>
                            <input
                                type="checkbox"
                                checked={enableSessions}
                                onChange={(e) => setEnableSessions(e.target.checked)}
                                className="w-5 h-5 text-black border-gray-300 rounded focus:ring-black"
                            />
                        </label>
                    </div>
                </div>

                <div className="md:col-span-1">
                    <label htmlFor="defaultGridCols" className="block text-sm font-bold text-gray-900 mb-2">
                        Colonnes par défaut (Grille Produits)
                    </label>
                    <input
                        type="number"
                        id="defaultGridCols"
                        value={defaultGridCols}
                        onChange={(e) => setDefaultGridCols(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder="8"
                        min="2"
                        max="12"
                    />
                </div>

                <div className="md:col-span-1">
                    <label htmlFor="defaultTab" className="block text-sm font-bold text-gray-900 mb-2">
                        Onglet par défaut
                    </label>
                    <select aria-label="Sélection defaultTab"
                        id="defaultTab"
                        value={defaultTab}
                        onChange={(e) => setDefaultTab(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    >
                        <option value="ALL">Tout le catalogue</option>
                        <option value="BOOKS">Livres unitaires</option>
                        <option value="PACKS">Packs promo</option>
                        <option value="ACCESSORIES_LIBRARY">Accessoires lecture</option>
                        <option value="ACCESSORIES_KIDS">Accessoires enfants</option>
                    </select>
                </div>

                <div className="md:col-span-2 flex flex-col md:flex-row gap-6 p-4 border border-gray-200 rounded-xl bg-gray-50">
                    <div className="flex-1 space-y-4">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={enablePrint}
                                onChange={(e) => setEnablePrint(e.target.checked)}
                                className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                            <div>
                                <span className="block text-sm font-bold text-gray-900">Impression Automatique</span>
                                <span className="block text-xs text-gray-500">Imprimer le ticket dès la validation de la commande</span>
                            </div>
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={showCategories}
                                onChange={(e) => setShowCategories(e.target.checked)}
                                className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                            <div>
                                <span className="block text-sm font-bold text-gray-900">Afficher la barre des catégories</span>
                                <span className="block text-xs text-gray-500">Cacher pour avoir plus d'espace pour les produits</span>
                            </div>
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={showSearch}
                                onChange={(e) => setShowSearch(e.target.checked)}
                                className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                            <div>
                                <span className="block text-sm font-bold text-gray-900">Afficher la barre de recherche</span>
                                <span className="block text-xs text-gray-500">Cacher si vous n'utilisez pas la recherche</span>
                            </div>
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={allowOutOfStock}
                                onChange={(e) => setAllowOutOfStock(e.target.checked)}
                                className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                            <div>
                                <span className="block text-sm font-bold text-gray-900">Autoriser la vente hors stock</span>
                                <span className="block text-xs text-gray-500">Permet d'ajouter des produits avec stock 0 au panier</span>
                            </div>
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={requireCustomer}
                                onChange={(e) => setRequireCustomer(e.target.checked)}
                                className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                            <div>
                                <span className="block text-sm font-bold text-gray-900">Exiger les infos client</span>
                                <span className="block text-xs text-gray-500">Nom et téléphone obligatoires pour valider</span>
                            </div>
                        </label>
                    </div>
                    
                    <div className="flex-1">
                        <label htmlFor="printerType" className="block text-sm font-bold text-gray-900 mb-2">
                            Type d'imprimante
                        </label>
                        <select aria-label="Sélection printerType"
                            id="printerType"
                            value={printerType}
                            onChange={(e) => setPrinterType(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        >
                            <option value="bluetooth">Bluetooth (Thermique)</option>
                            <option value="usb">USB</option>
                            <option value="network">Réseau (WIFI/LAN)</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-100">
                <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-8 py-3 bg-black text-white text-sm font-black uppercase tracking-widest rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                >
                    <Save className="w-4 h-4" />
                    {loading ? 'Enregistrement...' : 'Enregistrer la configuration'}
                </button>
            </div>
        </form>
    )
}
