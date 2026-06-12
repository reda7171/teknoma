'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, Book, Clock, CheckCircle, XCircle } from 'lucide-react'
import { addRequestedBook, updateRequestedBookStatus } from '@/lib/actions/requested-books'

export default function RequestedBooksClient({ initialBooks }: { initialBooks: any[] }) {
    const router = useRouter()
    const [books, setBooks] = useState(initialBooks)
    const [title, setTitle] = useState('')
    const [author, setAuthor] = useState('')
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    useEffect(() => {
        setBooks(initialBooks)
    }, [initialBooks])

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim()) return

        setLoading(true)
        const titles = title.split('\n').map(t => t.trim()).filter(t => t.length > 0)
        
        let hasError = false
        for (const t of titles) {
            const res = await addRequestedBook(t, author)
            if (!res.success) {
                alert(`Erreur pour "${t}": ` + res.error)
                hasError = true
            }
        }
        
        setTitle('')
        setAuthor('')
        router.refresh()
        setLoading(false)
    }

    const handleStatusUpdate = async (id: string, status: string) => {
        const res = await updateRequestedBookStatus(id, status)
        if (res.success) {
            setBooks(books.map(b => b.id === id ? { ...b, status } : b))
        }
    }

    const filteredBooks = books.filter(book => 
        book.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (book.author && book.author.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    return (
        <div className="space-y-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Ajouter un titre demandé</h2>
                <form onSubmit={handleAdd} className="flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Titres des livres (Un par ligne)</label>
                        <textarea
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 min-h-[42px] max-h-[200px]"
                            placeholder="Livre 1&#10;Livre 2&#10;Livre 3"
                            rows={1}
                            required
                        />
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Auteur (Optionnel)</label>
                        <input
                            type="text"
                            value={author}
                            onChange={(e) => setAuthor(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            placeholder="Ex: Morgan Housel"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl flex items-center transition-colors disabled:opacity-50"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Ajouter
                    </button>
                </form>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50/30">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Rechercher par titre ou auteur..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50/50">
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Titre & Auteur</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Demandes</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Statut</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredBooks.map((book) => (
                                <tr key={book.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mr-4 shrink-0">
                                                <Book className="w-5 h-5 text-blue-500" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">{book.title}</p>
                                                {book.author && <p className="text-xs text-gray-500">{book.author}</p>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="inline-flex items-center justify-center min-w-[2rem] h-8 px-3 rounded-lg bg-orange-50 text-orange-600 font-black text-sm">
                                            {book.requestCount}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {book.status === 'PENDING' && (
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                <Clock className="w-3 h-3 mr-1" /> En attente
                                            </span>
                                        )}
                                        {book.status === 'RESTOCKED' && (
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                <CheckCircle className="w-3 h-3 mr-1" /> En stock
                                            </span>
                                        )}
                                        {book.status === 'IGNORED' && (
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                <XCircle className="w-3 h-3 mr-1" /> Ignoré
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {book.status !== 'RESTOCKED' && (
                                                <button
                                                    onClick={() => handleStatusUpdate(book.id, 'RESTOCKED')}
                                                    className="p-2 rounded-lg text-green-600 hover:bg-green-50 transition-colors"
                                                    title="Marquer comme en stock"
                                                >
                                                    <CheckCircle className="w-5 h-5" />
                                                </button>
                                            )}
                                            {book.status !== 'IGNORED' && (
                                                <button
                                                    onClick={() => handleStatusUpdate(book.id, 'IGNORED')}
                                                    className="p-2 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
                                                    title="Ignorer"
                                                >
                                                    <XCircle className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredBooks.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-sm text-gray-500">
                                        Aucun titre trouvé.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
