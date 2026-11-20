'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Loader2, BookOpen, ExternalLink, Plus } from 'lucide-react'
import Image from 'next/image'

interface GoogleBook {
    id: string
    volumeInfo: {
        title: string
        authors?: string[]
        description?: string
        imageLinks?: {
            thumbnail?: string
        }
        industryIdentifiers?: {
            type: string
            identifier: string
        }[]
        language?: string
    }
}

export default function GoogleBooksSearchPage() {
    const router = useRouter()
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<GoogleBook[]>([])
    const [searchSource, setSearchSource] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

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
            setError(err.message || 'Impossible de récupérer les résultats depuis l\'API.')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleAddBook = (book: GoogleBook) => {
        const { title, authors, description, industryIdentifiers, imageLinks, language } = book.volumeInfo

        // Extract ISBN 13 if available, otherwise ISBN 10
        let isbn = ''
        if (industryIdentifiers) {
            const isbn13 = industryIdentifiers.find(i => i.type === 'ISBN_13')
            const isbn10 = industryIdentifiers.find(i => i.type === 'ISBN_10')
            isbn = isbn13 ? isbn13.identifier : (isbn10 ? isbn10.identifier : '')
        }

        const author = authors && authors.length > 0 ? authors[0] : ''
        const cover = imageLinks?.thumbnail ? imageLinks.thumbnail.replace('http:', 'https:') : '' // Ensure HTTPS

        const params = new URLSearchParams()
        if (title) params.append('title', title)
        if (author) params.append('author', author)
        if (description) params.append('description', description)
        if (isbn) params.append('isbn', isbn)
        if (cover) params.append('cover', cover)
        if (language) params.append('lang', language)

        router.push(`/admin/books/new?${params.toString()}`)
    }

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <Search className="w-8 h-8 text-blue-600" />
                    Recherche Google Books
                </h1>
                <p className="mt-2 text-sm text-gray-600">
                    Recherchez des livres dans la base de données mondiale de Google et ajoutez-les directement à votre catalogue.
                </p>
            </div>

            <form onSubmit={handleSearch} className="mb-8 max-w-3xl">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Rechercher par titre, auteur ou ISBN..."
                        className="block w-full pl-12 pr-32 py-4 text-base border border-gray-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
                    />
                    <div className="absolute inset-y-2 right-2">
                        <button
                            type="submit"
                            disabled={loading || !query.trim()}
                            className="h-full px-6 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Chercher'}
                        </button>
                    </div>
                </div>
            </form>

            {error && (
                <div className="p-4 mb-8 bg-red-50 text-red-600 border border-red-200 rounded-xl font-medium">
                    {error}
                </div>
            )}

            {!loading && searchSource && results.length > 0 && (
                <div className="mb-4 flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                        {results.length} Résultat{results.length > 1 ? 's' : ''} trouvé{results.length > 1 ? 's' : ''}
                    </span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        Source : {searchSource}
                    </span>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {results.map((book) => {
                    const info = book.volumeInfo
                    const cover = info.imageLinks?.thumbnail?.replace('http:', 'https:')

                    return (
                        <div key={book.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col h-full">
                            <div className="h-48 bg-gray-50 p-4 flex items-center justify-center border-b border-gray-100 relative">
                                {cover ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img 
                                        src={cover} 
                                        alt={info.title} 
                                        className="h-full object-contain drop-shadow-md"
                                    />
                                ) : (
                                    <div className="flex flex-col items-center text-gray-400">
                                        <BookOpen className="w-12 h-12 mb-2 opacity-50" />
                                        <span className="text-xs font-medium uppercase tracking-widest">Pas d'image</span>
                                    </div>
                                )}
                            </div>
                            
                            <div className="p-5 flex-grow flex flex-col">
                                <h3 className="font-bold text-gray-900 line-clamp-2 mb-1" title={info.title}>
                                    {info.title}
                                </h3>
                                <p className="text-sm text-gray-600 line-clamp-1 mb-3">
                                    {info.authors?.join(', ') || 'Auteur inconnu'}
                                </p>
                                
                                {info.industryIdentifiers && (
                                    <p className="text-xs text-gray-500 font-mono mb-4">
                                        ISBN: {info.industryIdentifiers.find(i => i.type === 'ISBN_13')?.identifier || info.industryIdentifiers[0]?.identifier}
                                    </p>
                                )}
                                
                                <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between gap-2">
                                    <button
                                        onClick={() => handleAddBook(book)}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-black text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-colors"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Ajouter
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {!loading && query && results.length === 0 && !error && (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
                    <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Aucun livre trouvé</h3>
                    <p className="text-gray-500 max-w-md mx-auto">
                        Nous n'avons trouvé aucun résultat pour "{query}". Essayez avec d'autres termes ou le code ISBN.
                    </p>
                </div>
            )}
        </div>
    )
}
