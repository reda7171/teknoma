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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-pixio-cream w-full max-w-5xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-100 animate-in zoom-in-95 duration-300">
                
                {/* Header */}
                <div className="flex items-center justify-between p-8 pb-6 border-b border-gray-100/50 bg-white/50 backdrop-blur-md z-10">
                    <h2 className="text-2xl font-black text-black tracking-tight flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center">
                            <Search className="w-5 h-5 text-amber-600" />
                        </div>
                        {title}
                    </h2>
                    <button aria-label="Fermer" 
                        onClick={onClose}
                        className="w-10 h-10 bg-white rounded-full shadow-sm hover:bg-black hover:text-white transition-all flex items-center justify-center group"
                    >
                        <X className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 flex-1 overflow-y-auto">
                    <form onSubmit={handleSearch} className="mb-8">
                        <div className="relative group">
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Modèle, Marque, ou N° Série/IMEI..."
                                className="w-full pl-14 pr-4 py-5 bg-white border-2 border-transparent rounded-[2rem] focus:border-black outline-none transition-all text-lg font-bold shadow-sm group-hover:shadow-md rtl:text-base rtl:placeholder:text-sm"
                                autoFocus
                            />
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 w-6 h-6 group-focus-within:text-black transition-colors" />
                            <button
                                type="submit"
                                disabled={loading || !query.trim()}
                                className="absolute right-2 top-1/2 -translate-y-1/2 px-8 py-3 bg-black text-white rounded-full font-black uppercase tracking-widest text-[10px] hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 rtl:text-sm rtl:tracking-normal"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Rechercher'}
                            </button>
                        </div>
                    </form>

                    {error && (
                        <div className="p-4 mb-8 bg-red-50 text-red-500 border-2 border-red-100 rounded-2xl font-bold text-sm text-center animate-in fade-in slide-in-from-top-2">
                            {error}
                        </div>
                    )}

                    {!loading && searchSource && results.length > 0 && (
                        <div className="mb-6 flex items-center justify-between px-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                {results.length} Résultat{results.length > 1 ? 's' : ''}
                            </span>
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-gray-100 text-gray-500">
                                Source : {searchSource}
                            </span>
                        </div>
                    )}

                    {loading && (
                        <div className="py-20 flex flex-col items-center justify-center text-gray-400 gap-4">
                            <Loader2 className="w-10 h-10 animate-spin text-black" />
                            <p className="text-[10px] font-black uppercase tracking-widest animate-pulse text-gray-400">Recherche en cours...</p>
                        </div>
                    )}

                    {!loading && results.length === 0 && searchSource !== null && !error && (
                        <div className="py-20 flex flex-col items-center justify-center text-center bg-white rounded-[2rem] border border-gray-100 shadow-sm">
                            <BookOpen className="w-12 h-12 mb-4 text-gray-200" />
                            <p className="text-xl font-black text-black tracking-tight mb-2">Aucun produit trouvé</p>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Essayez d'autres mots-clés ou le numéro de série / IMEI exact.</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {results.map((book) => {
                            const info = book.volumeInfo
                            const cover = info.imageLinks?.thumbnail?.replace('http:', 'https:')

                            return (
                                <div 
                                    key={book.id} 
                                    onClick={() => handleSelect(book)}
                                    className="bg-white rounded-[2rem] p-4 border border-gray-100 hover:border-black transition-all group hover:shadow-xl hover:-translate-y-1 cursor-pointer flex flex-col relative"
                                >
                                    <div className="w-full aspect-[2/3] bg-gray-50 rounded-xl mb-4 overflow-hidden relative shadow-inner">
                                        {cover ? (
                                            <Image 
                                                src={cover} 
                                                alt={info.title} 
                                                fill
                                                className="object-cover group-hover:scale-105 transition-transform duration-500"
                                                sizes="(max-width: 768px) 50vw, 25vw"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 p-2 text-center">
                                                <BookOpen className="w-8 h-8 opacity-20 mb-2" />
                                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-300">Sans couverture</span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <h3 className="font-black text-base text-black leading-tight mb-1 line-clamp-2 group-hover:text-amber-600 transition-colors" title={info.title}>
                                        {info.title}
                                    </h3>
                                    
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-4 line-clamp-1" title={info.authors?.join(', ')}>
                                        {info.authors?.join(', ') || 'Auteur inconnu'}
                                    </p>
                                    
                                    <button className="w-full mt-auto bg-gray-50 text-black text-[10px] font-black uppercase tracking-widest py-3 rounded-xl group-hover:bg-black group-hover:text-white transition-colors">
                                        Sélectionner
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}
