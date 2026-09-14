'use client'

import { useState, useEffect } from 'react'
import { Bell, Send, Users, CheckCircle, Clock, Loader2, Trash2, Megaphone } from 'lucide-react'

interface Campaign {
    id: string
    title: string
    body: string
    url: string | null
    icon: string | null
    sentAt: string | null
    totalSent: number
    status: string
    createdAt: string
}

export default function PushCampaignsPage() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([])
    const [subscriberCount, setSubscriberCount] = useState(0)
    const [loading, setLoading] = useState(true)
    const [sending, setSending] = useState(false)
    const [form, setForm] = useState({ title: '', body: '', url: '' })
    const [result, setResult] = useState<{ sent?: number; error?: string } | null>(null)

    useEffect(() => {
        fetch('/api/admin/push-campaigns')
            .then(r => r.json())
            .then(data => {
                setCampaigns(data.campaigns || [])
                setSubscriberCount(data.subscriberCount || 0)
                setLoading(false)
            })
    }, [])

    const handleDelete = async (id: string) => {
        if (!confirm("Êtes-vous sûr de vouloir supprimer cette campagne de l'historique ?")) return
        try {
            const res = await fetch(`/api/admin/push-campaigns/${id}`, { method: 'DELETE' })
            if (res.ok) {
                setCampaigns(prev => prev.filter(c => c.id !== id))
            }
        } catch (error) {
            console.error('Erreur lors de la suppression', error)
        }
    }

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.title || !form.body) return

        setSending(true)
        setResult(null)

        try {
            const res = await fetch('/api/admin/push-campaigns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            })
            const data = await res.json()

            if (data.success) {
                setResult({ sent: data.sent })
                setForm({ title: '', body: '', url: '' })
                // Recharger les campagnes
                const fresh = await fetch('/api/admin/push-campaigns').then(r => r.json())
                setCampaigns(fresh.campaigns || [])
                setSubscriberCount(fresh.subscriberCount || 0)
            } else {
                setResult({ error: data.error })
            }
        } catch {
            setResult({ error: 'Erreur réseau' })
        } finally {
            setSending(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center">
                            <Megaphone className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900">Notifications Push</h1>
                            <p className="text-sm text-slate-500">Envoyer des promos à tous les abonnés</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-2">
                        <Users className="w-4 h-4 text-indigo-600" />
                        <span className="text-sm font-black text-indigo-700">{subscriberCount} abonnés</span>
                    </div>
                </div>

                {/* Formulaire d'envoi */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
                    <h2 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                        <Bell className="w-5 h-5 text-indigo-500" />
                        Nouvelle campagne
                    </h2>
                    <form onSubmit={handleSend} className="space-y-4">
                        <div>
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">
                                Titre *
                            </label>
                            <input
                                type="text"
                                value={form.title}
                                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                                placeholder="Ex: 🔥 Promo -20% ce weekend !"
                                maxLength={80}
                                required
                                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                            />
                            <p className="text-right text-[10px] text-slate-400 mt-1">{form.title.length}/80</p>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">
                                Message *
                            </label>
                            <textarea
                                value={form.body}
                                onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
                                placeholder="Ex: Découvrez nos livres en promotion, livraison rapide partout au Maroc."
                                maxLength={200}
                                required
                                rows={3}
                                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent resize-none"
                            />
                            <p className="text-right text-[10px] text-slate-400 mt-1">{form.body.length}/200</p>
                        </div>

                        <div>
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">
                                Lien (optionnel)
                            </label>
                            <input
                                type="url"
                                value={form.url}
                                onChange={e => setForm(p => ({ ...p, url: e.target.value }))}
                                placeholder="https://riwaya.store/fr/livres..."
                                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
                            />
                        </div>

                        {/* Aperçu */}
                        {(form.title || form.body) && (
                            <div className="bg-slate-900 rounded-2xl p-4 flex gap-3">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shrink-0">
                                    <Bell className="w-5 h-5 text-slate-700" />
                                </div>
                                <div>
                                    <p className="text-white text-sm font-black">{form.title || 'Titre...'}</p>
                                    <p className="text-slate-300 text-xs mt-0.5">{form.body || 'Message...'}</p>
                                    <p className="text-slate-500 text-[10px] mt-1">riwaya.store</p>
                                </div>
                            </div>
                        )}

                        {result && (
                            <div className={`rounded-2xl px-4 py-3 text-sm font-bold ${
                                result.error ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
                            }`}>
                                {result.error ? `Erreur : ${result.error}` : `✓ Envoyé à ${result.sent} abonnés`}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={sending || subscriberCount === 0}
                            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black py-4 rounded-2xl transition-all text-sm uppercase tracking-widest"
                        >
                            {sending ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Envoi en cours...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Envoyer à {subscriberCount} abonnés
                                </>
                            )}
                        </button>
                        {subscriberCount === 0 && (
                            <p className="text-center text-xs text-slate-400">Aucun abonné pour l'instant. Le bouton de notification doit être affiché sur le site.</p>
                        )}
                    </form>
                </div>

                {/* Historique */}
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-50">
                        <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-slate-400" />
                            Historique des campagnes
                        </h2>
                    </div>

                    {loading ? (
                        <div className="py-16 flex justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
                        </div>
                    ) : campaigns.length === 0 ? (
                        <div className="py-16 text-center text-slate-400">
                            <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-20" />
                            <p className="text-sm font-medium">Aucune campagne envoyée</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {campaigns.map(c => (
                                <div key={c.id} className="px-6 py-4 flex items-start gap-4">
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                                        c.status === 'SENT' ? 'bg-emerald-100' : 'bg-amber-100'
                                    }`}>
                                        {c.status === 'SENT' ? (
                                            <CheckCircle className="w-4 h-4 text-emerald-600" />
                                        ) : (
                                            <Clock className="w-4 h-4 text-amber-600" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-black text-slate-900 text-sm">{c.title}</p>
                                        <p className="text-slate-500 text-xs mt-0.5 truncate">{c.body}</p>
                                        <div className="flex items-center gap-3 mt-1.5">
                                            <span className="text-[10px] text-slate-400">
                                                {c.sentAt ? new Date(c.sentAt).toLocaleString('fr-FR') : 'En cours...'}
                                            </span>
                                            {c.status === 'SENT' && (
                                                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                                                    {c.totalSent} reçus
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleDelete(c.id)}
                                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors shrink-0"
                                        title="Supprimer"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
