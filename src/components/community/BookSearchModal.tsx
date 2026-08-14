'use client'

import { useState } from 'react'
import { Search, Loader2, X, BookOpen } from 'lucide-react'
import Image from 'next/image'

export interface SelectedBookData {
    title: string
    author: string
    isbn?: string
    cover?: string
    description?: string
    language?: string
}

interface BookSearchModalProps {
    isOpen: boolean
    onClose: () => void
    onSelect: (book: SelectedBookData) => void
    title?: string
}

export default function BookSearchModal({ isOpen, onClose, onSelect, title = 'Rechercher un livre' }: BookSearchModalProps) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [searchSource, setSearchSource] = useState<string | null>(null)

    if (!isOpen) return null

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!query.trim()) return

        setLoading(true)
        setError(null)
        setResults([])
        setSearchSource(null)

        try {
            const res = await fetch(`/api/books/search?q=${encodeURIComponent(query)}`)
            const data = await res.json()
            
            if (!res.ok) {
                throw new Error(data.error || 'Erreur lors de la recherche.')
            }

            if (data.items && data.items.length > 0) {
                setResults(data.items)
                setSearchSource(data.source)
            } else {
                setResults([])
                setSearchSource(data.source)
            }
        } catch (err: any) {
            setError(err.message || 'Impossible de récupérer les résultats.')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleSelect = (book: any) => {
        const info = book.volumeInfo
        const cover = info.imageLinks?.thumbnail?.replace('http:', 'https:')
        let isbn = undefined
        
        if (info.industryIdentifiers) {
            const isbn13 = info.industryIdentifiers.find((i: any) => i.type === 'ISBN_13')
            const isbn10 = info.industryIdentifiers.find((i: any) => i.type === 'ISBN_10')
            isbn = isbn13 ? isbn13.identifier : (isbn10 ? isbn10.identifier : undefined)
        }

        onSelect({
            title: info.title || '',
            author: info.authors ? info.authors.join(', ') : 'Auteur inconnu',
            isbn: isbn,
            cover: cover,
            description: info.description || '',
            language: info.language || 'fr'
        })
        
        // Reset and close
        setQuery('')
        setResults([])
        setSearchSource(null)
        onClose()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Search className="w-5 h-5 text-[#f39c12]" />
                        {title}
                    </h2>
                    <button 
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 flex-1 overflow-y-auto">
                    <form onSubmit={handleSearch} className="mb-6">
                        <div className="relative">
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Titre, Auteur, ou ISBN..."
                                className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#f39c12] focus:border-transparent outline-none transition-all text-lg font-medium"
                                autoFocus
                            />
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-6 h-6" />
                            <button
                                type="submit"
                                disabled={loading || !query.trim()}
                                className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2 bg-[#f39c12] text-white rounded-lg font-semibold hover:bg-[#e67e22] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Rechercher'}
                            </button>
                        </div>
                    </form>

                    {error && (
                        <div className="p-4 mb-6 bg-red-50 text-red-600 border border-red-200 rounded-xl font-medium">
                            {error}
                        </div>
                    )}

                    {!loading && searchSource && results.length > 0 && (
                        <div className="mb-4 flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                                {results.length} Résultat{results.length > 1 ? 's' : ''}
                            </span>
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                Source : {searchSource}
                            </span>
                        </div>
                    )}

                    {loading && (
                        <div className="py-12 flex flex-col items-center justify-center text-gray-400 gap-4">
                            <Loader2 className="w-10 h-10 animate-spin text-[#f39c12]" />
                            <p className="font-medium animate-pulse">Recherche en cours...</p>
                        </div>
                    )}

                    {!loading && results.length === 0 && searchSource !== null && !error && (
                        <div className="py-12 text-center text-gray-500 bg-gray-50 rounded-xl border border-gray-100 border-dashed">
                            <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p className="text-lg font-medium text-gray-600">Aucun livre trouvé</p>
                            <p className="text-sm">Essayez d'autres mots-clés ou l'ISBN exact.</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {results.map((book) => {
                            const info = book.volumeInfo
                            const cover = info.imageLinks?.thumbnail?.replace('http:', 'https:')

                            return (
                                <div 
                                    key={book.id} 
                                    onClick={() => handleSelect(book)}
                                    className="flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-[#f39c12] hover:shadow-lg transition-all cursor-pointer group"
                                >
                                    <div className="flex p-4 gap-4">
                                        <div className="w-20 h-28 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden relative shadow-sm group-hover:shadow-md transition-shadow">
                                            {cover ? (
                                                <Image 
                                                    src={cover} 
                                                    alt={info.title} 
                                                    fill
                                                    className="object-cover"
                                                    sizes="80px"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 p-2 text-center">
                                                    <BookOpen className="w-6 h-6 mb-1 opacity-50" />
                                                    <span className="text-[10px] font-medium uppercase tracking-wider">No Cover</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                            <h3 className="font-bold text-gray-900 text-sm line-clamp-2 leading-snug group-hover:text-[#f39c12] transition-colors" title={info.title}>
                                                {info.title}
                                            </h3>
                                            <p className="text-sm text-gray-500 mt-1 line-clamp-1" title={info.authors?.join(', ')}>
                                                {info.authors?.join(', ') || 'Auteur inconnu'}
                                            </p>
                                            {info.publishedDate && (
                                                <p className="text-xs text-gray-400 mt-1">
                                                    {info.publishedDate.substring(0, 4)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="bg-gray-50/50 p-3 border-t border-gray-100 flex justify-center text-sm font-semibold text-[#f39c12] opacity-0 group-hover:opacity-100 transition-opacity">
                                        Sélectionner ce livre
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}
