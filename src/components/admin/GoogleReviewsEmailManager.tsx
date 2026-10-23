'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash, CheckCircle, Circle, Star, RefreshCw, Users, Check, AlertCircle, Loader2 } from 'lucide-react'
import { syncGmailReadersToGoogleReviews } from '@/lib/actions/site-settings'

interface EmailItem {
    email: string
    used: boolean
    source?: string
}

interface Props {
    value: string
    onChange: (value: string) => void
}

export default function GoogleReviewsEmailManager({ value, onChange }: Props) {
    const [emails, setEmails] = useState<EmailItem[]>([])
    const [newEmail, setNewEmail] = useState('')
    const [syncing, setSyncing] = useState(false)
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
    const [filter, setFilter] = useState<'all' | 'available' | 'used'>('all')

    useEffect(() => {
        try {
            if (value) {
                setEmails(JSON.parse(value))
            }
        } catch (e) {
            console.error("Failed to parse emails", e)
            setEmails([])
        }
    }, [value])

    const updateValue = (newList: EmailItem[]) => {
        onChange(JSON.stringify(newList))
    }

    const handleAdd = () => {
        if (!newEmail.trim()) return
        
        // Split by comma or newline in case they paste a list
        const rawEmails = newEmail.split(/[\n,]+/).map(e => e.trim()).filter(e => e)
        
        const currentList = [...emails]
        for (const raw of rawEmails) {
            if (!currentList.some(e => e.email.toLowerCase() === raw.toLowerCase())) {
                currentList.push({ email: raw.toLowerCase(), used: false, source: 'manual' })
            }
        }
        
        setEmails(currentList)
        updateValue(currentList)
        setNewEmail('')
    }

    const toggleUsed = (index: number) => {
        const newList = [...emails]
        newList[index].used = !newList[index].used
        setEmails(newList)
        updateValue(newList)
    }

    const removeEmail = (index: number) => {
        const newList = [...emails]
        newList.splice(index, 1)
        setEmails(newList)
        updateValue(newList)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            handleAdd()
        }
    }

    const handleSyncGmailReaders = async () => {
        setSyncing(true)
        setFeedback(null)
        try {
            const res = await syncGmailReadersToGoogleReviews()
            if (res.success && res.emails) {
                setEmails(res.emails)
                updateValue(res.emails)
                setFeedback({
                    type: 'success',
                    text: res.addedCount > 0
                        ? `+${res.addedCount} email(s) de lecteurs Gmail ajoutés ! Total : ${res.totalCount} (${res.availableCount} disponibles)`
                        : `Tous les lecteurs Gmail (${res.totalCount}) sont déjà synchronisés.`
                })
            } else {
                setFeedback({
                    type: 'error',
                    text: res.error || 'Erreur lors de la synchronisation des lecteurs'
                })
            }
        } catch (err: any) {
            setFeedback({
                type: 'error',
                text: err?.message || 'Erreur réseau lors de la synchronisation'
            })
        } finally {
            setSyncing(false)
            setTimeout(() => setFeedback(null), 5000)
        }
    }

    const filteredEmails = emails.filter(item => {
        if (filter === 'available') return !item.used
        if (filter === 'used') return item.used
        return true
    })

    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h2 className="text-xl sm:text-2xl font-black text-black flex items-center gap-3">
                    <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                        <Star className="w-5 h-5 text-yellow-400" />
                    </div>
                    Emails pour Avis Google (Google Customer Reviews)
                </h2>

                <button
                    type="button"
                    onClick={handleSyncGmailReaders}
                    disabled={syncing}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all shadow-sm disabled:opacity-50"
                >
                    {syncing ? (
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : (
                        <Users className="w-4 h-4 text-emerald-400" />
                    )}
                    <span>Synchroniser les lecteurs Gmail</span>
                </button>
            </div>

            <p className="text-xs text-gray-500 mb-6">
                Ces emails sont utilisés automatiquement lors des commandes pour déclencher les enquêtes de satisfaction Google Customer Reviews. Les lecteurs qui se connectent avec Google ou s'inscrivent avec Gmail sont ajoutés automatiquement.
            </p>

            {feedback && (
                <div className={`mb-4 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 ${feedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-red-50 text-red-800 border border-red-100'}`}>
                    {feedback.type === 'success' ? <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />}
                    <span>{feedback.text}</span>
                </div>
            )}

            <div className="space-y-4">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ajouter un email (ou coller une liste séparée par des virgules)"
                        className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-black outline-none transition-colors text-sm"
                    />
                    <button
                        type="button"
                        onClick={handleAdd}
                        className="px-6 py-3 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-colors flex items-center gap-2 shrink-0 text-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Ajouter
                    </button>
                </div>

                <div className="flex items-center justify-between text-xs font-bold text-gray-500 pt-1">
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setFilter('all')}
                            className={`px-2.5 py-1 rounded-lg transition-colors ${filter === 'all' ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            Tous ({emails.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilter('available')}
                            className={`px-2.5 py-1 rounded-lg transition-colors ${filter === 'available' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                        >
                            Disponibles ({emails.filter(e => !e.used).length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilter('used')}
                            className={`px-2.5 py-1 rounded-lg transition-colors ${filter === 'used' ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                        >
                            Utilisés ({emails.filter(e => e.used).length})
                        </button>
                    </div>
                </div>

                <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50 max-h-96 overflow-y-auto">
                    {filteredEmails.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 text-sm">
                            {emails.length === 0
                                ? "Aucun email configuré. Cliquez sur 'Synchroniser les lecteurs Gmail' pour importer automatiquement vos lecteurs."
                                : "Aucun email ne correspond au filtre sélectionné."}
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-200">
                            {filteredEmails.map((item, index) => {
                                const realIndex = emails.findIndex(e => e.email === item.email)
                                const isGmail = item.email.toLowerCase().endsWith('@gmail.com') || item.email.toLowerCase().endsWith('@googlemail.com')
                                return (
                                    <li key={item.email} className="flex items-center justify-between p-3.5 bg-white hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() => toggleUsed(realIndex)}
                                                className={`focus:outline-none transition-colors ${item.used ? 'text-emerald-500' : 'text-gray-300 hover:text-gray-400'}`}
                                                title={item.used ? "Marquer comme non utilisé" : "Marquer comme utilisé"}
                                            >
                                                {item.used ? <CheckCircle className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                                            </button>
                                            <span className={`text-sm font-medium ${item.used ? 'text-gray-400 line-through' : 'text-black'}`}>
                                                {item.email}
                                            </span>
                                            {isGmail && (
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                                                    Gmail
                                                </span>
                                            )}
                                            {item.used && (
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                                    Utilisé
                                                </span>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeEmail(realIndex)}
                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Supprimer"
                                        >
                                            <Trash className="w-4 h-4" />
                                        </button>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    )
}
