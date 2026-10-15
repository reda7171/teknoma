'use client'

import { useState } from 'react'
import { updateMultipleSettings } from '@/lib/actions/site-settings'
import { Save, Eye, EyeOff, CheckCircle2, AlertTriangle, RefreshCw, Send } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function N8nConfigForm({ initialWebhookUrl, initialInstagramWebhookUrl, initialFacebookAccessToken, initialInstagramAccountId, initialInstagramToken, initialThreadsAccountId, initialThreadsAccessToken, initialTiktokAccessToken, initialTiktokCreatorId, initialTiktokAppId, initialTiktokClientSecret, initialPinterestAccessToken, initialPinterestBoardId, initialPinterestAppId, initialPinterestAppSecret }: { initialWebhookUrl: string, initialInstagramWebhookUrl: string, initialFacebookAccessToken: string, initialInstagramAccountId: string, initialInstagramToken: string, initialThreadsAccountId: string, initialThreadsAccessToken: string, initialTiktokAccessToken?: string, initialTiktokCreatorId?: string, initialTiktokAppId?: string, initialTiktokClientSecret?: string, initialPinterestAccessToken?: string, initialPinterestBoardId?: string, initialPinterestAppId?: string, initialPinterestAppSecret?: string }) {
    const [webhookUrl, setWebhookUrl] = useState(initialWebhookUrl)
    const [instagramWebhookUrl, setInstagramWebhookUrl] = useState(initialInstagramWebhookUrl)
    const [facebookAccessToken, setFacebookAccessToken] = useState(initialFacebookAccessToken)
    const [instagramAccountId, setInstagramAccountId] = useState(initialInstagramAccountId)
    const [instagramToken, setInstagramToken] = useState(initialInstagramToken)
    const [threadsAccountId, setThreadsAccountId] = useState(initialThreadsAccountId)
    const [threadsAccessToken, setThreadsAccessToken] = useState(initialThreadsAccessToken)
    const [tiktokAccessToken, setTiktokAccessToken] = useState(initialTiktokAccessToken || '')
    const [tiktokCreatorId, setTiktokCreatorId] = useState(initialTiktokCreatorId || '')
    const [tiktokAppId, setTiktokAppId] = useState(initialTiktokAppId || '')
    const [tiktokClientSecret, setTiktokClientSecret] = useState(initialTiktokClientSecret || '')
    const [pinterestAccessToken, setPinterestAccessToken] = useState(initialPinterestAccessToken || '')
    const [pinterestBoardId, setPinterestBoardId] = useState(initialPinterestBoardId || '')
    const [pinterestAppId, setPinterestAppId] = useState(initialPinterestAppId || '')
    const [pinterestAppSecret, setPinterestAppSecret] = useState(initialPinterestAppSecret || '')
    const [newBoardName, setNewBoardName] = useState('')
    const [isCreatingBoard, setIsCreatingBoard] = useState(false)
    const [loading, setLoading] = useState(false)
    const [isTesting, setIsTesting] = useState(false)
    const [isTestingPinterest, setIsTestingPinterest] = useState(false)
    const [isPublishingPin, setIsPublishingPin] = useState(false)
    const [pinterestDiagResult, setPinterestDiagResult] = useState<any>(null)
    const [pinterestDiagError, setPinterestDiagError] = useState('')
    const [message, setMessage] = useState('')
    const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({})
    const router = useRouter()

    const toggleSecret = (key: string) => {
        setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }))
    }

    async function handleCheckPinterestBoard() {
        setIsTestingPinterest(true)
        setPinterestDiagError('')
        try {
            const res = await fetch('/api/pinterest/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'check_status',
                    tokenOverride: pinterestAccessToken,
                    boardIdOverride: pinterestBoardId
                })
            })
            const data = await res.json()
            if (data.success) {
                setPinterestDiagResult(data)
            } else {
                setPinterestDiagError(data.error || 'Erreur lors du test Pinterest')
            }
        } catch {
            setPinterestDiagError('Erreur réseau lors de la vérification Pinterest.')
        } finally {
            setIsTestingPinterest(false)
        }
    }

    async function handlePublishTestPin() {
        setIsPublishingPin(true)
        setPinterestDiagError('')
        try {
            const res = await fetch('/api/pinterest/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'test_publish',
                    tokenOverride: pinterestAccessToken,
                    boardIdOverride: pinterestBoardId
                })
            })
            const data = await res.json()
            if (data.success) {
                setPinterestDiagResult(data)
            } else {
                setPinterestDiagError(data.error || 'Erreur lors de la publication de test')
            }
        } catch {
            setPinterestDiagError('Erreur réseau lors de la publication de test.')
        } finally {
            setIsPublishingPin(false)
        }
    }

    const [recentPins, setRecentPins] = useState<any[]>([])
    const [isLoadingPins, setIsLoadingPins] = useState(false)

    async function handleFetchRecentPins() {
        setIsLoadingPins(true)
        setPinterestDiagError('')
        try {
            const res = await fetch('/api/pinterest/pins')
            const data = await res.json()
            if (data.success && Array.isArray(data.pins)) {
                setRecentPins(data.pins)
            } else {
                setPinterestDiagError(data.error || 'Impossible de récupérer l’historique des épingles')
            }
        } catch {
            setPinterestDiagError('Erreur réseau lors de la récupération de l’historique.')
        } finally {
            setIsLoadingPins(false)
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setMessage('')

        try {
            const result = await updateMultipleSettings([
                { key: 'n8n_webhook_url', value: webhookUrl, category: 'config', description: 'URL du Webhook n8n' },
                { key: 'n8n_instagram_webhook_url', value: instagramWebhookUrl, category: 'config', description: 'URL du Webhook Instagram' },
                { key: 'facebook_access_token', value: facebookAccessToken, category: 'config', description: 'Facebook Access Token' },
                { key: 'instagram_account_id', value: instagramAccountId, category: 'config', description: 'Instagram Account ID' },
                { key: 'instagram_token', value: instagramToken, category: 'config', description: 'Instagram Token' },
                { key: 'threads_account_id', value: threadsAccountId, category: 'config', description: 'Threads Account ID' },
                { key: 'threads_access_token', value: threadsAccessToken, category: 'config', description: 'Threads Access Token' },
                { key: 'tiktok_access_token', value: tiktokAccessToken, category: 'config', description: 'TikTok Access Token' },
                { key: 'tiktok_creator_id', value: tiktokCreatorId, category: 'config', description: 'TikTok Creator ID' },
                { key: 'tiktok_app_id', value: tiktokAppId, category: 'config', description: 'TikTok App ID' },
                { key: 'tiktok_client_secret', value: tiktokClientSecret, category: 'config', description: 'TikTok Client Secret' },
                { key: 'pinterest_access_token', value: pinterestAccessToken, category: 'config', description: 'Pinterest Access Token' },
                { key: 'pinterest_board_id', value: pinterestBoardId, category: 'config', description: 'Pinterest Board ID' },
                { key: 'pinterest_app_id', value: pinterestAppId, category: 'config', description: 'Pinterest App ID' },
                { key: 'pinterest_app_secret', value: pinterestAppSecret, category: 'config', description: 'Pinterest App Secret' },
            ])
            if (!result.success) {
                throw new Error(result.error || 'Échec de l’enregistrement')
            }
            setMessage('Configuration enregistrée avec succès !')
            router.refresh()
        } catch (error) {
            setMessage('Erreur lors de l\'enregistrement.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {message && (
                <div className={`p-4 rounded-xl text-sm font-medium ${message.includes('succès') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {message}
                </div>
            )}

            {/* --- Général / Automatisation (n8n) --- */}
            <div className="p-6 rounded-2xl border-l-4 border-l-gray-400 border-t border-r border-b border-gray-100 bg-gray-50 shadow-sm space-y-6">
                <h3 className="text-lg font-black text-gray-700 flex items-center gap-2">
                    Automatisation Générale
                </h3>
                
                <div>
                    <label htmlFor="webhookUrl" className="block text-sm font-bold text-gray-900 mb-2">
                        URL du Webhook (n8n)
                    </label>
                    <input
                        type="url"
                        id="webhookUrl"
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder="Ex: https://n8n.votredomaine.com/webhook/..."
                    />
                    <p className="mt-2 text-xs text-gray-500 font-medium">
                        Cette URL sera appelée lors d'événements importants (nouvelle commande, etc.)
                    </p>
                </div>
            </div>

            {/* --- Facebook --- */}
            <div className="p-6 rounded-2xl border-l-4 border-l-[#1877F2] border-t border-r border-b border-gray-100 bg-[#1877F2]/5 shadow-sm space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <h3 className="text-lg font-black text-[#1877F2] flex items-center gap-2">
                        <svg className="w-6 h-6 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                        </svg>
                        Facebook
                    </h3>
                    {facebookAccessToken ? (
                        <span className="text-xs font-bold text-green-700 bg-green-100 px-3 py-1 rounded-full border border-green-200">✅ Connecté</span>
                    ) : (
                        <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">❌ Non connecté</span>
                    )}
                </div>
                
                <div>
                    <label htmlFor="facebookAccessToken" className="block text-sm font-bold text-gray-900 mb-2">
                        Facebook Access Token
                    </label>
                    <div className="relative">
                        <input
                            type={showSecrets['facebookAccessToken'] ? 'text' : 'password'}
                            id="facebookAccessToken"
                            value={facebookAccessToken}
                            onChange={(e) => setFacebookAccessToken(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#1877F2] outline-none transition-all pr-12"
                            placeholder="Entrez le jeton d'accès Facebook..."
                        />
                        <button 
                            type="button" 
                            onClick={() => toggleSecret('facebookAccessToken')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1877F2]"
                        >
                            {showSecrets['facebookAccessToken'] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>
                    <p className="mt-2 text-xs text-gray-500 font-medium">
                        Utilisé pour les automatisations liées à Facebook (Pixel, Conversion API, etc.)
                    </p>
                </div>
            </div>

            {/* --- Instagram --- */}
            <div className="p-6 rounded-2xl border-l-4 border-l-[#E1306C] border-t border-r border-b border-gray-100 bg-gradient-to-r from-[#E1306C]/5 to-[#F56040]/5 shadow-sm space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <h3 className="text-lg font-black text-[#E1306C] flex items-center gap-2">
                        <svg className="w-6 h-6 text-[#E1306C]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                        </svg>
                        Instagram
                    </h3>
                    {instagramToken && instagramAccountId ? (
                        <span className="text-xs font-bold text-green-700 bg-green-100 px-3 py-1 rounded-full border border-green-200">✅ Connecté</span>
                    ) : (
                        <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">❌ Non connecté</span>
                    )}
                </div>
                
                <div>
                    <label htmlFor="instagramWebhookUrl" className="block text-sm font-bold text-gray-900 mb-2">
                        URL du Webhook Instagram (n8n)
                    </label>
                    <input
                        type="url"
                        id="instagramWebhookUrl"
                        value={instagramWebhookUrl}
                        onChange={(e) => setInstagramWebhookUrl(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#E1306C] outline-none transition-all"
                        placeholder="Ex: https://n8n.votredomaine.com/webhook/instagram..."
                    />
                    <p className="mt-2 text-xs text-gray-500 font-medium">
                        Ce webhook sera appelé pour déclencher une publication sur Instagram.
                    </p>
                </div>

                <div>
                    <label htmlFor="instagramAccountId" className="block text-sm font-bold text-gray-900 mb-2">
                        Instagram Account ID (ig_user_id)
                    </label>
                    <input
                        type="text"
                        id="instagramAccountId"
                        value={instagramAccountId}
                        onChange={(e) => setInstagramAccountId(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#E1306C] outline-none transition-all"
                        placeholder="Ex: 17841400000000000"
                    />
                    <p className="mt-2 text-xs text-gray-500 font-medium">
                        L'ID du compte pro Instagram lié à la page Facebook.
                    </p>
                </div>

                <div>
                    <label htmlFor="instagramToken" className="block text-sm font-bold text-gray-900 mb-2">
                        Instagram Token
                    </label>
                    <div className="relative">
                        <input
                            type={showSecrets['instagramToken'] ? 'text' : 'password'}
                            id="instagramToken"
                            value={instagramToken}
                            onChange={(e) => setInstagramToken(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#E1306C] outline-none transition-all pr-12"
                            placeholder="Entrez le jeton Instagram..."
                        />
                        <button 
                            type="button" 
                            onClick={() => toggleSecret('instagramToken')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#E1306C]"
                        >
                            {showSecrets['instagramToken'] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* --- Threads --- */}
            <div className="p-6 rounded-2xl border-l-4 border-l-black border-t border-r border-b border-gray-100 bg-gray-50 shadow-sm space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <h3 className="text-lg font-black text-black flex items-center gap-2">
                        <svg className="w-6 h-6 text-black" viewBox="0 0 192 192" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M141.537 88.9883C140.71 88.5919 139.87 88.2104 139.019 87.8451C137.537 60.5382 122.616 44.905 97.5619 44.745C97.4484 44.7443 97.3355 44.7443 97.222 44.7443C82.2364 44.7443 69.7731 51.1409 62.102 62.7807L75.881 72.2328C81.6116 63.5383 90.6052 61.6848 97.2286 61.6848C97.3051 61.6848 97.3819 61.6848 97.4576 61.6855C105.707 61.7381 111.932 64.1366 115.961 68.814C118.893 72.2193 120.854 76.925 121.825 82.8638C114.511 81.6207 106.601 81.2385 98.145 81.7233C74.3247 83.0954 59.0111 96.9879 60.0396 116.292C60.5615 126.084 65.4397 134.508 73.775 140.011C80.8224 144.663 89.899 146.938 99.3323 146.423C111.79 145.74 121.563 140.987 128.381 132.296C133.559 125.696 136.834 117.143 138.28 106.366C144.217 109.949 148.617 114.664 151.047 120.332C155.179 129.967 155.42 145.8 142.501 158.708C131.182 170.016 117.533 174.908 97.0135 175.059C74.2042 174.89 56.9538 167.575 45.7381 153.317C35.2355 139.966 29.8077 120.682 29.6052 96C29.8077 71.3178 35.2355 52.0336 45.7381 38.6827C56.9538 24.4249 74.2039 17.11 97.0132 16.9405C119.988 17.1113 137.539 24.4614 148.184 38.0189C156.46 48.5853 161.648 64.0414 163.765 83.4795L178.683 81.8797C176.242 59.3995 169.957 41.2721 159.508 27.9731C145.549 10.2269 123.639 0.999656 97.0125 0.999656C96.6575 0.999656 96.3025 1.00282 95.9482 1.00914C66.8665 1.25866 44.595 10.3708 29.7432 29.2818C15.4299 47.509 9.3897 71.218 9.58557 96.0002C9.3897 120.782 15.4299 144.491 29.7432 162.719C44.595 181.63 66.8665 190.741 95.9482 190.991C96.3025 190.997 96.6575 191 97.0125 191C123.834 191 141.528 183.921 154.544 170.92C172.062 153.425 171.745 130.654 166.574 118.571C162.368 108.742 154.269 101.408 141.537 88.9883ZM98.4405 129.507C88.0005 130.095 77.1544 125.409 76.6196 115.372C76.2232 107.93 81.9158 99.626 99.0812 98.6368C101.047 98.5234 102.976 98.468 104.871 98.468C111.106 98.468 116.939 99.0737 122.242 100.233C120.264 124.935 108.662 128.946 98.4405 129.507Z" fill="currentColor"></path>
                        </svg>
                        Threads
                    </h3>
                    {threadsAccessToken ? (
                        <span className="text-xs font-bold text-green-700 bg-green-100 px-3 py-1 rounded-full border border-green-200">✅ Connecté</span>
                    ) : (
                        <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">❌ Non connecté</span>
                    )}
                </div>
                
                <div>
                    <label htmlFor="threadsAccountId" className="block text-sm font-bold text-gray-900 mb-2">
                        Threads Account ID
                    </label>
                    <input
                        type="text"
                        id="threadsAccountId"
                        value={threadsAccountId}
                        onChange={(e) => setThreadsAccountId(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-black outline-none transition-all"
                        placeholder="Ex: 1234567890"
                    />
                </div>

                <div>
                    <label htmlFor="threadsAccessToken" className="block text-sm font-bold text-gray-900 mb-2">
                        Threads Access Token
                    </label>
                    <div className="relative">
                        <input
                            type={showSecrets['threadsAccessToken'] ? 'text' : 'password'}
                            id="threadsAccessToken"
                            value={threadsAccessToken}
                            onChange={(e) => setThreadsAccessToken(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-black outline-none transition-all pr-12"
                            placeholder="Entrez le jeton d'accès Threads..."
                        />
                        <button 
                            type="button" 
                            onClick={() => toggleSecret('threadsAccessToken')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black"
                        >
                            {showSecrets['threadsAccessToken'] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* --- TikTok --- */}
            <div className="p-6 rounded-2xl border-l-4 border-l-[#25F4EE] border-t border-r border-b border-[#FE2C55]/20 bg-[#25F4EE]/5 shadow-sm space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <h3 className="text-lg font-black text-[#FE2C55] flex items-center gap-2">
                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93v7.2c0 1.63-.51 3.25-1.46 4.54-1.25 1.71-3.23 2.75-5.32 2.94-2.12.2-4.28-.27-6.02-1.47-1.74-1.21-2.91-3.05-3.32-5.11-.42-2.12-.04-4.38 1.09-6.22 1.11-1.8 2.87-3.06 4.9-3.55 1.57-.39 3.24-.31 4.75.22v4.06c-.84-.25-1.75-.24-2.6-.04-.84.2-1.59.67-2.14 1.34-.54.67-.84 1.53-.84 2.39 0 1.15.54 2.24 1.44 2.94.9.71 2.08.97 3.2.73 1.12-.24 2.11-.91 2.71-1.88.58-.94.88-2.06.88-3.17V.02z" />
                        </svg>
                        TikTok
                    </h3>
                    {tiktokAccessToken ? (
                        <span className="text-xs font-bold text-green-700 bg-green-100 px-3 py-1 rounded-full border border-green-200">✅ Connecté</span>
                    ) : (
                        <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">❌ Non connecté</span>
                    )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="tiktokAppId" className="block text-sm font-bold text-gray-900 mb-2">
                            TikTok App ID (Client Key)
                        </label>
                        <input
                            type="text"
                            id="tiktokAppId"
                            value={tiktokAppId}
                            onChange={(e) => setTiktokAppId(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#FE2C55] outline-none transition-all"
                            placeholder="Client Key de votre App TikTok"
                        />
                    </div>
                    <div>
                        <label htmlFor="tiktokCreatorId" className="block text-sm font-bold text-gray-900 mb-2">
                            TikTok Creator ID
                        </label>
                        <input
                            type="text"
                            id="tiktokCreatorId"
                            value={tiktokCreatorId}
                            onChange={(e) => setTiktokCreatorId(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#FE2C55] outline-none transition-all"
                            placeholder="Ex: 1234567890"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="tiktokClientSecret" className="block text-sm font-bold text-gray-900 mb-2">
                            TikTok Client Secret
                        </label>
                        <div className="relative">
                            <input
                                type={showSecrets['tiktokClientSecret'] ? 'text' : 'password'}
                                id="tiktokClientSecret"
                                value={tiktokClientSecret}
                                onChange={(e) => setTiktokClientSecret(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#FE2C55] outline-none transition-all pr-12"
                                placeholder="Client Secret"
                            />
                            <button 
                                type="button" 
                                onClick={() => toggleSecret('tiktokClientSecret')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#FE2C55]"
                            >
                                {showSecrets['tiktokClientSecret'] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="tiktokAccessToken" className="block text-sm font-bold text-gray-900 mb-2">
                            TikTok Access Token
                        </label>
                        <div className="relative">
                            <input
                                type={showSecrets['tiktokAccessToken'] ? 'text' : 'password'}
                                id="tiktokAccessToken"
                                value={tiktokAccessToken}
                                onChange={(e) => setTiktokAccessToken(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#FE2C55] outline-none transition-all pr-12"
                                placeholder="Access Token"
                            />
                            <button 
                                type="button" 
                                onClick={() => toggleSecret('tiktokAccessToken')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#FE2C55]"
                            >
                                {showSecrets['tiktokAccessToken'] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 items-center pt-2">
                    <a 
                        href="/api/tiktok/auth"
                        className="px-6 py-3 bg-[#FE2C55] hover:bg-[#e02049] text-white font-bold rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2"
                    >
                        Connecter le compte TikTok
                    </a>
                </div>
            </div>

            {/* --- Pinterest --- */}
            <div className="p-6 rounded-2xl border-l-4 border-l-[#E60023] border-t border-r border-b border-gray-100 bg-[#E60023]/5 shadow-sm space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <h3 className="text-lg font-black text-[#E60023] flex items-center gap-2">
                        <svg className="w-6 h-6 text-[#E60023]" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.367 18.618 0 12.017 0z"/>
                        </svg>
                        Pinterest
                    </h3>
                    {pinterestAccessToken ? (
                        <span className="text-xs font-bold text-green-700 bg-green-100 px-3 py-1 rounded-full border border-green-200">✅ Connecté</span>
                    ) : (
                        <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full border border-gray-200">❌ Non connecté</span>
                    )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="pinterestAppId" className="block text-sm font-bold text-gray-900 mb-2">
                            Pinterest App ID
                        </label>
                        <input
                            type="text"
                            id="pinterestAppId"
                            value={pinterestAppId}
                            onChange={(e) => setPinterestAppId(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#E60023] outline-none transition-all"
                            placeholder="Ex: 1597274"
                        />
                    </div>
                    <div>
                        <label htmlFor="pinterestBoardId" className="block text-sm font-bold text-gray-900 mb-2">
                            Pinterest Board ID
                        </label>
                        <input
                            type="text"
                            id="pinterestBoardId"
                            value={pinterestBoardId}
                            onChange={(e) => setPinterestBoardId(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#E60023] outline-none transition-all"
                            placeholder="Ex: 123456789"
                        />
                        <div className="flex flex-col sm:flex-row gap-2 mt-3 bg-white p-2 rounded-xl border border-red-100 shadow-sm">
                            <input
                                type="text"
                                value={newBoardName}
                                onChange={(e) => setNewBoardName(e.target.value)}
                                className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#E60023] outline-none"
                                placeholder="Nom du nouveau tableau..."
                            />
                            <button
                                type="button"
                                disabled={isCreatingBoard || !newBoardName || !pinterestAccessToken}
                                onClick={async () => {
                                    setIsCreatingBoard(true)
                                    setMessage('')
                                    try {
                                        const res = await fetch('/api/pinterest/board', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ name: newBoardName })
                                        })
                                        const data = await res.json()
                                        if (data.success && data.board) {
                                            setPinterestBoardId(data.board.id)
                                            setNewBoardName('')
                                            setMessage('Tableau Pinterest créé avec succès ! Pensez à enregistrer la page en bas.')
                                        } else {
                                            setMessage('Erreur: ' + (data.error || 'Impossible de créer le tableau'))
                                        }
                                    } catch (e) {
                                        setMessage('Erreur réseau lors de la création du tableau.')
                                    } finally {
                                        setIsCreatingBoard(false)
                                    }
                                }}
                                className="px-4 py-2 bg-gray-900 text-white text-xs uppercase tracking-wide font-bold rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                            >
                                {isCreatingBoard ? 'Création...' : 'Créer'}
                            </button>
                        </div>
                        {!pinterestAccessToken && <p className="text-xs text-red-500 mt-1 font-medium">Nécessite de connecter le compte Pinterest d'abord.</p>}
                    </div>
                </div>

                <div>
                    <label htmlFor="pinterestAccessToken" className="block text-sm font-bold text-gray-900 mb-2">
                        Pinterest Access Token
                    </label>
                    <div className="relative">
                        <input
                            type={showSecrets['pinterestAccessToken'] ? 'text' : 'password'}
                            id="pinterestAccessToken"
                            value={pinterestAccessToken}
                            onChange={(e) => setPinterestAccessToken(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#E60023] outline-none transition-all pr-12"
                            placeholder="Entrez le jeton d'accès Pinterest..."
                        />
                        <button 
                            type="button" 
                            onClick={() => toggleSecret('pinterestAccessToken')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#E60023]"
                        >
                            {showSecrets['pinterestAccessToken'] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
                
                <div>
                    <label htmlFor="pinterestAppSecret" className="block text-sm font-bold text-gray-900 mb-2">
                        Pinterest App Secret
                    </label>
                    <div className="relative">
                        <input
                            type={showSecrets['pinterestAppSecret'] ? 'text' : 'password'}
                            id="pinterestAppSecret"
                            value={pinterestAppSecret}
                            onChange={(e) => setPinterestAppSecret(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#E60023] outline-none transition-all pr-12"
                            placeholder="Entrez l'App Secret..."
                        />
                        <button 
                            type="button" 
                            onClick={() => toggleSecret('pinterestAppSecret')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#E60023]"
                        >
                            {showSecrets['pinterestAppSecret'] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3 items-center pt-2">
                    <a 
                        href="/api/pinterest/auth"
                        className="px-5 py-2.5 bg-[#E60023] hover:bg-[#ad081b] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors shadow flex items-center justify-center gap-2"
                    >
                        Connecter le compte Pinterest
                    </a>
                    <button
                        type="button"
                        onClick={handleCheckPinterestBoard}
                        disabled={isTestingPinterest || !pinterestAccessToken}
                        className="px-4 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isTestingPinterest ? 'animate-spin' : ''}`} />
                        {isTestingPinterest ? 'Vérification...' : 'Tester visibilité & statut'}
                    </button>
                    <button
                        type="button"
                        onClick={handlePublishTestPin}
                        disabled={isPublishingPin || !pinterestAccessToken || !pinterestBoardId}
                        className="px-4 py-2.5 bg-gray-900 hover:bg-black text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <Send className={`w-3.5 h-3.5 ${isPublishingPin ? 'animate-spin' : ''}`} />
                        {isPublishingPin ? 'Publication...' : 'Publier une épingle test'}
                    </button>
                    <button
                        type="button"
                        onClick={handleFetchRecentPins}
                        disabled={isLoadingPins || !pinterestAccessToken || !pinterestBoardId}
                        className="px-4 py-2.5 bg-[#E60023] hover:bg-[#ad081b] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPins ? 'animate-spin' : ''}`} />
                        {isLoadingPins ? 'Chargement...' : 'Historique des épingles'}
                    </button>
                </div>

                {pinterestDiagError && (
                    <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>{pinterestDiagError}</div>
                    </div>
                )}

                {pinterestDiagResult && (
                    <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm space-y-3">
                        <div className="flex items-center justify-between border-b pb-2">
                            <span className="text-xs font-black uppercase text-gray-500 tracking-wider">Diagnostic Pinterest en direct</span>
                            <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Token valide
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                                <span className="text-gray-500 block mb-0.5">Compte connecté</span>
                                <span className="font-bold text-gray-900">@{pinterestDiagResult.userAccount?.username || 'Inconnu'}</span>
                                <span className="text-gray-400 block text-[11px]">Type: {pinterestDiagResult.userAccount?.accountType || 'Standard'}</span>
                            </div>

                            <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                                <span className="text-gray-500 block mb-0.5">Visibilité du Tableau</span>
                                {pinterestDiagResult.board ? (
                                    <div>
                                        <span className="font-bold text-gray-900 block">{pinterestDiagResult.board.name}</span>
                                        {pinterestDiagResult.board.isPublic ? (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded mt-1">
                                                ✅ PUBLIC (Visible par tous & indexable Google)
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded mt-1">
                                                ⚠️ {pinterestDiagResult.board.privacy} (SECRET - Invisible au public)
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    <span className="text-amber-600 font-semibold">Aucun ID de tableau vérifié</span>
                                )}
                            </div>
                        </div>

                        {pinterestDiagResult.publishedPin && (
                            <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-xs text-green-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div>
                                    <span className="font-bold block">Épingle test publiée avec succès ! (ID: {pinterestDiagResult.publishedPin.id})</span>
                                    <span className="text-[11px] text-green-700">{pinterestDiagResult.publishedPin.title}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {pinterestDiagResult.publishedPin.pinUrl && (
                                        <a
                                            href={pinterestDiagResult.publishedPin.pinUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="px-3 py-1 bg-[#E60023] hover:bg-[#ad081b] text-white rounded-lg text-[11px] font-bold shadow-sm"
                                        >
                                            Voir le Pin sur Pinterest ↗
                                        </a>
                                    )}
                                    {pinterestDiagResult.publishedPin.link && (
                                        <a
                                            href={pinterestDiagResult.publishedPin.link}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="underline text-[11px] font-bold text-gray-700"
                                        >
                                            Lien livre
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {recentPins.length > 0 && (
                    <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm space-y-3">
                        <div className="flex items-center justify-between border-b pb-2">
                            <span className="text-xs font-black uppercase text-gray-700 tracking-wider">
                                Historique des épingles publiées ({recentPins.length})
                            </span>
                            <span className="text-[11px] text-gray-400">Vérification en 1 clic</span>
                        </div>
                        <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                            {recentPins.map((pin: any) => (
                                <div key={pin.id} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs hover:bg-gray-50/70 p-2 rounded-xl transition-colors">
                                    <div className="flex items-center gap-3 min-w-0">
                                        {pin.imageUrl ? (
                                            <img src={pin.imageUrl} alt="" className="w-10 h-14 object-cover rounded-lg border border-gray-100 shrink-0 shadow-xs" />
                                        ) : (
                                            <div className="w-10 h-14 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 shrink-0 text-[10px]">Pin</div>
                                        )}
                                        <div className="min-w-0 space-y-1">
                                            <p className="font-bold text-gray-900 truncate">{pin.title}</p>
                                            <p className="text-[10px] text-gray-400 font-mono">ID: {pin.id} • {new Date(pin.createdAt).toLocaleDateString('fr-FR')}</p>
                                            
                                            {/* Métriques d'engagement en direct */}
                                            <div className="flex flex-wrap items-center gap-2 pt-0.5">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-[10px] font-bold border border-blue-100" title="Impressions">
                                                    👁 {pin.metrics?.impressions ?? 0} vues
                                                </span>
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md text-[10px] font-bold border border-amber-100" title="Clics sur l'épingle">
                                                    🖱 {pin.metrics?.pinClicks ?? 0} clics
                                                </span>
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-[10px] font-bold border border-emerald-100" title="Visites vers la boutique">
                                                    🔗 {pin.metrics?.outboundClicks ?? 0} vers site
                                                </span>
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md text-[10px] font-bold border border-purple-100" title="Enregistrements / Saves">
                                                    📌 {pin.metrics?.saves ?? 0} saves
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                                        <a
                                            href={pin.pinUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-3 py-1.5 bg-white border border-[#E60023] text-[#E60023] hover:bg-[#E60023] hover:text-white rounded-lg text-[11px] font-bold transition shadow-xs"
                                        >
                                            Voir l'épingle ↗
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* --- Boutons d'action --- */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button
                    type="submit"
                    disabled={loading || isTesting}
                    className="flex-1 sm:flex-none px-8 py-3 bg-black text-white text-sm font-black uppercase tracking-widest rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
                >
                    <Save className="w-4 h-4" />
                    {loading ? 'Enregistrement...' : 'Enregistrer'}
                </button>
                
            </div>

            {/* --- Guide Global --- */}
            <div className="mt-8 p-6 bg-gray-50 rounded-2xl border border-gray-200">
                <h3 className="text-gray-900 font-bold flex items-center gap-2 mb-4 text-lg">
                    <span className="flex items-center justify-center w-8 h-8 bg-black text-white rounded-full text-sm">?</span>
                    Guide : Comment configurer vos accès ?
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Meta */}
                    <div className="bg-white p-5 rounded-xl border border-blue-100 shadow-sm">
                        <h4 className="font-bold text-[#1877F2] mb-2 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" /></svg>
                            Meta (Facebook / Instagram)
                        </h4>
                        <ul className="space-y-2 text-xs text-gray-600">
                            <li>• Générez un <strong>Page Access Token</strong> depuis le <a href="https://developers.facebook.com/tools/explorer/" className="text-blue-600 underline" target="_blank" rel="noreferrer">Graph API Explorer</a>.</li>
                            <li>• Permissions : <code className="bg-gray-100 px-1 rounded">pages_manage_posts</code>, <code className="bg-gray-100 px-1 rounded">instagram_basic</code>, <code className="bg-gray-100 px-1 rounded">instagram_content_publish</code>.</li>
                            <li>• Prolongez-le en token <strong>longue durée</strong> (60 jours) ou permanent.</li>
                        </ul>
                    </div>

                    {/* TikTok */}
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                        <h4 className="font-bold text-[#FE2C55] mb-2 flex items-center gap-2">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93v7.2c0 1.63-.51 3.25-1.46 4.54-1.25 1.71-3.23 2.75-5.32 2.94-2.12.2-4.28-.27-6.02-1.47-1.74-1.21-2.91-3.05-3.32-5.11-.42-2.12-.04-4.38 1.09-6.22 1.11-1.8 2.87-3.06 4.9-3.55 1.57-.39 3.24-.31 4.75.22v4.06c-.84-.25-1.75-.24-2.6-.04-.84.2-1.59.67-2.14 1.34-.54.67-.84 1.53-.84 2.39 0 1.15.54 2.24 1.44 2.94.9.71 2.08.97 3.2.73 1.12-.24 2.11-.91 2.71-1.88.58-.94.88-2.06.88-3.17V.02z" /></svg>
                            TikTok
                        </h4>
                        <ul className="space-y-2 text-xs text-gray-600">
                            <li>• Créez une application sur <a href="https://developers.tiktok.com/" className="text-blue-600 underline" target="_blank" rel="noreferrer">TikTok for Developers</a>.</li>
                            <li>• Activez l'API de publication (Content Posting API).</li>
                            <li>• Ajoutez <code className="bg-gray-100 px-1 rounded">http://localhost:3000/api/tiktok/callback</code> (ou URL de prod) aux Redirect URIs.</li>
                            <li>• Renseignez l'App ID et le Client Secret puis cliquez sur "Connecter le compte TikTok".</li>
                        </ul>
                    </div>

                    {/* Pinterest */}
                    <div className="bg-white p-5 rounded-xl border border-red-100 shadow-sm">
                        <h4 className="font-bold text-[#E60023] mb-2 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.367 18.618 0 12.017 0z"/></svg>
                            Pinterest
                        </h4>
                        <ul className="space-y-2 text-xs text-gray-600">
                            <li>• Créez une application Standard sur le <a href="https://developers.pinterest.com/apps/" className="text-blue-600 underline" target="_blank" rel="noreferrer">Portail Développeur</a>.</li>
                            <li>• Ajoutez <code className="bg-gray-100 px-1 rounded">http://localhost:3000/api/pinterest/callback</code> (ou URL de prod) aux URIs de redirection.</li>
                            <li>• Cliquez ensuite sur le bouton "Connecter le compte Pinterest".</li>
                        </ul>
                    </div>
                    
                    {/* Threads */}
                    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                        <h4 className="font-bold text-black mb-2 flex items-center gap-2">
                            <svg className="w-4 h-4 text-black" viewBox="0 0 192 192" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M141.537 88.9883C140.71 88.5919 139.87 88.2104 139.019 87.8451C137.537 60.5382 122.616 44.905 97.5619 44.745C97.4484 44.7443 97.3355 44.7443 97.222 44.7443C82.2364 44.7443 69.7731 51.1409 62.102 62.7807L75.881 72.2328C81.6116 63.5383 90.6052 61.6848 97.2286 61.6848C97.3051 61.6848 97.3819 61.6848 97.4576 61.6855C105.707 61.7381 111.932 64.1366 115.961 68.814C118.893 72.2193 120.854 76.925 121.825 82.8638C114.511 81.6207 106.601 81.2385 98.145 81.7233C74.3247 83.0954 59.0111 96.9879 60.0396 116.292C60.5615 126.084 65.4397 134.508 73.775 140.011C80.8224 144.663 89.899 146.938 99.3323 146.423C111.79 145.74 121.563 140.987 128.381 132.296C133.559 125.696 136.834 117.143 138.28 106.366C144.217 109.949 148.617 114.664 151.047 120.332C155.179 129.967 155.42 145.8 142.501 158.708C131.182 170.016 117.533 174.908 97.0135 175.059C74.2042 174.89 56.9538 167.575 45.7381 153.317C35.2355 139.966 29.8077 120.682 29.6052 96C29.8077 71.3178 35.2355 52.0336 45.7381 38.6827C56.9538 24.4249 74.2039 17.11 97.0132 16.9405C119.988 17.1113 137.539 24.4614 148.184 38.0189C156.46 48.5853 161.648 64.0414 163.765 83.4795L178.683 81.8797C176.242 59.3995 169.957 41.2721 159.508 27.9731C145.549 10.2269 123.639 0.999656 97.0125 0.999656C96.6575 0.999656 96.3025 1.00282 95.9482 1.00914C66.8665 1.25866 44.595 10.3708 29.7432 29.2818C15.4299 47.509 9.3897 71.218 9.58557 96.0002C9.3897 120.782 15.4299 144.491 29.7432 162.719C44.595 181.63 66.8665 190.741 95.9482 190.991C96.3025 190.997 96.6575 191 97.0125 191C123.834 191 141.528 183.921 154.544 170.92C172.062 153.425 171.745 130.654 166.574 118.571C162.368 108.742 154.269 101.408 141.537 88.9883ZM98.4405 129.507C88.0005 130.095 77.1544 125.409 76.6196 115.372C76.2232 107.93 81.9158 99.626 99.0812 98.6368C101.047 98.5234 102.976 98.468 104.871 98.468C111.106 98.468 116.939 99.0737 122.242 100.233C120.264 124.935 108.662 128.946 98.4405 129.507Z" fill="currentColor"></path></svg>
                            Threads
                        </h4>
                        <ul className="space-y-2 text-xs text-gray-600">
                            <li>• Threads API est disponible pour tous.</li>
                            <li>• Générez un token via l'espace <a href="https://developers.facebook.com/" className="text-blue-600 underline" target="_blank" rel="noreferrer">Meta for Developers</a> (Produit Threads).</li>
                        </ul>
                    </div>
                </div>
            </div>
        </form>
    )
}
