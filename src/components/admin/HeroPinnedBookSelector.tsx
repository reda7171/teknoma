'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { Pin, Search, X, RotateCcw, Sparkles, Eye, Check } from 'lucide-react'
import Image from 'next/image'
import { normalizeImage } from '@/lib/utils'

export interface AdminBookItem {
  id: string
  title: string
  author: string
  image: string
  price: number
  views?: number
}

interface HeroPinnedBookSelectorProps {
  pinnedBookId: string
  onSelectBook: (bookId: string) => void
  books: AdminBookItem[]
}

export default function HeroPinnedBookSelector({
  pinnedBookId,
  onSelectBook,
  books = [],
}: HeroPinnedBookSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Fermer le dropdown au clic en dehors
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Trouver le livre actuellement épinglé
  const pinnedBook = useMemo(() => {
    if (!pinnedBookId) return null
    return books.find(b => b.id === pinnedBookId) || null
  }, [pinnedBookId, books])

  // Le livre le plus visité par défaut (fallback automatique)
  const defaultCenterBook = useMemo(() => {
    if (!books || books.length === 0) return null
    return books[0]
  }, [books])

  // Filtrer les livres selon la recherche
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) {
      // Afficher les 6 premiers livres les plus populaires par défaut
      return books.slice(0, 6)
    }
    return books
      .filter(b => b.title?.toLowerCase().includes(q) || b.author?.toLowerCase().includes(q))
      .slice(0, 8)
  }, [books, searchQuery])

  const handleSelect = (bookId: string) => {
    onSelectBook(bookId)
    setIsOpen(false)
    setSearchQuery('')
  }

  const handleClearPin = () => {
    onSelectBook('')
    setSearchQuery('')
  }

  return (
    <div className="bg-gray-50/70 border border-gray-200/80 rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center shrink-0 shadow-sm">
            <Pin className="w-4 h-4 rotate-45" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-black">
              Livre épinglé au centre du Hero
            </h4>
            <p className="text-[11px] text-gray-500 font-medium">
              Fixez un livre vedette au premier plan du carrousel ou laissez l'algorithme des plus vus.
            </p>
          </div>
        </div>

        {/* Badge d'état */}
        <div>
          {pinnedBook ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-800 border border-emerald-200">
              <Pin className="w-3 h-3 rotate-45" />
              Épinglé manuellement
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-100 text-blue-800 border border-blue-200">
              <Sparkles className="w-3 h-3" />
              Automatique (Top vues)
            </span>
          )}
        </div>
      </div>

      {/* Carte du livre actuellement mis en avant */}
      {pinnedBook ? (
        <div className="bg-white rounded-xl p-4 border-2 border-emerald-500/40 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="relative w-14 h-20 rounded-lg overflow-hidden shrink-0 border border-gray-100 bg-gray-100 shadow-sm">
              <Image
                src={normalizeImage(pinnedBook.image)}
                alt={pinnedBook.title}
                fill
                sizes="56px"
                className="object-cover"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                  Au centre
                </span>
                {typeof pinnedBook.views === 'number' && (
                  <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {pinnedBook.views} vues
                  </span>
                )}
              </div>
              <p className="text-sm font-black text-black truncate mt-1">{pinnedBook.title}</p>
              <p className="text-xs text-gray-500 font-medium">{pinnedBook.author}</p>
              <p className="text-xs font-black text-black mt-0.5">{pinnedBook.price} MAD</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClearPin}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold text-xs transition-colors shrink-0"
            title="Détacher et revenir au mode automatique"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Remettre en mode automatique
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl p-4 border border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            {defaultCenterBook && (
              <div className="relative w-12 h-16 rounded-lg overflow-hidden shrink-0 border border-gray-100 bg-gray-100">
                <Image
                  src={normalizeImage(defaultCenterBook.image)}
                  alt={defaultCenterBook.title}
                  fill
                  sizes="48px"
                  className="object-cover"
                />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-widest text-gray-400">
                Livre actuellement au centre (automatique)
              </p>
              <p className="text-xs font-black text-black truncate mt-0.5">
                {defaultCenterBook ? defaultCenterBook.title : 'Aucun livre détecté'}
              </p>
              <p className="text-[11px] text-gray-500">
                {defaultCenterBook
                  ? `${defaultCenterBook.author} • ${defaultCenterBook.views || 0} vues`
                  : 'Sélectionnez un livre ci-dessous'}
              </p>
            </div>
          </div>
          <span className="text-[11px] text-gray-400 italic">
            Top #1 des visites
          </span>
        </div>
      )}

      {/* Sélecteur / Recherche de livre */}
      <div ref={containerRef} className="relative">
        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">
          Sélectionner un livre à épingler
        </label>
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value)
              setIsOpen(true)
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="Rechercher par titre ou par auteur..."
            className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium text-black placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-black transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-black"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dropdown des résultats */}
        {isOpen && (
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl z-30 max-h-72 overflow-y-auto divide-y divide-gray-100">
            <div className="p-2 bg-gray-50 text-[10px] font-black uppercase tracking-wider text-gray-400">
              {searchQuery ? 'Résultats de recherche' : 'Suggestions (Top consultés)'}
            </div>

            {searchResults.length === 0 ? (
              <div className="p-4 text-center text-xs text-gray-400">
                Aucun livre trouvé pour "{searchQuery}"
              </div>
            ) : (
              searchResults.map(book => {
                const isSelected = book.id === pinnedBookId
                return (
                  <button
                    key={book.id}
                    type="button"
                    onClick={() => handleSelect(book.id)}
                    className={`w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 transition-colors ${
                      isSelected ? 'bg-emerald-50/60' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-3">
                      <div className="relative w-9 h-12 rounded bg-gray-100 overflow-hidden shrink-0 border border-gray-200">
                        <Image
                          src={normalizeImage(book.image)}
                          alt={book.title}
                          fill
                          sizes="36px"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-black truncate">{book.title}</p>
                        <p className="text-[11px] text-gray-500 truncate">{book.author}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-bold text-black">{book.price} MAD</span>
                          {typeof book.views === 'number' && (
                            <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                              <Eye className="w-2.5 h-2.5" />
                              {book.views}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isSelected ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-emerald-600 text-white">
                          <Check className="w-3 h-3" />
                          Actuel
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase bg-black text-white hover:bg-gray-800">
                          Épingler
                        </span>
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  )
}
