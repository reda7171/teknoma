'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { MessageCircle, WifiOff, X, Check, Settings, Zap } from 'lucide-react'
import {
    getWhatsAppAvailabilityPrompt,
    heartbeatWhatsAppAvailability,
    setWhatsAppAvailability,
    AgentPresenceItem,
} from '@/lib/actions/whatsapp-presence'

const WHATSAPP_PROMPT_STORAGE_KEY = 'tekno-admin-whatsapp-prompt-last-shown'
const WHATSAPP_PROMPT_INTERVAL_MS = 6 * 60 * 60 * 1000

export default function WhatsAppAvailabilityPopup() {
    const [agents, setAgents] = useState<AgentPresenceItem[]>([])
    const [open, setOpen] = useState(false)
    const [savingId, setSavingId] = useState<string | null>(null)
    const [feedback, setFeedback] = useState<string | null>(null)

    const fetchAgents = useCallback((forceOpen = false) => {
        getWhatsAppAvailabilityPrompt()
            .then(res => {
                if (res?.agents && res.agents.length > 0) {
                    setAgents(res.agents)

                    let shouldOpen = forceOpen
                    if (!forceOpen) {
                        try {
                            const lastShown = Number(window.localStorage.getItem(WHATSAPP_PROMPT_STORAGE_KEY) || 0)
                            shouldOpen = !Number.isFinite(lastShown) || Date.now() - lastShown >= WHATSAPP_PROMPT_INTERVAL_MS
                        } catch {
                            shouldOpen = true
                        }
                    }

                    if (shouldOpen) {
                        setOpen(true)
                        try {
                            window.localStorage.setItem(WHATSAPP_PROMPT_STORAGE_KEY, Date.now().toString())
                        } catch {}
                    }
                }
            })
            .catch(() => {})
    }, [])

    useEffect(() => {
        fetchAgents()

        const handleReopen = () => {
            fetchAgents(true)
        }
        window.addEventListener('open-whatsapp-availability-popup', handleReopen)
        return () => window.removeEventListener('open-whatsapp-availability-popup', handleReopen)
    }, [fetchAgents])

    // Fermeture avec la touche Entrée ou Échap
    useEffect(() => {
        if (!open) return

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === 'Escape') {
                e.preventDefault()
                setOpen(false)
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [open])

    useEffect(() => {
        const onlineAgents = agents.filter(a => a.online)
        if (onlineAgents.length === 0) return
        const interval = window.setInterval(() => {
            onlineAgents.forEach(a => {
                heartbeatWhatsAppAvailability(a.id).catch(() => {})
            })
        }, 60_000)
        return () => window.clearInterval(interval)
    }, [agents])

    const handleToggle = async (agentId: string, online: boolean) => {
        setSavingId(agentId)
        setFeedback(null)
        const res = await setWhatsAppAvailability(agentId, online)
        setSavingId(null)
        if (res.success) {
            setAgents(prev =>
                prev.map(a => (a.id === agentId ? { ...a, online } : a))
            )
            const target = agents.find(a => a.id === agentId)
            const name = target?.name || 'Agent'
            setFeedback(`${name} est maintenant ${online ? 'En ligne' : 'Hors ligne'}`)
            setTimeout(() => setFeedback(null), 3000)
        }
    }

    const handleActivateSolo = async (agentId: string) => {
        setSavingId(agentId)
        setFeedback(null)
        // Mettre cet agent En ligne
        await setWhatsAppAvailability(agentId, true)
        // Mettre tous les autres Hors ligne
        for (const other of agents) {
            if (other.id !== agentId && other.online) {
                await setWhatsAppAvailability(other.id, false)
            }
        }
        setSavingId(null)
        setAgents(prev => prev.map(a => ({ ...a, online: a.id === agentId })))
        const target = agents.find(a => a.id === agentId)
        setFeedback(`${target?.name || agentId} prend le relais : activé sur la boutique`)
        setTimeout(() => setFeedback(null), 3000)
    }

    if (!open || agents.length === 0) return null

    const activeAgent = [...agents]
        .filter(a => a.online)
        .sort((a, b) => a.priority - b.priority)[0]

    return (
        <div
            onClick={(e) => {
                if (e.target === e.currentTarget) setOpen(false)
            }}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
        >
            <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-100">
                <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="absolute top-5 right-5 flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                    aria-label="Fermer"
                >
                    <X className="h-5 w-5" />
                </button>

                <div className="mb-5 flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#25D366]/10">
                        <MessageCircle className="h-7 w-7 text-[#128C7E]" />
                    </div>
                    <div>
                        <p className="text-xs font-black uppercase tracking-widest text-[#128C7E]">Service Client</p>
                        <h2 className="text-2xl font-black text-slate-950">Disponibilité WhatsApp</h2>
                    </div>
                </div>

                <div className="mb-5 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">Actif sur le site :</span>
                    <span className={`text-xs font-black px-3 py-1 rounded-full ${
                        activeAgent ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                    }`}>
                        {activeAgent ? `🟢 ${activeAgent.name} (${activeAgent.phone ? `+${activeAgent.phone}` : 'Standard'})` : '⚪ Aucun (Standard)'}
                    </span>
                </div>

                <p className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                    Cliquez sur &quot;Prendre le relais&quot; ou ajustez la présence :
                </p>

                <div className="space-y-3 mb-6">
                    {agents.map(agent => {
                        const isSaving = savingId === agent.id
                        const isThisActive = activeAgent?.id === agent.id

                        return (
                            <div
                                key={agent.id}
                                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border-2 transition-all ${
                                    isThisActive
                                        ? 'border-emerald-500 bg-emerald-50/50 shadow-sm'
                                        : agent.online
                                        ? 'border-emerald-300 bg-white'
                                        : 'border-slate-200 bg-slate-50/50'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span
                                        className={`w-3 h-3 rounded-full shrink-0 ${
                                            agent.online ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                                        }`}
                                    />
                                    <div>
                                        <p className="text-sm font-black text-slate-900 flex items-center gap-2">
                                            {agent.name}
                                            {isThisActive && (
                                                <span className="text-[10px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-md uppercase">
                                                    En direct
                                                </span>
                                            )}
                                        </p>
                                        <p className="text-xs text-slate-500 font-mono">
                                            {agent.phone ? `+${agent.phone}` : 'Standard'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        disabled={isSaving}
                                        onClick={() => handleActivateSolo(agent.id)}
                                        className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-black transition ${
                                            isThisActive
                                                ? 'bg-emerald-600 text-white shadow-sm'
                                                : 'border border-emerald-600 bg-emerald-50 text-emerald-800 hover:bg-emerald-600 hover:text-white'
                                        }`}
                                        title="Activer cet agent et passer les autres hors ligne"
                                    >
                                        <Zap className="w-3.5 h-3.5" />
                                        Prendre relais
                                    </button>

                                    <button
                                        type="button"
                                        disabled={isSaving}
                                        onClick={() => handleToggle(agent.id, false)}
                                        className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-black transition ${
                                            !agent.online
                                                ? 'bg-slate-800 text-white'
                                                : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-800 hover:text-slate-900'
                                        }`}
                                    >
                                        <WifiOff className="w-3.5 h-3.5" />
                                        Hors ligne
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {feedback && (
                    <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-100/70 p-3 text-xs font-bold text-emerald-800 animate-in fade-in">
                        <Check className="h-4 w-4 shrink-0 text-emerald-700" />
                        <span>{feedback}</span>
                    </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <Link
                        href="/fr/admin/settings?tab=advanced"
                        onClick={() => setOpen(false)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-black transition"
                    >
                        <Settings className="w-3.5 h-3.5" />
                        Paramétrer les numéros
                    </Link>

                    <button
                        type="button"
                        autoFocus
                        onClick={() => setOpen(false)}
                        className="rounded-xl bg-black px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white hover:bg-slate-800 transition"
                    >
                        Terminer
                    </button>
                </div>
            </div>
        </div>
    )
}
