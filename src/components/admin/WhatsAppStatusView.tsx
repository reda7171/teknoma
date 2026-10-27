'use client'

import { useState } from 'react'
import { ImageIcon, Loader2, MessageSquareText, Send, Video } from 'lucide-react'
import {
    sendWahaStatus,
    type WahaSessionItem,
    type WahaStatusType
} from '@/lib/actions/whatsapp-gateway'

interface Props {
    sessions: WahaSessionItem[]
    onShowFeedback: (message: string, type: 'success' | 'error') => void
}

const STATUS_TYPES: Array<{ type: WahaStatusType; label: string; icon: typeof MessageSquareText }> = [
    { type: 'text', label: 'Texte', icon: MessageSquareText },
    { type: 'image', label: 'Image', icon: ImageIcon },
    { type: 'video', label: 'Vidéo', icon: Video }
]

export function WhatsAppStatusView({ sessions, onShowFeedback }: Props) {
    const workingSessions = sessions.filter(session => session.status === 'WORKING')
    const [session, setSession] = useState(workingSessions[0]?.name || sessions[0]?.name || 'default')
    const [type, setType] = useState<WahaStatusType>('text')
    const [text, setText] = useState('Découvrez nos nouveautés sur https://riwaya.store/')
    const [fileUrl, setFileUrl] = useState('')
    const [caption, setCaption] = useState('Découvrez nos nouveautés chez Riwaya 📚')
    const [backgroundColor, setBackgroundColor] = useState('#38b42f')
    const [font, setFont] = useState(1)
    const [isSending, setIsSending] = useState(false)

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault()
        setIsSending(true)
        try {
            const result = await sendWahaStatus(session, type, {
                text,
                fileUrl,
                caption,
                backgroundColor,
                font
            })
            onShowFeedback(
                result.success ? 'Statut WhatsApp publié avec succès !' : result.error || 'Échec de la publication',
                result.success ? 'success' : 'error'
            )
            if (result.success && type !== 'text') setFileUrl('')
        } catch {
            onShowFeedback('Erreur de communication pendant la publication', 'error')
        } finally {
            setIsSending(false)
        }
    }

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-7">
            <div>
                <h2 className="text-2xl font-black text-slate-900">WhatsApp Status Automation</h2>
                <p className="mt-2 text-sm font-medium text-gray-500">
                    Publiez un statut texte, image ou vidéo depuis une session WAHA connectée.
                </p>
            </div>

            <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-gray-100">
                {STATUS_TYPES.map(({ type: itemType, label, icon: Icon }) => (
                    <button
                        key={itemType}
                        type="button"
                        onClick={() => setType(itemType)}
                        className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-xs font-black uppercase tracking-wider transition ${
                            type === itemType ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-slate-900'
                        }`}
                    >
                        <Icon className="h-4 w-4" />
                        {label}
                    </button>
                ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                <label className="block space-y-2">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-700">Session WAHA</span>
                    <select
                        value={session}
                        onChange={event => setSession(event.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500"
                    >
                        {(sessions.length ? sessions : [{ name: 'default', status: 'UNKNOWN' }]).map(item => (
                            <option key={item.name} value={item.name}>
                                {item.name} — {item.status}
                            </option>
                        ))}
                    </select>
                </label>

                {type === 'text' ? (
                    <label className="block space-y-2">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-700">Texte du statut</span>
                        <textarea
                            required
                            value={text}
                            onChange={event => setText(event.target.value)}
                            rows={6}
                            maxLength={5000}
                            className="w-full resize-y rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                        />
                    </label>
                ) : (
                    <>
                        <label className="block space-y-2">
                            <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                                URL publique {type === 'image' ? 'de l’image' : 'de la vidéo'}
                            </span>
                            <input
                                required
                                type="url"
                                value={fileUrl}
                                onChange={event => setFileUrl(event.target.value)}
                                placeholder={type === 'image' ? 'https://exemple.com/image.jpg' : 'https://exemple.com/video.mp4'}
                                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                            />
                            <span className="block text-xs text-gray-400">Le fichier doit être accessible publiquement par WAHA.</span>
                        </label>
                        {type === 'image' && (
                            <label className="block space-y-2">
                                <span className="text-xs font-black uppercase tracking-wider text-slate-700">Légende</span>
                                <textarea
                                    value={caption}
                                    onChange={event => setCaption(event.target.value)}
                                    rows={3}
                                    className="w-full resize-y rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-emerald-500"
                                />
                            </label>
                        )}
                    </>
                )}

                {(type === 'text' || type === 'video') && (
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="space-y-2">
                            <span className="block text-xs font-black uppercase tracking-wider text-slate-700">Couleur de fond</span>
                            <div className="flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-2">
                                <input
                                    type="color"
                                    value={backgroundColor}
                                    onChange={event => setBackgroundColor(event.target.value)}
                                    className="h-9 w-12 cursor-pointer border-0 bg-transparent"
                                />
                                <span className="text-sm font-mono font-bold text-gray-600">{backgroundColor}</span>
                            </div>
                        </label>
                        {type === 'text' && (
                            <label className="space-y-2">
                                <span className="block text-xs font-black uppercase tracking-wider text-slate-700">Police WAHA</span>
                                <select
                                    value={font}
                                    onChange={event => setFont(Number(event.target.value))}
                                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-emerald-500"
                                >
                                    {[0, 1, 2, 3, 4, 5].map(value => <option key={value} value={value}>Police {value}</option>)}
                                </select>
                            </label>
                        )}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isSending}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3.5 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                >
                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {isSending ? 'Publication...' : `Publier le statut ${type}`}
                </button>
            </form>

            {(type === 'image' || type === 'video') && (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
                    L’envoi {type} dépend de l’édition et des fonctionnalités activées sur votre serveur WAHA.
                </p>
            )}
        </div>
    )
}
