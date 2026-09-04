'use client'

import { useState } from 'react'
import { createQuote, updateQuote, deleteQuote } from '@/lib/actions/quotes'
import { Plus, Edit2, Trash2, Search, Quote as QuoteIcon, CheckCircle, X, Bot } from 'lucide-react'

interface Quote {
    id: string
    text: string
    author: string
    source: string | null
    bookId: string | null
    tags: string | null
    locale: string
    isActive: boolean
    createdAt: Date
    book?: { id: string, title: string } | null
}

export default function QuotesClient({ initialQuotes, authors = [] }: { initialQuotes: Quote[], authors?: string[] }) {
    const [quotes, setQuotes] = useState<Quote[]>(initialQuotes)
    const [search, setSearch] = useState('')
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    
    const [formData, setFormData] = useState({
        text: '',
        author: '',
        source: '',
        bookId: '',
        tags: '',
        locale: 'fr',
        isActive: true
    })

    const filteredQuotes = quotes.filter(q => 
        q.text.toLowerCase().includes(search.toLowerCase()) || 
        q.author.toLowerCase().includes(search.toLowerCase()) ||
        (q.tags && q.tags.toLowerCase().includes(search.toLowerCase()))
    )

    const handleDelete = async (id: string) => {
        if (!confirm('Voulez-vous vraiment supprimer cette citation ?')) return
        await deleteQuote(id)
        setQuotes(quotes.filter(q => q.id !== id))
    }

    const openEditModal = (quote: Quote) => {
        setEditingQuoteId(quote.id)
        setFormData({
            text: quote.text,
            author: quote.author,
            source: quote.source || '',
            bookId: quote.bookId || '',
            tags: quote.tags || '',
            locale: quote.locale || 'fr',
            isActive: quote.isActive
        })
        setIsAddModalOpen(true)
    }

    const openAddModal = () => {
        setEditingQuoteId(null)
        setFormData({
            text: '',
            author: '',
            source: '',
            bookId: '',
            tags: '',
            locale: 'fr',
            isActive: true
        })
        setIsAddModalOpen(true)
    }

    const handleChatGPT = () => {
        if (!formData.author) {
            alert('Veuillez d\'abord renseigner le nom de l\'auteur dans le champ ci-dessous.')
            return
        }
        
        const langMap: Record<string, string> = { fr: 'français', en: 'anglais', ar: 'arabe' }
        const lang = langMap[formData.locale] || 'français'
        const prompt = `Donne-moi 5 citations célèbres de l'auteur ${formData.author} en ${lang}. Ne renvoie strictement que le texte des citations, et sépare chaque citation par "##". Ne mets pas de numéros, de guillemets, ni de tirets.`
        
        navigator.clipboard.writeText(prompt)
        alert('Prompt copié !\n\nCollez ce texte dans ChatGPT. Il vous retournera les citations séparées par ##.\nEnsuite, copiez la réponse de ChatGPT et utilisez le bouton "Coller les citations".')
        window.open('https://chatgpt.com', '_blank')
    }

    const handlePasteQuotes = async () => {
        if (!formData.author) {
            alert('Veuillez d\'abord renseigner l\'auteur dans le formulaire avant de coller.')
            return
        }
        try {
            const text = await navigator.clipboard.readText()
            if (!text) return
            
            const quotesToInsert = text.split('##').map(q => q.trim()).filter(q => q.length > 0)
            
            if (quotesToInsert.length === 0) {
                alert('Aucune citation trouvée. Assurez-vous qu\'elles sont séparées par ##.')
                return
            }

            if (!confirm(`Voulez-vous insérer ces ${quotesToInsert.length} citations pour l'auteur ${formData.author} ?`)) {
                return
            }

            setLoading(true)
            for (const quoteText of quotesToInsert) {
                await createQuote({
                    text: quoteText,
                    author: formData.author,
                    source: formData.source,
                    bookId: formData.bookId,
                    tags: formData.tags,
                    locale: formData.locale,
                    isActive: true
                })
            }
            alert(`${quotesToInsert.length} citations ajoutées avec succès ! La page va se recharger.`)
            window.location.reload()
        } catch (error) {
            console.error(error)
            alert('Erreur lors du collage. Vous devez autoriser l\'accès au presse-papier ou bien utiliser le formulaire manuellement.')
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            if (editingQuoteId) {
                const res = await updateQuote(editingQuoteId, formData)
                setQuotes(quotes.map(q => q.id === editingQuoteId ? { ...q, ...formData } : q))
            } else {
                const res = await createQuote(formData)
                setQuotes([{ ...res, book: null }, ...quotes])
            }
            setIsAddModalOpen(false)
        } catch (error) {
            alert('Erreur lors de l\'enregistrement')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center bg-gray-50/50">
                <div className="relative w-full md:w-96">
                    <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Rechercher une citation, un auteur..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-black focus:border-black outline-none transition-all bg-white"
                    />
                </div>
                
                <button 
                    onClick={openAddModal}
                    className="w-full md:w-auto px-6 py-2.5 bg-black text-white font-medium rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    Nouvelle Citation
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100 text-sm font-semibold text-gray-600">
                            <th className="p-4">Texte</th>
                            <th className="p-4">Auteur</th>
                            <th className="p-4">Langue</th>
                            <th className="p-4">Tags</th>
                            <th className="p-4 text-center">Statut</th>
                            <th className="p-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredQuotes.map(quote => (
                            <tr key={quote.id} className="hover:bg-gray-50/50 transition-colors group">
                                <td className="p-4">
                                    <div className="flex items-start gap-3">
                                        <QuoteIcon className="w-5 h-5 text-gray-300 mt-1 flex-shrink-0" />
                                        <p className="text-sm text-gray-900 font-medium line-clamp-2 max-w-md">"{quote.text}"</p>
                                    </div>
                                    {quote.book?.title && (
                                        <span className="text-xs text-blue-600 mt-1 block pl-8">Livre lié : {quote.book.title}</span>
                                    )}
                                </td>
                                <td className="p-4">
                                    <p className="text-sm font-medium text-gray-900">{quote.author}</p>
                                    {quote.source && <p className="text-xs text-gray-500">{quote.source}</p>}
                                </td>
                                <td className="p-4">
                                    <span className={`inline-flex px-2 py-1 rounded text-xs font-bold uppercase ${
                                        quote.locale === 'ar' ? 'bg-amber-100 text-amber-700' :
                                        quote.locale === 'en' ? 'bg-blue-100 text-blue-700' :
                                        'bg-purple-100 text-purple-700'
                                    }`}>
                                        {quote.locale || 'FR'}
                                    </span>
                                </td>
                                <td className="p-4">
                                    <div className="flex flex-wrap gap-1">
                                        {quote.tags ? quote.tags.split(',').map((t, i) => (
                                            <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                                                {t.trim()}
                                            </span>
                                        )) : <span className="text-gray-400 text-xs">-</span>}
                                    </div>
                                </td>
                                <td className="p-4 text-center">
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${quote.isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {quote.isActive ? 'Actif' : 'Inactif'}
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => openEditModal(quote)}
                                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Modifier"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(quote.id)}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Supprimer"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {filteredQuotes.length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-gray-500">
                                    <QuoteIcon className="w-12 h-12 mx-auto text-gray-200 mb-3" />
                                    <p>Aucune citation trouvée.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl overflow-hidden shadow-xl">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                {editingQuoteId ? 'Modifier la citation' : 'Nouvelle citation'}
                            </h2>
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={handleChatGPT}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
                                    title="Générer avec ChatGPT"
                                >
                                    <Bot className="w-4 h-4" />
                                    <span className="hidden sm:inline">Demander à ChatGPT</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handlePasteQuotes}
                                    disabled={loading}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                                    title="Coller les citations depuis le presse-papier"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span className="hidden sm:inline">Coller les citations</span>
                                </button>
                                <button onClick={() => setIsAddModalOpen(false)} className="p-2 text-gray-400 hover:bg-gray-200 rounded-full transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Texte de la citation *</label>
                                <textarea 
                                    required
                                    rows={4}
                                    value={formData.text}
                                    onChange={e => setFormData({...formData, text: e.target.value})}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none"
                                    placeholder="Be yourself; everyone else is already taken."
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Auteur *</label>
                                    <input 
                                        type="text" required
                                        list="authors-list"
                                        value={formData.author}
                                        onChange={e => setFormData({...formData, author: e.target.value})}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none"
                                        placeholder="Oscar Wilde"
                                    />
                                    <datalist id="authors-list">
                                        {authors.map((a, i) => <option key={i} value={a} />)}
                                    </datalist>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Source (Optionnel)</label>
                                    <input 
                                        type="text"
                                        value={formData.source}
                                        onChange={e => setFormData({...formData, source: e.target.value})}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none"
                                        placeholder="Livre, discours..."
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tags (séparés par virgule)</label>
                                    <input 
                                        type="text"
                                        value={formData.tags}
                                        onChange={e => setFormData({...formData, tags: e.target.value})}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none"
                                        placeholder="love, inspirational, funny..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Langue *</label>
                                    <select 
                                        required
                                        value={formData.locale}
                                        onChange={e => setFormData({...formData, locale: e.target.value})}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none bg-white"
                                    >
                                        <option value="fr">Français (FR)</option>
                                        <option value="ar">Arabe (AR)</option>
                                        <option value="en">Anglais (EN)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Lier à un livre (ID, Optionnel)</label>
                                    <input 
                                        type="text"
                                        value={formData.bookId}
                                        onChange={e => setFormData({...formData, bookId: e.target.value})}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none"
                                        placeholder="ID du livre dans la boutique"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <input 
                                    type="checkbox" 
                                    id="isActive"
                                    checked={formData.isActive}
                                    onChange={e => setFormData({...formData, isActive: e.target.checked})}
                                    className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black"
                                />
                                <label htmlFor="isActive" className="text-sm text-gray-700">Citation active et visible</label>
                            </div>

                            <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-xl font-medium transition-colors">
                                    Annuler
                                </button>
                                <button type="submit" disabled={loading} className="px-5 py-2.5 bg-black text-white rounded-xl font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-2">
                                    {loading ? 'Enregistrement...' : (editingQuoteId ? 'Mettre à jour' : 'Ajouter')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
