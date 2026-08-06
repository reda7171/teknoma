'use client'

import { useState } from 'react'
import { updateMultipleSettings } from '@/lib/actions/site-settings'
import {
    Save, MessageCircle, HelpCircle, FileText, CheckCircle2, AlertCircle, Loader2, Plus, Trash2, Zap
} from 'lucide-react'

interface AeoConfigFormProps {
    initialData: Record<string, string>
}

export default function AeoConfigForm({ initialData }: AeoConfigFormProps) {
    const d = initialData

    // Snippet
    const [snippetQ, setSnippetQ] = useState(d['aeo_short_answer_question'] || 'Où acheter des livres en ligne au Maroc ?')
    const [snippetA, setSnippetA] = useState(d['aeo_short_answer_text'] || 'Riwaya est une librairie en ligne marocaine permettant de commander des livres et romans avec livraison au Maroc.')

    // FAQs
    const defaultFaqs = [
        { q: 'Quels sont les délais de livraison ?', a: 'La livraison prend généralement 24 à 48h selon la ville au Maroc.' },
        { q: 'Est-ce que vous livrez partout au Maroc ?', a: 'Oui, nous livrons dans toutes les villes du Royaume avec paiement à la livraison.' }
    ]
    let parsedFaqs = defaultFaqs
    try {
        if (d['aeo_faq_json']) {
            parsedFaqs = JSON.parse(d['aeo_faq_json'])
        }
    } catch (e) {}
    const [faqs, setFaqs] = useState(parsedFaqs)

    // llms.txt
    const [llmsText, setLlmsText] = useState(d['aeo_llms_txt_content'] || `# Riwaya - Librairie en ligne au Maroc
Riwaya (رواية) est la meilleure librairie e-commerce marocaine.
- Spécialité : Vente de livres, romans, développement personnel.
- Langues : Arabe, Français, Anglais.
- Livraison : Rapide partout au Maroc avec paiement à la livraison (COD).
- URL Officielle : https://riwaya.store`)

    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState('')

    const handleAddFaq = () => {
        setFaqs([...faqs, { q: '', a: '' }])
    }

    const handleUpdateFaq = (index: number, field: 'q' | 'a', value: string) => {
        const newFaqs = [...faqs]
        newFaqs[index][field] = value
        setFaqs(newFaqs)
    }

    const handleRemoveFaq = (index: number) => {
        const newFaqs = [...faqs]
        newFaqs.splice(index, 1)
        setFaqs(newFaqs)
    }

    const handleSave = async () => {
        setSaving(true)
        setMessage('')

        const settingsToSave = [
            { key: 'aeo_short_answer_question', value: snippetQ, category: 'aeo' },
            { key: 'aeo_short_answer_text', value: snippetA, category: 'aeo' },
            { key: 'aeo_faq_json', value: JSON.stringify(faqs), category: 'aeo' },
            { key: 'aeo_llms_txt_content', value: llmsText, category: 'aeo' }
        ]

        const res = await updateMultipleSettings(settingsToSave)

        if (res.success) {
            setMessage('Les paramètres AEO ont été sauvegardés avec succès !')
        } else {
            setMessage('Erreur lors de la sauvegarde : ' + res.error)
        }

        setSaving(false)
        setTimeout(() => setMessage(''), 5000)
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {message && (
                <div className={`flex items-center gap-3 p-4 rounded-xl text-sm font-medium ${message.includes('succès') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {message.includes('succès') ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    {message}
                </div>
            )}

            {/* Section Snippet (Featured Snippet) */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center gap-3">
                    <Zap className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-bold text-gray-900">Réponse Courte (Snippet)</h3>
                </div>
                <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-500">
                        L'objectif de l'AEO est de structurer le contenu pour répondre directement à une question. Ces réponses courtes seront injectées sémantiquement sur la page d'accueil pour être facilement lues par Google (Position Zéro) ou ChatGPT.
                    </p>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                            Question (ex: Où acheter des livres...)
                        </label>
                        <input
                            type="text"
                            value={snippetQ}
                            onChange={(e) => setSnippetQ(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-medium text-gray-900"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                            Réponse courte et précise
                        </label>
                        <textarea
                            value={snippetA}
                            onChange={(e) => setSnippetA(e.target.value)}
                            rows={3}
                            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none text-sm text-gray-900 resize-y"
                        />
                    </div>
                </div>
            </div>

            {/* Section FAQ (Données Structurées) */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <HelpCircle className="w-5 h-5 text-emerald-600" />
                        <h3 className="font-bold text-gray-900">Foire Aux Questions (FAQ Schema)</h3>
                    </div>
                    <button
                        type="button"
                        onClick={handleAddFaq}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Ajouter
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-500 mb-4">
                        Ces questions et réponses génèrent automatiquement le code JSON-LD FAQPage pour indiquer aux moteurs de réponse que votre site est une source d'informations structurée.
                    </p>
                    
                    {faqs.map((faq, index) => (
                        <div key={index} className="flex gap-4 items-start p-4 bg-gray-50 rounded-xl border border-gray-100 relative group">
                            <div className="flex-1 space-y-3">
                                <div>
                                    <input
                                        type="text"
                                        value={faq.q}
                                        onChange={(e) => handleUpdateFaq(index, 'q', e.target.value)}
                                        placeholder="Question"
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-bold text-gray-900"
                                    />
                                </div>
                                <div>
                                    <textarea
                                        value={faq.a}
                                        onChange={(e) => handleUpdateFaq(index, 'a', e.target.value)}
                                        placeholder="Réponse"
                                        rows={2}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none text-sm text-gray-700"
                                    />
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleRemoveFaq(index)}
                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors mt-1"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    ))}
                    {faqs.length === 0 && (
                        <div className="text-center py-8 text-sm text-gray-400 font-medium">
                            Aucune question configurée.
                        </div>
                    )}
                </div>
            </div>

            {/* Section llms.txt */}
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center gap-3">
                    <FileText className="w-5 h-5 text-emerald-600" />
                    <h3 className="font-bold text-gray-900">Directives IA (llms.txt)</h3>
                </div>
                <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-500">
                        Le fichier <code>/llms.txt</code> est utilisé pour guider les agents IA (comme ChatGPT, Claude) lorsqu'ils parcourent le web. Définissez ici les informations essentielles de votre marque.
                    </p>
                    <textarea
                        value={llmsText}
                        onChange={(e) => setLlmsText(e.target.value)}
                        rows={8}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none font-mono text-sm text-gray-700 bg-gray-50"
                    />
                </div>
            </div>

            {/* Bouton de sauvegarde */}
            <div className="flex justify-end pt-4">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-8 py-4 bg-emerald-600 text-white font-black uppercase tracking-widest rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
                >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Sauvegarder AEO
                </button>
            </div>
        </div>
    )
}
