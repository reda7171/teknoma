'use client'

import { useState, useMemo } from 'react'
import {
    Bot, Play, AlertCircle, Loader2, CheckCircle2, Download,
    Search, CheckSquare, Square, Eye, Sparkles, Sliders,
    Layers, Tag, Phone, ShieldCheck, ChevronLeft, ChevronRight,
    ShoppingBag, ExternalLink
} from 'lucide-react'

interface BookItem {
    id: string
    title: string
    price: number
    image: string | null
    author?: string | null
    category?: string | null
    description?: string | null
    stock?: number
    createdAt?: Date | string
}

export default function FacebookBotClient({ books }: { books: BookItem[] }) {
    // Sélection par lot & prévisualisation
    const [selectedBookIds, setSelectedBookIds] = useState<string[]>(books.length > 0 ? [books[0].id] : [])
    const [previewBookId, setPreviewBookId] = useState<string>(books.length > 0 ? books[0].id : '')
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<string>('all')

    // Paramètres du filigrane
    const [watermarkEnabled, setWatermarkEnabled] = useState(true)
    const [watermarkText, setWatermarkText] = useState('WhatsApp: 06 66 03 81 29 • Livraison Rapide Partout au Maroc')
    const [showPriceBadge, setShowPriceBadge] = useState(true)
    const [watermarkPosition, setWatermarkPosition] = useState<'bottom' | 'top' | 'corner' | 'center'>('bottom')
    const [watermarkColor, setWatermarkColor] = useState('#0f172a') // Slate 900
    const [watermarkOpacity, setWatermarkOpacity] = useState(0.92)

    // États du bot & actions
    const [isLoading, setIsLoading] = useState(false)
    const [isDownloading, setIsDownloading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    // Catégories uniques
    const categories = useMemo(() => {
        const set = new Set<string>()
        books.forEach(b => {
            if (b.category) set.add(b.category)
        })
        return Array.from(set).sort()
    }, [books])

    // Filtrage des livres
    const filteredBooks = useMemo(() => {
        return books.filter(book => {
            const matchesSearch = !searchQuery ||
                book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (book.author && book.author.toLowerCase().includes(searchQuery.toLowerCase()))
            const matchesCat = selectedCategory === 'all' || book.category === selectedCategory
            return matchesSearch && matchesCat
        })
    }, [books, searchQuery, selectedCategory])

    // Livre actuellement en prévisualisation
    const previewBook = useMemo(() => {
        return books.find(b => b.id === previewBookId) || books[0] || null
    }, [books, previewBookId])

    // Index du livre en cours dans la sélection par lot
    const currentPreviewIndex = selectedBookIds.indexOf(previewBookId)

    const handleToggleSelectBook = (id: string, e?: React.MouseEvent) => {
        e?.stopPropagation()
        setSelectedBookIds(prev => {
            if (prev.includes(id)) {
                const next = prev.filter(item => item !== id)
                if (id === previewBookId && next.length > 0) {
                    setPreviewBookId(next[0])
                }
                return next
            } else {
                return [...prev, id]
            }
        })
        setPreviewBookId(id)
    }

    const handleSelectAllFiltered = () => {
        const ids = filteredBooks.map(b => b.id)
        setSelectedBookIds(Array.from(new Set([...selectedBookIds, ...ids])))
    }

    const handleDeselectAll = () => {
        setSelectedBookIds([])
    }

    const handleLaunchBot = async () => {
        if (selectedBookIds.length === 0) {
            setMessage({ type: 'error', text: 'Veuillez sélectionner au moins un livre à publier.' })
            return
        }

        setIsLoading(true)
        setMessage(null)
        try {
            const res = await fetch('/api/admin/bot/facebook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bookIds: selectedBookIds,
                    watermark: {
                        enabled: watermarkEnabled,
                        text: watermarkText,
                        showPrice: showPriceBadge,
                        position: watermarkPosition,
                        color: watermarkColor,
                        opacity: watermarkOpacity
                    }
                })
            })
            const data = await res.json()
            if (!res.ok || !data.success) throw new Error(data.error || 'Erreur de lancement')

            setMessage({
                type: 'success',
                text: `Bot lancé avec succès pour ${selectedBookIds.length} livre(s) ! Chrome s'ouvre sur votre machine.`
            })
        } catch (error: any) {
            console.error(error)
            setMessage({ type: 'error', text: error.message || 'Erreur lors du lancement du bot. Assurez-vous d\'être en local.' })
        } finally {
            setIsLoading(false)
        }
    }

    const handleDownloadWatermarked = async () => {
        if (!previewBook) return
        setIsDownloading(true)
        try {
            const params = new URLSearchParams({
                bookId: previewBook.id,
                enabled: watermarkEnabled ? 'true' : 'false',
                text: watermarkText,
                showPrice: showPriceBadge ? 'true' : 'false',
                position: watermarkPosition,
                color: watermarkColor,
                opacity: watermarkOpacity.toString()
            })
            window.open(`/api/admin/bot/watermark?${params.toString()}`, '_blank')
        } catch (err) {
            console.error(err)
        } finally {
            setIsDownloading(false)
        }
    }

    const formatImageUrl = (img: string | null) => {
        if (!img) return '/book-placeholder.png'
        if (img.startsWith('http')) return img
        if (img.startsWith('/')) return img
        return '/' + img
    }

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 font-sans">
            {/* Entête */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-700">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-blue-600 rounded-2xl shadow-lg">
                            <Bot className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Bot Facebook Marketplace</h1>
                            <p className="text-slate-300 text-xs sm:text-sm font-medium">Publication par lot d&apos;annonces optimisées avec filigrane commercial</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-800/80 border border-slate-700 px-4 py-2.5 rounded-2xl">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <div className="text-xs">
                        <div className="font-bold text-slate-200">Mode Local Uniquement</div>
                        <div className="text-[11px] text-slate-400">Automatisation Chrome Puppeteer</div>
                    </div>
                </div>
            </div>

            {/* Notification */}
            {message && (
                <div className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-bold shadow-sm transition-all ${
                    message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                    {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" /> : <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />}
                    <span>{message.text}</span>
                </div>
            )}

            {/* Layout principal 2 Colonnes */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                {/* COLONNE GAUCHE (7 cols) : Sélection par lot des livres */}
                <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                        <div>
                            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                                <Layers className="w-5 h-5 text-blue-600" />
                                Sélection des livres par lot
                            </h2>
                            <p className="text-xs text-slate-500 font-medium">Cochez les livres que le bot doit publier à la chaîne</p>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-black">
                                {selectedBookIds.length} sélectionné{selectedBookIds.length > 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>

                    {/* Barre de recherche & filtres */}
                    <div className="space-y-3">
                        <div className="relative">
                            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Rechercher par titre, auteur..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition"
                            />
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2">
                            {/* Filtre catégorie */}
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                aria-label="Filtrer par catégorie"
                                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-blue-500"
                            >
                                <option value="all">Toutes les catégories ({books.length})</option>
                                {categories.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>

                            {/* Actions de sélection globale */}
                            <div className="flex items-center gap-2 text-xs">
                                <button
                                    onClick={handleSelectAllFiltered}
                                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition"
                                >
                                    Tout cocher
                                </button>
                                <button
                                    onClick={handleDeselectAll}
                                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition"
                                >
                                    Tout décocher
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Liste des livres avec scroll */}
                    <div className="max-h-[580px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                        {filteredBooks.length === 0 ? (
                            <div className="text-center py-12 text-slate-400 font-medium text-sm">
                                Aucun livre ne correspond à votre recherche.
                            </div>
                        ) : (
                            filteredBooks.map(book => {
                                const isSelected = selectedBookIds.includes(book.id)
                                const isPreviewing = previewBookId === book.id

                                return (
                                    <div
                                        key={book.id}
                                        onClick={() => setPreviewBookId(book.id)}
                                        className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                                            isPreviewing
                                                ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/10 shadow-sm'
                                                : isSelected
                                                    ? 'bg-slate-50/80 border-slate-300'
                                                    : 'bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50/40'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            {/* Checkbox pour le lot */}
                                            <button
                                                type="button"
                                                onClick={(e) => handleToggleSelectBook(book.id, e)}
                                                className="text-slate-400 hover:text-blue-600 transition shrink-0"
                                                title={isSelected ? 'Retirer du lot' : 'Ajouter au lot'}
                                            >
                                                {isSelected ? (
                                                    <CheckSquare className="w-5 h-5 text-blue-600" />
                                                ) : (
                                                    <Square className="w-5 h-5 text-slate-300" />
                                                )}
                                            </button>

                                            {/* Miniature */}
                                            <div className="w-11 h-14 bg-slate-100 rounded-lg overflow-hidden shrink-0 border border-slate-200 relative">
                                                <img
                                                    src={formatImageUrl(book.image)}
                                                    alt={book.title}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => { (e.target as HTMLImageElement).src = '/book-placeholder.png' }}
                                                />
                                            </div>

                                            {/* Infos */}
                                            <div className="min-w-0">
                                                <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate" title={book.title}>
                                                    {book.title}
                                                </h4>
                                                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 font-medium">
                                                    {book.author && <span className="truncate max-w-[130px]">{book.author}</span>}
                                                    {book.author && <span>•</span>}
                                                    <span className="font-bold text-slate-700">{book.price} MAD</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Badge état / Bouton aperçu */}
                                        <div className="shrink-0 flex items-center gap-2">
                                            {isPreviewing ? (
                                                <span className="px-2 py-0.5 bg-blue-600 text-white rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                                                    <Eye className="w-3 h-3" />
                                                    Aperçu
                                                </span>
                                            ) : (
                                                <span className="text-[11px] font-bold text-slate-400">
                                                    Voir
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>

                {/* COLONNE DROITE (5 cols) : Aperçu de l'image & Réglages du filigrane */}
                <div className="lg:col-span-5 space-y-6">

                    {/* BLOC 1 : APERÇU DE L'IMAGE AVANT PUBLICATION */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                                <Eye className="w-4 h-4 text-blue-600" />
                                Aperçu de l&apos;annonce Facebook
                            </h3>

                            {selectedBookIds.length > 1 && currentPreviewIndex !== -1 && (
                                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                                    <span>{currentPreviewIndex + 1}/{selectedBookIds.length}</span>
                                    <div className="flex items-center">
                                        <button
                                            disabled={currentPreviewIndex <= 0}
                                            onClick={() => setPreviewBookId(selectedBookIds[currentPreviewIndex - 1])}
                                            className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"
                                        >
                                            <ChevronLeft className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            disabled={currentPreviewIndex >= selectedBookIds.length - 1}
                                            onClick={() => setPreviewBookId(selectedBookIds[currentPreviewIndex + 1])}
                                            className="p-1 rounded hover:bg-slate-100 disabled:opacity-30"
                                        >
                                            <ChevronRight className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {previewBook ? (
                            <div className="space-y-4">
                                {/* Carte Simulation Facebook Marketplace */}
                                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-md bg-white">
                                    {/* Conteneur Image avec Filigrane dynamique appliqué en temps réel */}
                                    <div className="relative aspect-[3/4] w-full bg-slate-900 overflow-hidden flex items-center justify-center">
                                        <img
                                            src={formatImageUrl(previewBook.image)}
                                            alt={previewBook.title}
                                            className="w-full h-full object-cover"
                                            onError={(e) => { (e.target as HTMLImageElement).src = '/book-placeholder.png' }}
                                        />

                                        {/* FILIGRANE DYNAMIQUE SI ACTIVÉ */}
                                        {watermarkEnabled && (
                                            <>
                                                {/* Badge Prix Stylisé */}
                                                {showPriceBadge && (
                                                    <div className="absolute top-3 left-3 z-20 px-3.5 py-1.5 rounded-full font-black text-xs text-white bg-blue-600 shadow-xl border border-white/80">
                                                        {previewBook.price} MAD
                                                    </div>
                                                )}

                                                {/* Filigrane selon la position */}
                                                {watermarkPosition === 'center' ? (
                                                    <div
                                                        className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none"
                                                        style={{ opacity: watermarkOpacity }}
                                                    >
                                                        <div className="transform -rotate-12 px-6 py-2 rounded-xl bg-slate-900/80 text-white font-black text-sm tracking-widest border border-white/20">
                                                            petsunivers.ma
                                                        </div>
                                                    </div>
                                                ) : watermarkPosition === 'corner' ? (
                                                    <div
                                                        className="absolute bottom-3 right-3 z-10 p-2.5 rounded-xl text-white shadow-xl border border-blue-400/30"
                                                        style={{ backgroundColor: watermarkColor, opacity: watermarkOpacity }}
                                                    >
                                                        <div className="text-[11px] font-black tracking-wider">petsunivers.ma</div>
                                                        <div className="text-[9px] text-blue-200 font-semibold">{watermarkText}</div>
                                                    </div>
                                                ) : (
                                                    // Bandeau en bas ou en haut
                                                    <div
                                                        className={`absolute left-0 right-0 z-10 px-4 py-2.5 text-center text-white border-t border-blue-500/60 shadow-2xl ${
                                                            watermarkPosition === 'top' ? 'top-0 border-b border-t-0' : 'bottom-0'
                                                        }`}
                                                        style={{ backgroundColor: watermarkColor, opacity: watermarkOpacity }}
                                                    >
                                                        <div className="text-xs font-black tracking-widest uppercase">
                                                            petsunivers.ma
                                                        </div>
                                                        <div className="text-[10px] text-blue-200 font-bold truncate">
                                                            {watermarkText}
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>

                                    {/* Détails Marketplace */}
                                    <div className="p-4 bg-slate-50 space-y-2 border-t border-slate-100">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xl font-black text-slate-900">{previewBook.price} MAD</span>
                                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-md">
                                                État : Neuf
                                            </span>
                                        </div>
                                        <h4 className="text-sm font-bold text-slate-800 line-clamp-1">{previewBook.title}</h4>
                                        <div className="text-xs text-slate-500 line-clamp-2">
                                            {previewBook.description ? previewBook.description.replace(/<[^>]*>?/gm, '') : 'Livre en stock chez PetsUnivers Store Maroc.'}
                                        </div>
                                    </div>
                                </div>

                                {/* Bouton de téléchargement de l'image filigranée */}
                                <button
                                    onClick={handleDownloadWatermarked}
                                    disabled={isDownloading || !previewBook.image}
                                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50"
                                >
                                    {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                    Télécharger cette image avec filigrane
                                </button>
                            </div>
                        ) : (
                            <div className="p-8 text-center text-slate-400 text-sm">
                                Aucun livre sélectionné
                            </div>
                        )}
                    </div>

                    {/* BLOC 2 : RÉGLAGES DU FILIGRANE (TOUT PARAMÉTRÉ) */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <label className="flex items-center gap-2.5 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={watermarkEnabled}
                                    onChange={(e) => setWatermarkEnabled(e.target.checked)}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <span className="font-black text-sm text-slate-900">Appliquer un filigrane sur les images</span>
                            </label>

                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-[10px] font-black rounded-full uppercase">
                                Paramètres
                            </span>
                        </div>

                        {watermarkEnabled && (
                            <div className="space-y-4 pt-1 text-xs">
                                {/* Texte du filigrane */}
                                <div>
                                    <label className="block text-slate-600 font-bold mb-1.5 flex items-center gap-1.5">
                                        <Phone className="w-3.5 h-3.5 text-blue-600" />
                                        Texte commercial / WhatsApp
                                    </label>
                                    <input
                                        type="text"
                                        value={watermarkText}
                                        onChange={(e) => setWatermarkText(e.target.value)}
                                        placeholder="Ex: WhatsApp: 06 66 03 81 29 • Paiement à la livraison"
                                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:border-blue-500"
                                    />
                                </div>

                                {/* Sticker de Prix */}
                                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                                        <input
                                            type="checkbox"
                                            checked={showPriceBadge}
                                            onChange={(e) => setShowPriceBadge(e.target.checked)}
                                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                        />
                                        <span>Afficher le sticker Prix sur l&apos;image</span>
                                    </label>
                                    <Tag className="w-4 h-4 text-blue-600" />
                                </div>

                                {/* Position du filigrane */}
                                <div>
                                    <label className="block text-slate-600 font-bold mb-1.5">Position du filigrane</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {[
                                            { id: 'bottom', label: 'Bas' },
                                            { id: 'top', label: 'Haut' },
                                            { id: 'corner', label: 'Coin' },
                                            { id: 'center', label: 'Centre' }
                                        ].map(pos => (
                                            <button
                                                key={pos.id}
                                                type="button"
                                                onClick={() => setWatermarkPosition(pos.id as any)}
                                                className={`py-2 rounded-xl text-center font-bold border transition ${
                                                    watermarkPosition === pos.id
                                                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                                                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                                }`}
                                            >
                                                {pos.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Opacité & Couleur */}
                                <div className="grid grid-cols-2 gap-3 pt-1">
                                    <div>
                                        <label className="block text-slate-600 font-bold mb-1">
                                            Opacité : {Math.round(watermarkOpacity * 100)}%
                                        </label>
                                        <input
                                            type="range"
                                            min="0.5"
                                            max="1.0"
                                            step="0.05"
                                            value={watermarkOpacity}
                                            onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                                            className="w-full accent-blue-600"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-slate-600 font-bold mb-1">Thème bandeau</label>
                                        <div className="flex items-center gap-2 pt-1">
                                            {[
                                                { color: '#0f172a', label: 'Noir' },
                                                { color: '#1e3a8a', label: 'Bleu' },
                                                { color: '#065f46', label: 'Vert' }
                                            ].map(c => (
                                                <button
                                                    key={c.color}
                                                    type="button"
                                                    onClick={() => setWatermarkColor(c.color)}
                                                    className={`w-6 h-6 rounded-full border-2 transition ${
                                                        watermarkColor === c.color ? 'border-blue-500 scale-110 shadow-sm' : 'border-transparent'
                                                    }`}
                                                    style={{ backgroundColor: c.color }}
                                                    title={c.label}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* BLOC 3 : BOUTON PRINCIPAL DE LANCEMENT DU BOT */}
                    <div className="bg-slate-900 text-white p-6 rounded-3xl space-y-4 shadow-xl border border-slate-800">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-400 font-medium">Prêt pour le déploiement</span>
                            <span className="text-xs font-black text-emerald-400">
                                {selectedBookIds.length} livre(s) dans le lot
                            </span>
                        </div>

                        <button
                            onClick={handleLaunchBot}
                            disabled={isLoading || selectedBookIds.length === 0}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-black text-sm rounded-2xl shadow-lg hover:shadow-blue-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Lancement du Bot Chrome...</span>
                                </>
                            ) : (
                                <>
                                    <Play className="w-5 h-5 fill-current" />
                                    <span>Publier le lot ({selectedBookIds.length} livres)</span>
                                </>
                            )}
                        </button>

                        <div className="text-[11px] text-slate-400 text-center leading-relaxed">
                            Le script démarre Chrome, pré-remplit les titres, prix, descriptions, tags et injecte les images {watermarkEnabled ? 'avec filigrane' : ''} automatiquement.
                        </div>
                    </div>

                </div>

            </div>
        </div>
    )
}
