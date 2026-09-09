'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash, CheckCircle, Circle, Star } from 'lucide-react'

interface EmailItem {
    email: string
    used: boolean
}

interface Props {
    value: string
    onChange: (value: string) => void
}

export default function GoogleReviewsEmailManager({ value, onChange }: Props) {
    const [emails, setEmails] = useState<EmailItem[]>([])
    const [newEmail, setNewEmail] = useState('')

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
            if (!currentList.some(e => e.email === raw)) {
                currentList.push({ email: raw, used: false })
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

    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-8">
            <h2 className="text-2xl font-black text-black mb-6 flex items-center gap-3">
                <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                    <Star className="w-5 h-5 text-yellow-400" />
                </div>
                Emails pour Avis Google (Google Customer Reviews)
            </h2>
            <div className="space-y-4">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ajouter un email (ou coller une liste séparée par des virgules)"
                        className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-black outline-none transition-colors"
                    />
                    <button
                        type="button"
                        onClick={handleAdd}
                        className="px-6 py-3 bg-black text-white font-bold rounded-xl hover:bg-gray-800 transition-colors flex items-center gap-2 shrink-0"
                    >
                        <Plus className="w-4 h-4" />
                        Ajouter
                    </button>
                </div>

                <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50 max-h-96 overflow-y-auto">
                    {emails.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 text-sm">
                            Aucun email configuré. Ajoutez des emails pour passer vos commandes Google Avis.
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-200">
                            {emails.map((item, index) => (
                                <li key={index} className="flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => toggleUsed(index)}
                                            className={`focus:outline-none transition-colors ${item.used ? 'text-green-500' : 'text-gray-300 hover:text-gray-400'}`}
                                            title={item.used ? "Marquer comme non utilisé" : "Marquer comme utilisé"}
                                        >
                                            {item.used ? <CheckCircle className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                                        </button>
                                        <span className={`font-medium ${item.used ? 'text-gray-400 line-through' : 'text-black'}`}>
                                            {item.email}
                                        </span>
                                        {item.used && (
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-green-700 bg-green-100 px-2 py-0.5 rounded-full ml-2">
                                                Utilisé
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeEmail(index)}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Supprimer"
                                    >
                                        <Trash className="w-4 h-4" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                
                <div className="flex gap-4 text-xs font-bold text-gray-500 mt-2">
                    <span>Total : {emails.length}</span>
                    <span>•</span>
                    <span className="text-green-600">Utilisés : {emails.filter(e => e.used).length}</span>
                    <span>•</span>
                    <span className="text-blue-600">Disponibles : {emails.filter(e => !e.used).length}</span>
                </div>
            </div>
        </div>
    )
}
