'use client'

import { useState } from 'react'
import { updateSetting } from '@/lib/actions/site-settings'
import { Save, Send, Webhook, Trash2, Loader2, Sparkles, MessageCircle, Settings, ShieldCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Props {
    initialBotToken: string
    initialChatId: string
    appUrl: string
    initialSettings: {
        notifyOrders: boolean
        notifyCart: boolean
        notifyRegister: boolean
        notifyLowStock: boolean
        notifyDailySummary: boolean
        notifyReviews: boolean
        notifyJumiaPayout: boolean
        notifyInvoices: boolean
        statsVisitors: boolean
        statsRegistrations: boolean
        statsTopViews: boolean
        instagramId: string
        facebookPageId: string
        templateOrder?: string
        templateRegister?: string
        templateReview?: string
        templateLowStock?: string
        templateWhatsapp?: string
    }
}

export default function TelegramConfigForm({ initialBotToken, initialChatId, appUrl, initialSettings }: Props) {
    const [botToken, setBotToken] = useState(initialBotToken)
    const [chatId, setChatId] = useState(initialChatId)
    const [settings, setSettings] = useState(initialSettings)
    const [loading, setLoading] = useState(false)
    const [testLoading, setTestLoading] = useState(false)
    const [webhookLoading, setWebhookLoading] = useState(false)
    const [customAppUrl, setCustomAppUrl] = useState(appUrl)
    const [message, setMessage] = useState('')
    const router = useRouter()

    async function handleSave(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setMessage('')
        try {
            await updateSetting('telegram_bot_token', botToken, 'config', 'Telegram Bot Token')
            await updateSetting('telegram_chat_id', chatId, 'config', 'Telegram Chat ID')
            await updateSetting('telegram_webhook_base_url', customAppUrl, 'config', 'URL Base Webhook Telegram')
            
            // Sauvegarder les paramètres de notification
            await updateSetting('telegram_notify_orders', String(settings.notifyOrders), 'config', 'Notif Commandes')
            await updateSetting('telegram_notify_cart', String(settings.notifyCart), 'config', 'Notif Panier')
            await updateSetting('telegram_notify_register', String(settings.notifyRegister), 'config', 'Notif Inscription')
            await updateSetting('telegram_notify_low_stock', String(settings.notifyLowStock), 'config', 'Notif Stock Faible')
            await updateSetting('telegram_notify_daily_summary', String(settings.notifyDailySummary), 'config', 'Résumé Journalier')
            await updateSetting('telegram_notify_reviews', String(settings.notifyReviews), 'config', 'Notif Avis Clients')
            await updateSetting('telegram_notify_jumia_payout', String(settings.notifyJumiaPayout), 'config', 'Notif Virements Jumia')
            await updateSetting('telegram_notify_invoices', String(settings.notifyInvoices), 'config', 'Notif Factures Saisies')
            await updateSetting('telegram_stats_visitors', String(settings.statsVisitors), 'config', 'Stats Visiteurs (Bilan)')
            await updateSetting('telegram_stats_registrations', String(settings.statsRegistrations), 'config', 'Stats Inscriptions (Bilan)')
            await updateSetting('telegram_stats_top_views', String(settings.statsTopViews), 'config', 'Stats Vues (Bilan)')
            await updateSetting('marketing_instagram_id', settings.instagramId, 'config', 'Instagram Account ID')
            await updateSetting('marketing_facebook_page_id', settings.facebookPageId, 'config', 'Facebook Page ID')

            // Templates
            if (settings.templateOrder !== undefined) await updateSetting('telegram_template_order', settings.templateOrder, 'config', 'Template Commande')
            if (settings.templateRegister !== undefined) await updateSetting('telegram_template_register', settings.templateRegister, 'config', 'Template Inscription')
            if (settings.templateReview !== undefined) await updateSetting('telegram_template_review', settings.templateReview, 'config', 'Template Avis')
            if (settings.templateLowStock !== undefined) await updateSetting('telegram_template_low_stock', settings.templateLowStock, 'config', 'Template Stock')
            if (settings.templateWhatsapp !== undefined) await updateSetting('whatsapp_template_order', settings.templateWhatsapp, 'config', 'Template WhatsApp')

            setMessage('Configuration enregistrée avec succès !')
            router.refresh()
        } catch {
            setMessage('Erreur lors de l\'enregistrement.')
        } finally {
            setLoading(false)
        }
    }

    async function handleTest() {
        setTestLoading(true)
        setMessage('')
        try {
            const res = await fetch('/api/telegram/test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ botToken, chatId })
            })
            const data = await res.json()
            setMessage(data.ok ? '✅ Message de test envoyé sur Telegram !' : `❌ Erreur : ${data.error}`)
        } catch {
            setMessage('❌ Impossible d\'envoyer le message de test.')
        } finally {
            setTestLoading(false)
        }
    }

    async function handleSetWebhook() {
        setWebhookLoading(true)
        setMessage('')
        try {
            const webhookUrl = `${customAppUrl.replace(/\/$/, '')}/api/webhooks/telegram`
            const res = await fetch('/api/telegram/set-webhook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ botToken, webhookUrl })
            })
            const data = await res.json()
            setMessage(data.ok ? `✅ Webhook configuré : ${webhookUrl}` : `❌ Erreur : ${data.error || data.description || 'Réponse invalide du serveur'}`)
        } catch {
            setMessage('❌ Erreur lors de la configuration du webhook.')
        } finally {
            setWebhookLoading(false)
        }
    }

    const isSuccess = message.startsWith('✅') || message.includes('succès')
    const isError = message.startsWith('❌') || message.includes('Erreur')

    return (
        <form onSubmit={handleSave} className="space-y-6">
            {message && (
                <div className={`p-4 rounded-xl text-sm font-medium ${isError ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                    {message}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Colonne Gauche Principale */}
                <div className="lg:col-span-2 space-y-8">
                    
                    {/* Paramètres de Connexion */}
                    <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm space-y-6">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                                <ShieldCheck className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-gray-900 tracking-tight">Connexion Telegram</h2>
                                <p className="text-sm text-gray-400 font-bold">Liez votre bot pour recevoir les notifications</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label htmlFor="botToken" className="block text-sm font-bold text-gray-900 mb-2">Bot Token</label>
                                <input
                                    type="password"
                                    id="botToken"
                                    value={botToken}
                                    onChange={(e) => setBotToken(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    placeholder="123456789:ABCdefGHIjklMNOpqrSTUvwXYz..."
                                />
                                <p className="mt-1 text-xs text-gray-500">Obtenu via @BotFather sur Telegram</p>
                            </div>

                            <div>
                                <label htmlFor="chatId" className="block text-sm font-bold text-gray-900 mb-2">Chat ID</label>
                                <input
                                    type="text"
                                    id="chatId"
                                    value={chatId}
                                    onChange={(e) => setChatId(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    placeholder="-1001234567890"
                                />
                                <p className="mt-1 text-xs text-gray-500">ID du groupe ou channel. Utilisez @userinfobot pour le trouver.</p>
                            </div>

                            <div className="p-5 bg-yellow-50 rounded-2xl border border-yellow-100 mt-4">
                                <label htmlFor="webhookUrl" className="block text-sm font-bold text-yellow-900 mb-2">
                                    URL de base pour Webhook (HTTPS requis)
                                </label>
                                <input
                                    type="text"
                                    id="webhookUrl"
                                    value={customAppUrl}
                                    onChange={(e) => setCustomAppUrl(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-yellow-200 focus:ring-2 focus:ring-yellow-500 outline-none transition-all"
                                    placeholder="https://votre-ngrok.ngrok-free.app"
                                />
                                <p className="mt-2 text-[10px] text-yellow-700 font-bold uppercase italic">
                                    Pour le développement local, utilisez votre URL ngrok ci-dessus.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Notifications actives */}
                    <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center">
                                <Settings className="w-6 h-6 text-gray-700" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-gray-900 tracking-tight">Notifications actives</h2>
                                <p className="text-sm text-gray-400 font-bold">Choisissez ce que vous souhaitez recevoir</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[
                                { id: 'notifyOrders', label: 'Nouvelles commandes', desc: 'Alertes lors d\'une commande client', templateKey: 'templateOrder', templateVars: '{{shortId}}, {{channel}}, {{fullName}}, {{source}}, {{phone}}, {{city}}, {{location}}, {{total}}, {{comment}}, {{itemsList}}, {{ip}}, {{orderUrl}}' },
                                { id: 'notifyRegister', label: 'Nouvelles inscriptions', desc: 'Alertes lors de la création d\'un compte', templateKey: 'templateRegister', templateVars: '{{fullName}}, {{email}}, {{phone}}, {{city}}, {{location}}, {{role}}, {{ip}}, {{date}}' },
                                { id: 'notifyCart', label: 'Ajout au panier', desc: 'Alertes quand un client remplit son panier' },
                                { id: 'notifyReviews', label: 'Avis Clients', desc: 'Modération des avis avec boutons Approuver/Supprimer', templateKey: 'templateReview', templateVars: '{{fullName}}, {{rating}}, {{comment}}' },
                                { id: 'notifyJumiaPayout', label: 'Virements Jumia', desc: 'Alertes pour les nouveaux paiements Jumia saisis' },
                                { id: 'notifyInvoices', label: 'Factures Saisies', desc: 'Alertes quand une facture (livraison, virement) est saisie' },
                                { id: 'notifyLowStock', label: 'Alerte Stock Faible', desc: 'Alertes si un livre passe sous 3 unités', templateKey: 'templateLowStock', templateVars: '{{title}}, {{stock}}' },
                                { id: 'notifyDailySummary', label: 'Résumé Journalier', desc: 'Récapitulatif des ventes chaque soir à 22h' },
                                { id: 'statsVisitors', label: 'Stats: Visiteurs uniques', desc: 'Inclure le trafic dans le /bilan' },
                                { id: 'statsRegistrations', label: 'Stats: Inscriptions', desc: 'Inclure les nouveaux comptes dans le /bilan' },
                                { id: 'statsTopViews', label: 'Stats: Livres les plus vus', desc: 'Inclure le top consultations dans le /bilan' },
                            ].map((item) => (
                                <div key={item.id} className="flex flex-col p-5 bg-gray-50 rounded-2xl border border-gray-100 transition-all hover:bg-white hover:shadow-lg hover:border-blue-100 group">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 pr-6">
                                            <p className="text-[13px] font-black text-gray-900 group-hover:text-blue-600 transition-colors">{item.label}</p>
                                            <p className="text-[11px] text-gray-400 font-bold mt-0.5 leading-tight">{item.desc}</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                className="sr-only peer"
                                                checked={(settings as any)[item.id]}
                                                onChange={(e) => setSettings({ ...settings, [item.id]: e.target.checked })}
                                            />
                                            <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-7 peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all after:shadow-sm"></div>
                                        </label>
                                    </div>
                                    {item.templateKey && (settings as any)[item.id] && (
                                        <div className="mt-4 pt-4 border-t border-gray-200">
                                            <p className="text-[11px] text-gray-500 font-bold mb-2">Variables : {item.templateVars}</p>
                                            <textarea 
                                                value={(settings as any)[item.templateKey] || ''}
                                                onChange={(e) => setSettings({ ...settings, [item.templateKey]: e.target.value })}
                                                className="w-full px-3 py-2 bg-white border border-gray-200 focus:border-blue-500 rounded-xl outline-none font-medium text-gray-800 transition-all min-h-[80px] text-xs"
                                                placeholder={`Template pour ${item.label}`}
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Templates WhatsApp */}
                    <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center">
                                <MessageCircle className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-gray-900 tracking-tight">Templates WhatsApp</h2>
                                <p className="text-sm text-gray-400 font-bold">Personnalisez les messages envoyés aux clients</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[13px] font-black text-gray-900 mb-1">Confirmation Commande (WhatsApp)</label>
                                <p className="text-[11px] text-gray-500 font-bold mb-2">Variables : {"{{fullName}}, {{shortId}}, {{city}}"}</p>
                                <textarea 
                                    value={settings.templateWhatsapp || ''}
                                    onChange={(e) => setSettings({ ...settings, templateWhatsapp: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-green-500 rounded-xl outline-none font-medium text-gray-800 transition-all min-h-[100px] text-sm"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Colonne Droite Actions Rapides & Guides */}
                <div className="lg:col-span-1 space-y-6">
                    
                    {/* Actions collantes */}
                    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm sticky top-6">
                        <h3 className="font-black text-gray-900 mb-4 flex items-center gap-2">
                            Actions Rapides
                        </h3>
                        <div className="flex flex-col gap-3">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full px-6 py-3 bg-black text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Enregistrer
                            </button>

                            <button
                                type="button"
                                onClick={handleTest}
                                disabled={testLoading || !botToken || !chatId}
                                className="w-full px-6 py-3 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {testLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                Tester
                            </button>

                            <button
                                type="button"
                                onClick={handleSetWebhook}
                                disabled={webhookLoading || !botToken}
                                className="w-full px-6 py-3 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {webhookLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Webhook className="w-4 h-4" />}
                                Configurer Webhook
                            </button>
                        </div>
                    </div>

                    {/* Marketing IDs */}
                    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-pink-50 rounded-xl flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-pink-600" />
                            </div>
                            <div>
                                <h3 className="font-black text-gray-900">Marketing IDs</h3>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">Instagram Business ID</label>
                                <input 
                                    type="text" 
                                    value={settings.instagramId}
                                    onChange={(e) => setSettings({ ...settings, instagramId: e.target.value })}
                                    placeholder="Ex: 17841401234567890"
                                    className="w-full px-4 py-2 mt-1 bg-gray-50 border-2 border-transparent focus:border-pink-600 rounded-xl outline-none font-bold text-gray-900 transition-all text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest px-1">Facebook Page ID</label>
                                <input 
                                    type="text" 
                                    value={settings.facebookPageId}
                                    onChange={(e) => setSettings({ ...settings, facebookPageId: e.target.value })}
                                    placeholder="Ex: 102345678901234"
                                    className="w-full px-4 py-2 mt-1 bg-gray-50 border-2 border-transparent focus:border-blue-600 rounded-xl outline-none font-bold text-gray-900 transition-all text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Guide */}
                    <div className="p-6 bg-blue-50/50 rounded-[2rem] border border-blue-100">
                        <h3 className="text-blue-900 font-bold mb-4">Comment configurer le bot ?</h3>
                        <ol className="space-y-3 text-sm text-blue-800/80 list-none">
                            <li className="flex gap-2 items-start"><span className="font-black text-blue-900 mt-0.5">1.</span> <span>Ouvrez Telegram et cherchez <strong>@BotFather</strong></span></li>
                            <li className="flex gap-2 items-start"><span className="font-black text-blue-900 mt-0.5">2.</span> <span>Envoyez <code className="bg-blue-100 px-1 rounded text-blue-900 font-mono text-xs">/newbot</code> et suivez les instructions</span></li>
                            <li className="flex gap-2 items-start"><span className="font-black text-blue-900 mt-0.5">3.</span> <span>Copiez le token fourni et collez-le ci-contre</span></li>
                            <li className="flex gap-2 items-start"><span className="font-black text-blue-900 mt-0.5">4.</span> <span>Ajoutez le bot à votre groupe/channel admin</span></li>
                            <li className="flex gap-2 items-start"><span className="font-black text-blue-900 mt-0.5">5.</span> <span>Utilisez <strong>@userinfobot</strong> pour obtenir le Chat ID</span></li>
                            <li className="flex gap-2 items-start"><span className="font-black text-blue-900 mt-0.5">6.</span> <span>Enregistrez, puis cliquez sur <strong>Configurer Webhook</strong></span></li>
                        </ol>
                    </div>

                </div>
            </div>
        </form>
    )
}
