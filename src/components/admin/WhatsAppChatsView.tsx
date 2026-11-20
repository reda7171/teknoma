'use client'

import { useState } from 'react'
import { Archive, CheckCheck, ChevronLeft, ChevronRight, Eye, ImageIcon, Inbox, Loader2, MessageCircle, Pencil, Pin, PinOff, RefreshCw, Search, Trash2 } from 'lucide-react'
import {
    getWahaChatMessage,
    getWahaChatMessages,
    getWahaChatPicture,
    getWahaChats,
    getWahaChatsOverviewByIds,
    runWahaChatAction,
    runWahaMessageAction,
    type WahaChatMessage,
    type WahaChatSummary,
    type WahaSessionItem
} from '@/lib/actions/whatsapp-gateway'

interface Props {
    sessions: WahaSessionItem[]
    onShowFeedback: (message: string, type: 'success' | 'error') => void
}

function formatTimestamp(timestamp?: number) {
    if (!timestamp) return ''
    return new Intl.DateTimeFormat('fr-MA', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(timestamp * 1000))
}

export function WhatsAppChatsView({ sessions, onShowFeedback }: Props) {
    const working = sessions.filter(item => item.status === 'WORKING')
    const [session, setSession] = useState(working[0]?.name || sessions[0]?.name || 'default')
    const [mode, setMode] = useState<'overview' | 'all'>('overview')
    const [chats, setChats] = useState<WahaChatSummary[]>([])
    const [selectedChat, setSelectedChat] = useState<WahaChatSummary | null>(null)
    const [messages, setMessages] = useState<WahaChatMessage[]>([])
    const [chatOffset, setChatOffset] = useState(0)
    const [messageOffset, setMessageOffset] = useState(0)
    const [idsInput, setIdsInput] = useState('')
    const [pictureUrl, setPictureUrl] = useState<string | null>(null)
    const [detail, setDetail] = useState<WahaChatMessage | null>(null)
    const [isLoadingChats, setIsLoadingChats] = useState(false)
    const [isLoadingMessages, setIsLoadingMessages] = useState(false)
    const [busyId, setBusyId] = useState('')
    const pageSize = 30

    const notifyResult = (success: boolean, error: string | undefined, successMessage: string) => {
        onShowFeedback(success ? successMessage : error || 'Action WAHA échouée', success ? 'success' : 'error')
    }

    const loadChats = async (offset = chatOffset) => {
        setIsLoadingChats(true)
        const result = await getWahaChats(session, mode, pageSize, offset)
        setIsLoadingChats(false)
        if (!result.success) return onShowFeedback(result.error || 'Chargement impossible', 'error')
        setChats(result.chats)
        setChatOffset(offset)
        if (selectedChat && !result.chats.some(chat => chat.id === selectedChat.id)) {
            setSelectedChat(null)
            setMessages([])
        }
    }

    const loadByIds = async () => {
        const ids = idsInput.split(/[\n,;]/).map(value => value.trim()).filter(Boolean)
        setIsLoadingChats(true)
        const result = await getWahaChatsOverviewByIds(session, ids)
        setIsLoadingChats(false)
        if (!result.success) return onShowFeedback(result.error || 'Recherche impossible', 'error')
        setChats(result.chats)
        setChatOffset(0)
    }

    const loadMessages = async (chat: WahaChatSummary, offset = 0) => {
        setSelectedChat(chat)
        setPictureUrl(chat.picture || null)
        setDetail(null)
        setIsLoadingMessages(true)
        const result = await getWahaChatMessages(session, chat.id, pageSize, offset)
        setIsLoadingMessages(false)
        if (!result.success) return onShowFeedback(result.error || 'Messages indisponibles', 'error')
        setMessages(result.messages)
        setMessageOffset(offset)
    }

    const runChatAction = async (action: 'delete' | 'clear' | 'read' | 'archive' | 'unarchive' | 'unread') => {
        if (!selectedChat) return
        if ((action === 'delete' || action === 'clear') && !confirm(action === 'delete' ? 'Supprimer définitivement ce chat ?' : 'Effacer définitivement tous les messages de ce chat ?')) return
        setBusyId(`chat-${action}`)
        const result = await runWahaChatAction(session, selectedChat.id, action)
        setBusyId('')
        notifyResult(result.success, result.error, 'Action appliquée au chat')
        if (!result.success) return
        if (action === 'delete') {
            setChats(current => current.filter(chat => chat.id !== selectedChat.id))
            setSelectedChat(null)
            setMessages([])
        } else if (action === 'clear') setMessages([])
        else await loadChats(chatOffset)
    }

    const loadPicture = async () => {
        if (!selectedChat) return
        setBusyId('picture')
        const result = await getWahaChatPicture(session, selectedChat.id)
        setBusyId('')
        if (result.success) setPictureUrl(result.url || null)
        notifyResult(result.success, result.error, result.url ? 'Photo chargée' : 'Aucune photo disponible')
    }

    const inspectMessage = async (messageId: string) => {
        if (!selectedChat) return
        setBusyId(`detail-${messageId}`)
        const result = await getWahaChatMessage(session, selectedChat.id, messageId)
        setBusyId('')
        if (result.success) setDetail(result.message || null)
        notifyResult(result.success, result.error, 'Détails du message chargés')
    }

    const runMessageAction = async (message: WahaChatMessage, action: 'delete' | 'edit' | 'pin' | 'unpin') => {
        if (!selectedChat) return
        let value: string | number | undefined
        if (action === 'delete' && !confirm('Supprimer définitivement ce message ?')) return
        if (action === 'edit') {
            const edited = prompt('Nouveau texte du message :', message.body || '')
            if (edited === null) return
            value = edited
        }
        if (action === 'pin') {
            const duration = prompt('Durée : 86400 (24h), 604800 (7j) ou 2592000 (30j)', '86400')
            if (duration === null) return
            value = Number(duration)
        }
        setBusyId(`${action}-${message.id}`)
        const result = await runWahaMessageAction(session, selectedChat.id, message.id, action, value)
        setBusyId('')
        notifyResult(result.success, result.error, 'Action appliquée au message')
        if (result.success) await loadMessages(selectedChat, messageOffset)
    }

    const resetForSession = (value: string) => {
        setSession(value); setChats([]); setSelectedChat(null); setMessages([]); setChatOffset(0); setMessageOffset(0)
    }

    return (
        <div className="space-y-6">
            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
                <div className="flex items-center gap-3"><MessageCircle className="h-7 w-7 text-emerald-600" /><h2 className="text-2xl font-black text-slate-900">Gestion des chats WAHA</h2></div>
                <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
                    <select value={session} onChange={event => resetForSession(event.target.value)} className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold">
                        {(sessions.length ? sessions : [{ name: 'default', status: 'UNKNOWN' }]).map(item => <option key={item.name} value={item.name}>{item.name} — {item.status}</option>)}
                    </select>
                    <select value={mode} onChange={event => setMode(event.target.value as 'overview' | 'all')} className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold">
                        <option value="overview">Aperçu trié par dernier message</option><option value="all">Tous les chats (brut)</option>
                    </select>
                    <button type="button" disabled={isLoadingChats} onClick={() => loadChats(0)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white disabled:opacity-60">{isLoadingChats ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Charger</button>
                </div>
                <div className="mt-3 flex gap-2">
                    <input value={idsInput} onChange={event => setIdsInput(event.target.value)} placeholder="IDs séparés par virgule : 2126...@c.us" className="min-w-0 flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm" />
                    <button type="button" onClick={loadByIds} disabled={isLoadingChats} title="Aperçu via POST" className="rounded-xl border border-gray-200 px-4 text-slate-700"><Search className="h-4 w-4" /></button>
                </div>
            </div>

            <div className="grid min-h-[520px] gap-5 lg:grid-cols-[340px_1fr]">
                <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b p-4"><strong className="text-sm">Chats ({chats.length})</strong><div className="flex gap-1"><button disabled={chatOffset === 0} onClick={() => loadChats(Math.max(0, chatOffset - pageSize))} className="rounded-lg p-2 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button><button disabled={chats.length < pageSize} onClick={() => loadChats(chatOffset + pageSize)} className="rounded-lg p-2 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button></div></div>
                    <div className="max-h-[650px] overflow-y-auto">
                        {chats.map(chat => <button key={chat.id} type="button" onClick={() => loadMessages(chat)} className={`block w-full border-b p-4 text-left ${selectedChat?.id === chat.id ? 'bg-emerald-50' : 'hover:bg-gray-50'}`}><div className="flex justify-between gap-2"><span className="truncate font-black text-slate-900">{chat.name || chat.id}</span>{Boolean(chat.unreadCount) && <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white">{chat.unreadCount}</span>}</div><p className="mt-1 truncate text-xs text-gray-500">{chat.lastMessage?.body || chat.id}</p><p className="mt-1 text-[10px] text-gray-400">{formatTimestamp(chat.lastMessage?.timestamp)}</p></button>)}
                        {!chats.length && <p className="p-8 text-center text-sm text-gray-400">Chargez les chats de la session.</p>}
                    </div>
                </div>

                <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
                    {!selectedChat ? <div className="flex h-full min-h-96 items-center justify-center text-gray-400"><div className="text-center"><Inbox className="mx-auto mb-3 h-10 w-10" /><p className="font-bold">Sélectionnez un chat</p></div></div> : <>
                        <div className="border-b p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3">{pictureUrl && <span aria-label="Photo du chat" className="h-12 w-12 rounded-full bg-cover bg-center" style={{ backgroundImage: `url(${JSON.stringify(pictureUrl).slice(1, -1)})` }} />}<div><h3 className="font-black text-slate-900">{selectedChat.name || selectedChat.id}</h3><p className="text-xs text-gray-400">{selectedChat.id}</p></div></div><button onClick={loadPicture} disabled={busyId === 'picture'} className="rounded-lg border p-2" title="Charger la photo"><ImageIcon className="h-4 w-4" /></button></div>
                            <div className="mt-4 flex flex-wrap gap-2">
                                <button onClick={() => runChatAction('read')} className="action-chat"><CheckCheck className="h-4 w-4" /> Lu</button><button onClick={() => runChatAction('unread')} className="action-chat"><Eye className="h-4 w-4" /> Non lu</button><button onClick={() => runChatAction('archive')} className="action-chat"><Archive className="h-4 w-4" /> Archiver</button><button onClick={() => runChatAction('unarchive')} className="action-chat"><Inbox className="h-4 w-4" /> Désarchiver</button><button onClick={() => runChatAction('clear')} className="action-chat text-amber-700"><Trash2 className="h-4 w-4" /> Vider</button><button onClick={() => runChatAction('delete')} className="action-chat text-red-700"><Trash2 className="h-4 w-4" /> Supprimer</button>
                            </div>
                        </div>
                        <div className="max-h-[520px] space-y-3 overflow-y-auto bg-gray-50 p-5">
                            {isLoadingMessages && <Loader2 className="mx-auto h-6 w-6 animate-spin text-emerald-600" />}
                            {!isLoadingMessages && messages.map(message => <div key={message.id} className={`max-w-[90%] rounded-2xl p-4 shadow-sm ${message.fromMe ? 'ml-auto bg-emerald-100' : 'bg-white'}`}><p className="whitespace-pre-wrap break-words text-sm text-slate-800">{message.body || (message.hasMedia ? '📎 Média' : 'Message sans texte')}</p><div className="mt-2 flex flex-wrap items-center gap-1 text-[10px] text-gray-400"><span>{formatTimestamp(message.timestamp)}</span>{message.ackName && <span>· {message.ackName}</span>}<button onClick={() => inspectMessage(message.id)} className="ml-auto p-1" title="Détails"><Eye className="h-3 w-3" /></button><button onClick={() => runMessageAction(message, 'edit')} className="p-1" title="Modifier"><Pencil className="h-3 w-3" /></button><button onClick={() => runMessageAction(message, 'pin')} className="p-1" title="Épingler"><Pin className="h-3 w-3" /></button><button onClick={() => runMessageAction(message, 'unpin')} className="p-1" title="Désépingler"><PinOff className="h-3 w-3" /></button><button onClick={() => runMessageAction(message, 'delete')} className="p-1 text-red-600" title="Supprimer"><Trash2 className="h-3 w-3" /></button></div></div>)}
                            {!isLoadingMessages && !messages.length && <p className="py-12 text-center text-sm text-gray-400">Aucun message.</p>}
                        </div>
                        <div className="flex justify-between border-t p-3"><button disabled={messageOffset === 0} onClick={() => loadMessages(selectedChat, Math.max(0, messageOffset - pageSize))} className="action-chat disabled:opacity-30"><ChevronLeft className="h-4 w-4" /> Précédents</button><button disabled={messages.length < pageSize} onClick={() => loadMessages(selectedChat, messageOffset + pageSize)} className="action-chat disabled:opacity-30">Suivants <ChevronRight className="h-4 w-4" /></button></div>
                        {detail && <pre className="max-h-56 overflow-auto border-t bg-slate-950 p-4 text-xs text-emerald-300">{JSON.stringify(detail, null, 2)}</pre>}
                    </>}
                </div>
            </div>
            <style jsx>{`.action-chat{display:inline-flex;align-items:center;gap:.35rem;border:1px solid #e5e7eb;border-radius:.6rem;padding:.45rem .65rem;font-size:.7rem;font-weight:800;background:white}`}</style>
        </div>
    )
}
