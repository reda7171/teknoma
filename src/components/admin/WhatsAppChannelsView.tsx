'use client'

import { useState } from 'react'
import { ExternalLink, Loader2, Megaphone, RefreshCw, Send } from 'lucide-react'
import { getWahaChannels, sendWahaChannelMessage, type WahaChannel, type WahaSessionItem } from '@/lib/actions/whatsapp-gateway'

interface Props {
    sessions: WahaSessionItem[]
    onShowFeedback: (message: string, type: 'success' | 'error') => void
}

export function WhatsAppChannelsView({ sessions, onShowFeedback }: Props) {
    const workingSessions = sessions.filter(item => item.status === 'WORKING')
    const [session, setSession] = useState(workingSessions[0]?.name || sessions[0]?.name || 'default')
    const [channels, setChannels] = useState<WahaChannel[]>([])
    const [channelId, setChannelId] = useState('')
    const [message, setMessage] = useState('Découvrez les nouveautés Tekno Store 📚\nhttps://tekno.ma/')
    const [isLoading, setIsLoading] = useState(false)
    const [isSending, setIsSending] = useState(false)

    const loadChannels = async () => {
        setIsLoading(true)
        const result = await getWahaChannels(session)
        setIsLoading(false)
        if (!result.success) {
            onShowFeedback(result.error || 'Impossible de charger les chaînes', 'error')
            return
        }
        setChannels(result.channels)
        setChannelId(result.channels[0]?.id || '')
        if (!result.channels.length) onShowFeedback('Aucune chaîne WhatsApp trouvée pour cette session', 'error')
    }

    const handleSessionChange = (nextSession: string) => {
        setSession(nextSession)
        setChannels([])
        setChannelId('')
    }

    const sendMessage = async (event: React.FormEvent) => {
        event.preventDefault()
        if (!channelId) {
            onShowFeedback('Sélectionnez d’abord une chaîne WhatsApp', 'error')
            return
        }
        setIsSending(true)
        const result = await sendWahaChannelMessage(session, channelId, message)
        setIsSending(false)
        onShowFeedback(
            result.success ? 'Message publié dans la chaîne WhatsApp !' : result.error || 'Échec de la publication',
            result.success ? 'success' : 'error'
        )
    }

    return (
        <div className="space-y-6">
            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
                <div className="flex items-center gap-3">
                    <Megaphone className="h-7 w-7 text-emerald-600" />
                    <h2 className="text-2xl font-black text-slate-900">WhatsApp Channels Automation</h2>
                </div>
                <p className="mt-2 text-sm font-medium text-gray-500">
                    Chargez vos chaînes WAHA et publiez directement dans celles que vous administrez.
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <select value={session} onChange={event => handleSessionChange(event.target.value)} className="min-w-56 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500">
                        {(sessions.length ? sessions : [{ name: 'default', status: 'UNKNOWN' }]).map(item => (
                            <option key={item.name} value={item.name}>{item.name} — {item.status}</option>
                        ))}
                    </select>
                    <button type="button" disabled={isLoading} onClick={loadChannels} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white disabled:opacity-60">
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        Charger les chaînes
                    </button>
                </div>
            </div>

            {channels.length > 0 && (
                <div className="grid gap-4 md:grid-cols-2">
                    {channels.map(channel => (
                        <button key={channel.id} type="button" onClick={() => setChannelId(channel.id)} className={`rounded-2xl border p-5 text-left transition ${channelId === channel.id ? 'border-emerald-500 bg-emerald-50' : 'border-gray-100 bg-white hover:border-emerald-200'}`}>
                            <div className="flex items-start justify-between gap-3">
                                <div><p className="font-black text-slate-900">{channel.name}</p><p className="mt-1 break-all text-xs font-mono text-gray-400">{channel.id}</p></div>
                                {channel.role && <span className="rounded-full bg-slate-900 px-2 py-1 text-[10px] font-black text-white">{channel.role}</span>}
                            </div>
                            {channel.description && <p className="mt-3 line-clamp-3 text-sm text-gray-600">{channel.description}</p>}
                            {channel.invite && <a href={channel.invite} target="_blank" rel="noreferrer" onClick={event => event.stopPropagation()} className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-emerald-700">Ouvrir l’invitation <ExternalLink className="h-3 w-3" /></a>}
                        </button>
                    ))}
                </div>
            )}

            <form onSubmit={sendMessage} className="space-y-5 rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
                <label className="block space-y-2">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-700">Chaîne destinataire</span>
                    <select required value={channelId} onChange={event => setChannelId(event.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500">
                        <option value="">Sélectionner une chaîne</option>
                        {channels.map(channel => <option key={channel.id} value={channel.id}>{channel.name}</option>)}
                    </select>
                </label>
                <label className="block space-y-2">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-700">Message</span>
                    <textarea required maxLength={5000} rows={7} value={message} onChange={event => setMessage(event.target.value)} className="w-full resize-y rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-emerald-500" />
                </label>
                <button type="submit" disabled={isSending || !channelId} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3.5 text-sm font-black text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {isSending ? 'Publication...' : 'Publier dans la chaîne'}
                </button>
                <p className="text-xs font-semibold text-amber-700">L’envoi aux chaînes dépend des fonctions API activées dans votre édition WAHA.</p>
            </form>
        </div>
    )
}
