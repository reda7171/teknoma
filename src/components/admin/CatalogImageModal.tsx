'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Download, ImageIcon, Loader2, Type, Palette, LayoutGrid, Book as BookIcon, CheckCircle2, Globe, Warehouse, ArrowUpDown, Layers } from 'lucide-react'
import { getAllBooksForCatalog } from '@/lib/actions/books'
import { getWarehouses } from '@/lib/actions/warehouse'
import { normalizeImage } from '@/lib/utils'
import { getLocalizedTitle } from '@/lib/i18n-utils'
import * as htmlToImage from 'html-to-image'

interface CatalogImageModalProps {
    isOpen: boolean
    onClose: () => void
    onSelect?: (url: string) => void
}

const BG_COLORS = [
    { name: 'Pure', color: '#ffffff', text: '#111827' },
    { name: 'Cream', color: '#fdfbf7', text: '#111827' },
    { name: 'Dark', color: '#0f172a', text: '#ffffff' },
    { name: 'Soft Rose', color: '#fff1f2', text: '#111827' },
    { name: 'Minimal', color: '#f8fafc', text: '#111827' },
]

export default function CatalogImageModal({ isOpen, onClose, onSelect }: CatalogImageModalProps) {
    const [isGenerating, setIsGenerating] = useState(false)
    const [allBooks, setAllBooks] = useState<any[]>([])
    const [warehouses, setWarehouses] = useState<any[]>([])
    const [currentChunkIdx, setCurrentChunkIdx] = useState(0)
    const [statusText, setStatusText] = useState('')
    const [config, setConfig] = useState({
        title: 'Collection Tekno Store',
        primaryColor: '#2563eb',
        backgroundColor: '#ffffff',
        textColor: '#111827',
        pattern: 'none',
        columns: 3,
        selectedCategory: 'all',
        selectedWarehouse: 'all',
        sortBy: 'date_desc',
        grouping: 'none',
        groupByLanguage: false,
        booksPerPage: 24,
        format: 'catalog',
        scaleX: 1.0,
        scaleY: 1.0,
        showPrice: true
    })
    const captureRefs = useRef<(HTMLDivElement | null)[]>([])

    const BOOKS_PER_PAGE = config.booksPerPage

    useEffect(() => {
        if (isOpen) {
            const loadData = async () => {
                const [result, whResult] = await Promise.all([
                    getAllBooksForCatalog(),
                    getWarehouses().catch(() => [])
                ])
                if (result.success && result.data) setAllBooks(result.data)
                if (Array.isArray(whResult)) setWarehouses(whResult)
            }
            loadData()
        }
    }, [isOpen])

    if (!isOpen) return null

    const availableBooks = allBooks.filter(b => {
        if (config.selectedWarehouse && config.selectedWarehouse !== 'all') {
            return b.inventories?.some((inv: any) => inv.warehouseId === config.selectedWarehouse && inv.quantity > 0)
        }
        return true
    })
    const filteredBooks = config.selectedCategory === 'all'
        ? availableBooks
        : availableBooks.filter(b => b.category === config.selectedCategory)

    const sortedBooks = [...filteredBooks].sort((a, b) => {
        if (config.sortBy === 'date_desc') {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
            return timeB - timeA
        }
        if (config.sortBy === 'date_asc') {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
            return timeA - timeB
        }
        if (config.sortBy === 'price_asc') {
            return (a.price || 0) - (b.price || 0)
        }
        if (config.sortBy === 'price_desc') {
            return (b.price || 0) - (a.price || 0)
        }
        if (config.sortBy === 'title_desc') {
            return (getLocalizedTitle(b) || '').localeCompare(getLocalizedTitle(a) || '')
        }
        return (getLocalizedTitle(a) || '').localeCompare(getLocalizedTitle(b) || '')
    })

    const languageNames: { [key: string]: string } = {
        fr: 'Langue : Français',
        ar: 'اللغة : العربية',
        en: 'Language : English'
    }

    const getChunkedBooks = () => {
        if (config.grouping === 'category') {
            const booksByCategory: { [cat: string]: any[] } = {}
            sortedBooks.forEach(book => {
                const cat = book.category || 'Non classé'
                if (!booksByCategory[cat]) booksByCategory[cat] = []
                booksByCategory[cat].push(book)
            })

            const chunks: { groupSubtitle: string; books: any[] }[] = []
            const sortedCats = Object.keys(booksByCategory).sort((a, b) => a.localeCompare(b))
            sortedCats.forEach(cat => {
                const list = booksByCategory[cat]
                const count = Math.ceil(list.length / BOOKS_PER_PAGE)
                for (let i = 0; i < count; i++) {
                    chunks.push({
                        groupSubtitle: `Catégorie : ${cat}${count > 1 ? ` (${i + 1}/${count})` : ''}`,
                        books: list.slice(i * BOOKS_PER_PAGE, i * BOOKS_PER_PAGE + BOOKS_PER_PAGE)
                    })
                }
            })
            return chunks
        }

        if (config.grouping === 'language' || config.groupByLanguage) {
            const booksByLanguage: { [key: string]: any[] } = {}
            sortedBooks.forEach(book => {
                const lang = book.language || 'fr'
                if (!booksByLanguage[lang]) {
                    booksByLanguage[lang] = []
                }
                booksByLanguage[lang].push(book)
            })

            const chunks: { groupSubtitle: string; books: any[] }[] = []
            const sortedLanguages = Object.keys(booksByLanguage).sort()
            sortedLanguages.forEach(lang => {
                const list = booksByLanguage[lang]
                const count = Math.ceil(list.length / BOOKS_PER_PAGE)
                for (let i = 0; i < count; i++) {
                    chunks.push({
                        groupSubtitle: `${languageNames[lang] || lang}${count > 1 ? ` (${i + 1}/${count})` : ''}`,
                        books: list.slice(i * BOOKS_PER_PAGE, i * BOOKS_PER_PAGE + BOOKS_PER_PAGE)
                    })
                }
            })
            return chunks
        }

        return Array.from({ length: Math.ceil(sortedBooks.length / BOOKS_PER_PAGE) }, (_, i) => ({
            groupSubtitle: '',
            books: sortedBooks.slice(i * BOOKS_PER_PAGE, i * BOOKS_PER_PAGE + BOOKS_PER_PAGE)
        }))
    }

    const chunkedBooks = getChunkedBooks()

    const categories = Array.from(new Set(allBooks.map(b => b.category).filter(Boolean))).sort()

    const handleExportAll = async () => {
        if (chunkedBooks.length === 0) return
        setIsGenerating(true)

        let successCount = 0

        try {
            for (let i = 0; i < chunkedBooks.length; i++) {
                setCurrentChunkIdx(i)
                setStatusText(`Exportation image ${i + 1}/${chunkedBooks.length}...`)
                await new Promise(resolve => setTimeout(resolve, 800)) // Wait for images if any

                const element = captureRefs.current[i]
                if (!element) continue

                const dynamicPixelRatio = config.booksPerPage > 24 ? 1 : 2;

                const dataUrl = await htmlToImage.toPng(element, {
                    quality: 1,
                    pixelRatio: dynamicPixelRatio,
                    backgroundColor: config.backgroundColor,
                    style: { fontFamily: "'Cairo', sans-serif" },
                    imagePlaceholder: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
                })

                const link = document.createElement('a')
                link.href = dataUrl
                link.download = `tekno-catalog-p${i + 1}.png`
                link.click()
                successCount++

                await new Promise(resolve => setTimeout(resolve, 800))
            }

            if (successCount > 0) {
                setStatusText('✓ Terminé !')
                setTimeout(() => { setStatusText(''); onClose(); }, 2000)
            }
        } catch (error) {
            console.error(error)
            alert('Erreur lors de la capture. Essayez un autre navigateur.')
        } finally {
            setIsGenerating(false)
            setCurrentChunkIdx(0)
        }
    }

    const getPatternStyle = (pattern: string, color: string) => {
        const op = color === '#0f172a' ? 0.08 : 0.05
        const pColor = config.primaryColor

        if (pattern === 'dots') {
            return {
                backgroundImage: `radial-gradient(${pColor} 15%, transparent 16%)`,
                backgroundSize: '40px 40px'
            }
        }
        if (pattern === 'stripes') {
            return {
                backgroundImage: `repeating-linear-gradient(45deg, ${pColor} 0, ${pColor} 5px, transparent 5px, transparent 25px)`,
                opacity: op * 2
            }
        }
        if (pattern === 'grid') {
            return {
                backgroundImage: `linear-gradient(${pColor} 1.5px, transparent 1.5px), linear-gradient(90deg, ${pColor} 1.5px, transparent 1.5px)`,
                backgroundSize: '60px 60px',
                opacity: op * 1.5
            }
        }
        return {}
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black backdrop-blur-md">
            <div className="bg-white w-full h-full flex flex-col overflow-hidden shadow-2xl">
                <div className="bg-slate-900 p-6 flex items-center justify-between text-white border-b border-slate-800 shadow-lg">
                    <div className="flex items-center gap-3">
                        <ImageIcon className="w-6 h-6 text-blue-400" />
                        <h2 className="text-xl font-bold uppercase tracking-tight">Générateur IMAGE</h2>
                    </div>
                    <button aria-label="Fermer" onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors font-bold text-xl"><X className="w-6 h-6" /></button>
                </div>

                <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                    <div className="w-full md:w-80 p-8 border-r border-gray-100 flex flex-col bg-white overflow-y-auto shrink-0">
                        <div className="space-y-8 flex-1 text-gray-900 font-bold">
                            <div>
                                <label className="text-[10px] uppercase text-gray-400 font-black tracking-widest block mb-3">Fond</label>
                                <div className="grid grid-cols-5 gap-3">
                                    {BG_COLORS.map(bg => (
                                        <button
                                            key={bg.color}
                                            onClick={() => setConfig({...config, backgroundColor: bg.color, textColor: bg.text})}
                                            className={`w-full aspect-square rounded-xl border-2 transition-all ${config.backgroundColor === bg.color ? 'border-blue-600 scale-110 shadow-lg' : 'border-gray-100 hover:scale-110'}`}
                                            style={{ backgroundColor: bg.color }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] uppercase text-gray-400 font-black tracking-widest block mb-3">Motif</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {['none', 'dots', 'stripes', 'grid'].map(p => (
                                        <button
                                            key={p}
                                            onClick={() => setConfig({...config, pattern: p})}
                                            className={`py-3 rounded-2xl text-[9px] font-black border-2 transition-all uppercase ${config.pattern === p ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-400 border-gray-100'}`}
                                        >
                                            {p === 'none' ? 'Pur' : p === 'dots' ? 'Points' : p === 'stripes' ? 'Lignes' : 'Grille'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4 text-gray-900">
                                <label className="text-[10px] uppercase text-gray-400 font-black tracking-widest">Thème</label>
                                <div className="flex gap-2.5">
                                    {['#2563eb', '#059669', '#d97706', '#dc2626', '#0f172a'].map(c => (
                                        <button
                                            key={c}
                                            onClick={() => setConfig({...config, primaryColor: c})}
                                            className={`w-8 h-8 rounded-full border-2 transition-all ${config.primaryColor === c ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] uppercase text-gray-400 font-black tracking-widest block mb-3">Titre de l'image</label>
                                <div className="relative">
                                    <Type className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        value={config.title}
                                        onChange={(e) => setConfig({...config, title: e.target.value})}
                                        className="w-full bg-white border border-gray-200 rounded-2xl py-3 pl-11 pr-4 text-sm font-bold text-gray-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                                        placeholder="Ex: Nouveautés"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] uppercase text-gray-400 font-black tracking-widest block mb-3">Format d'export</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: 'catalog', label: 'Catalogue (Vertical)' },
                                        { id: 'post', label: 'Post (Facebook/Insta)' },
                                    ].map(f => (
                                        <button
                                            key={f.id}
                                            onClick={() => {
                                                const newBooks = f.id === 'post' ? 6 : 24;
                                                const newCols = f.id === 'post' ? 3 : 3;
                                                setConfig({...config, format: f.id, booksPerPage: newBooks, columns: newCols});
                                                setCurrentChunkIdx(0);
                                            }}
                                            className={`py-3 rounded-2xl text-[9px] font-black border-2 transition-all uppercase ${config.format === f.id ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-400 border-gray-100'}`}
                                        >
                                            {f.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] uppercase text-gray-400 font-black tracking-widest block mb-3">Catalogue de quel entrepôt</label>
                                <select aria-label="Catalogue de quel entrepôt"
                                    value={config.selectedWarehouse}
                                    onChange={(e) => {
                                        setConfig({...config, selectedWarehouse: e.target.value});
                                        setCurrentChunkIdx(0);
                                    }}
                                    className="w-full bg-white border border-gray-200 rounded-2xl py-3 px-4 text-sm font-bold text-gray-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                                >
                                    <option value="all">Tous les entrepôts</option>
                                    {warehouses.map((w: any) => (
                                        <option key={w.id} value={w.id}>{w.name} {w.location ? `(${w.location})` : ''}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] uppercase text-gray-400 font-black tracking-widest block mb-3">Catégorie</label>
                                <select aria-label="Champ de sélection"
                                    value={config.selectedCategory}
                                    onChange={(e) => {
                                        setConfig({...config, selectedCategory: e.target.value});
                                        setCurrentChunkIdx(0);
                                    }}
                                    className="w-full bg-white border border-gray-200 rounded-2xl py-3 px-4 text-sm font-bold text-gray-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                                >
                                    <option value="all">Toutes les catégories</option>
                                    {categories.map((c: any) => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] uppercase text-gray-400 font-black tracking-widest block mb-3 flex items-center gap-1.5">
                                    <ArrowUpDown className="w-3.5 h-3.5 text-blue-600" />
                                    Trier par
                                </label>
                                <select
                                    aria-label="Trier par"
                                    value={config.sortBy}
                                    onChange={(e) => {
                                        setConfig({...config, sortBy: e.target.value});
                                        setCurrentChunkIdx(0);
                                    }}
                                    className="w-full bg-white border border-gray-200 rounded-2xl py-3 px-4 text-sm font-bold text-gray-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                                >
                                    <option value="date_desc">Date d&apos;ajout (plus récents)</option>
                                    <option value="date_asc">Date d&apos;ajout (plus anciens)</option>
                                    <option value="title_asc">Titre (A à Z)</option>
                                    <option value="title_desc">Titre (Z à A)</option>
                                    <option value="price_asc">Prix (croissant)</option>
                                    <option value="price_desc">Prix (décroissant)</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] uppercase text-gray-400 font-black tracking-widest block mb-3 flex items-center gap-1.5">
                                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                                    Regrouper par
                                </label>
                                <select
                                    aria-label="Regrouper par"
                                    value={config.grouping}
                                    onChange={(e) => {
                                        setConfig({...config, grouping: e.target.value as 'none' | 'category' | 'language', groupByLanguage: e.target.value === 'language'});
                                        setCurrentChunkIdx(0);
                                    }}
                                    className="w-full bg-white border border-gray-200 rounded-2xl py-3 px-4 text-sm font-bold text-gray-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                                >
                                    <option value="none">Aucun regroupement</option>
                                    <option value="category">Par Catégorie</option>
                                    <option value="language">Par Langue</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] uppercase text-gray-400 font-black tracking-widest block mb-3">Prix</label>
                                <label className="flex items-center gap-2 cursor-pointer py-1">
                                    <input
                                        type="checkbox"
                                        checked={config.showPrice}
                                        onChange={(e) => setConfig({...config, showPrice: e.target.checked})}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-sm font-semibold text-gray-700">Afficher le prix</span>
                                </label>
                            </div>

                            <div>
                                <label className="text-[10px] uppercase text-gray-400 font-black tracking-widest block mb-3">Livres par image</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {(config.format === 'post' ? [2, 4, 6, 9] : [12, 24, 48, 96]).map(num => (
                                        <button
                                            key={num}
                                            onClick={() => { setConfig({...config, booksPerPage: num}); setCurrentChunkIdx(0); }}
                                            className={`py-2 rounded-xl text-[10px] font-black border-2 transition-all ${config.booksPerPage === num ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-400 border-gray-100'}`}
                                        >
                                            {num}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="pt-8 space-y-4">
                            {statusText && (
                                <div className="p-4 bg-blue-50 rounded-2xl flex items-center gap-3 text-blue-600 font-bold text-xs">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    {statusText}
                                </div>
                            )}
                            <button
                                onClick={handleExportAll}
                                disabled={isGenerating || allBooks.length === 0}
                                className="w-full py-5 bg-blue-600 text-white font-black rounded-3xl shadow-xl hover:bg-blue-700 transition-all disabled:opacity-50"
                            >
                                {isGenerating ? <Loader2 className="w-6 h-6 animate-spin" /> : 'TÉLÉCHARGER'}
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 bg-gray-200 flex flex-col relative overflow-hidden">
                        {/* Content Scale Control */}
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-white/90 backdrop-blur-md px-6 py-3 rounded-3xl shadow-xl flex flex-col items-center gap-2">
                            <div className="flex items-center gap-4 w-full justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 w-32">Taille Horizontale</span>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="1.5"
                                    step="0.05"
                                    value={config.scaleX}
                                    onChange={(e) => setConfig({...config, scaleX: parseFloat(e.target.value)})}
                                    className="w-32 accent-blue-600"
                                />
                                <span className="text-[10px] font-black text-gray-600 w-8">{Math.round(config.scaleX * 100)}%</span>
                            </div>
                            <div className="flex items-center gap-4 w-full justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 w-32">Taille Verticale</span>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="1.5"
                                    step="0.05"
                                    value={config.scaleY}
                                    onChange={(e) => setConfig({...config, scaleY: parseFloat(e.target.value)})}
                                    className="w-32 accent-blue-600"
                                />
                                <span className="text-[10px] font-black text-gray-600 w-8">{Math.round(config.scaleY * 100)}%</span>
                            </div>
                        </div>

                        <div className="flex-1 p-8 pt-32 pb-32 overflow-auto flex justify-center items-start custom-scrollbar">
                            <div className="origin-top shadow-3xl overflow-hidden bg-white" style={{ transform: `scale(0.45)`, backgroundColor: config.backgroundColor, borderRadius: config.format === 'post' ? '60px' : '0', marginBottom: '400px' }}>
                             <div className="flex flex-col items-center relative" style={config.format === 'post' ? { width: '1080px', height: '1350px', padding: '60px 40px' } : { width: '1200px', minHeight: '1400px', padding: '96px' }}>
                                <div style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.1, ...getPatternStyle(config.pattern, config.backgroundColor) }}></div>
                                <div style={{ transform: `scale(${config.scaleX}, ${config.scaleY})`, transformOrigin: 'top center', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', transition: 'transform 0.2s' }}>
                                    <div className="relative z-10 w-full flex flex-col items-center">
                                    <h1 dir="auto" className="font-black uppercase text-center mb-6" style={{ color: config.primaryColor, fontSize: config.format === 'post' ? '100px' : '140px', lineHeight: 1.1 }}>{config.title}</h1>
                                    {chunkedBooks[currentChunkIdx]?.groupSubtitle && (
                                        <p className="font-black mb-10 uppercase tracking-wider text-center" style={{ color: config.primaryColor, fontSize: config.format === 'post' ? '28px' : '36px' }}>
                                            {chunkedBooks[currentChunkIdx]?.groupSubtitle}
                                        </p>
                                    )}
                                    <div className="w-full grid" style={{ gridTemplateColumns: `repeat(${config.format === 'post' && config.booksPerPage <= 4 ? 2 : config.columns}, minmax(0, 1fr))`, gap: config.format === 'post' ? '30px' : '48px', alignItems: 'start' }}>
                                        {(chunkedBooks[currentChunkIdx]?.books || []).map((book: any, idx: number) => {
                                            const previewCols = config.format === 'post' && config.booksPerPage <= 4 ? 2 : config.columns
                                            const previewWidth = Math.floor(((config.format === 'post' ? 1080 : 1200) - (previewCols - 1) * (config.format === 'post' ? 30 : 48)) / previewCols)
                                            const previewHeight = Math.floor(previewWidth * 1.5)
                                            const bookTitle = getLocalizedTitle(book)
                                            const isArabic = book.language === 'ar' || (!book.language && /[\u0600-\u06FF]/.test(bookTitle))
                                            return (
                                            <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                {book.image ? (
                                                    <img src={(book.image?.startsWith('uploads/') || book.image?.startsWith('/uploads/')) ? (book.image.startsWith('/') ? book.image : '/' + book.image) : normalizeImage(book.image)} onError={(e) => { (e.target as HTMLImageElement).src = '/book-placeholder.png' }} loading="eager" style={{ width: `${previewWidth}px`, height: `${previewHeight}px`, objectFit: 'cover', borderRadius: config.format === 'post' ? '40px' : '60px', marginBottom: config.format === 'post' ? '20px' : '32px', border: `${config.format === 'post' ? '12px' : '18px'} solid white`, boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }} />
                                                ) : (
                                                    <div style={{ width: `${previewWidth}px`, height: `${previewHeight}px`, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6', borderRadius: config.format === 'post' ? '40px' : '60px', marginBottom: config.format === 'post' ? '20px' : '32px', border: `${config.format === 'post' ? '12px' : '18px'} solid white` }}>
                                                        <BookIcon style={{ width: '80px', height: '80px', color: '#9ca3af' }} />
                                                    </div>
                                                )}
                                                <p dir="auto" className="font-black text-center mb-4 leading-tight" style={{ color: config.textColor, fontSize: config.format === 'post' ? '24px' : '30px', direction: isArabic ? 'rtl' : 'ltr' }}>{bookTitle}</p>
                                                {config.showPrice && (
                                                    <div className="px-8 py-2 rounded-full font-black text-white" style={{ backgroundColor: config.primaryColor, fontSize: config.format === 'post' ? '20px' : '24px' }}>{book.price} درهم</div>
                                                )}
                                            </div>
                                        )})}
                                    </div>
                                    {config.format === 'post' && (
                                        <div style={{ marginTop: 'auto', paddingTop: '40px', textAlign: 'center', width: '100%' }}>
                                             <p style={{ fontSize: '40px', fontWeight: '950', color: config.textColor, opacity: 0.15, letterSpacing: '10px', textTransform: 'uppercase', margin: 0 }}>tekno.ma</p>
                                        </div>
                                    )}
                                    </div>
                                </div>
                             </div>
                        </div>
                    </div>
                    {chunkedBooks.length > 1 && (
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-white/90 backdrop-blur-md px-6 py-3 rounded-full shadow-2xl z-50">
                            {chunkedBooks.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentChunkIdx(i)}
                                    className={`w-3 h-3 rounded-full transition-all ${currentChunkIdx === i ? 'bg-blue-600 scale-125' : 'bg-gray-300 hover:bg-gray-400'}`}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* REAL CAPTURE AREA */}
            <div style={{ position: 'absolute', top: 0, left: 0, zIndex: -100, pointerEvents: 'none', height: 0, overflow: 'hidden' }}>
                {chunkedBooks.map((chunk, chunkIdx) => {
                    const isPost = config.format === 'post';
                    const cols = isPost && config.booksPerPage <= 4 ? 2 : config.columns;
                    const innerWidth = isPost ? 1000 : 1040;
                    const gapX = isPost ? 40 : 60;

                    return (
                    <div
                        key={chunkIdx}
                        ref={(el) => { captureRefs.current[chunkIdx] = el }}
                        style={{
                            width: isPost ? '1080px' : '1200px',
                            height: isPost ? '1350px' : 'auto',
                            minHeight: isPost ? '1350px' : '1200px',
                            backgroundColor: config.backgroundColor,
                            padding: isPost ? '80px 40px' : '120px 80px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            overflow: 'hidden',
                            position: 'relative',
                            boxSizing: 'border-box'
                        }}
                    >
                        {/* Pattern Layer */}
                        <div style={{ position: 'absolute', inset: 0, zIndex: 0, ...getPatternStyle(config.pattern, config.backgroundColor) }}></div>

                        {/* Content Layer */}
                        <div style={{ transform: `scale(${config.scaleX}, ${config.scaleY})`, transformOrigin: 'top center', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ position: 'relative', zIndex: 10, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

                                {/* Header */}
                                <div style={{ width: '100%', textAlign: 'center', marginBottom: isPost ? '60px' : '140px', flexShrink: 0 }}>
                                {chunkedBooks.length > 1 && !isPost && (
                                    <div style={{ marginBottom: '60px' }}>
                                        <span style={{ fontSize: '36px', fontWeight: '950', color: config.textColor, opacity: 0.3, letterSpacing: '12px', textTransform: 'uppercase' }}>
                                            PARTIE {chunkIdx + 1} / {chunkedBooks.length}
                                        </span>
                                    </div>
                                )}
                                <h1 dir="auto" style={{ fontSize: isPost ? '110px' : '180px', fontWeight: '950', color: config.primaryColor, textTransform: 'uppercase', letterSpacing: '-4px', margin: '0 0 20px 0', lineHeight: '1', textAlign: 'center' }}>
                                    {config.title}
                                </h1>
                                {chunk.groupSubtitle && (
                                    <div style={{ marginBottom: isPost ? '30px' : '50px' }}>
                                        <span style={{ fontSize: isPost ? '32px' : '48px', fontWeight: '950', color: config.textColor, letterSpacing: '2px', textTransform: 'uppercase', opacity: 0.8 }}>
                                            {chunk.groupSubtitle}
                                        </span>
                                    </div>
                                )}
                                <div style={{ height: isPost ? '20px' : '30px', width: isPost ? '250px' : '400px', backgroundColor: config.primaryColor, margin: '0 auto', borderRadius: '15px' }}></div>
                            </div>

                            {/* Grid */}
                            <div style={{ width: '100%', display: 'flex', flexWrap: 'wrap', gap: isPost ? '40px' : '140px 60px', justifyContent: 'center' }}>
                                {(chunk.books || []).map((book: any, idx: number) => {
                                    const cellWidth = Math.floor((innerWidth - (cols - 1) * gapX) / cols)
                                    const bookTitle = getLocalizedTitle(book)
                                    const isArabic = book.language === 'ar' || (!book.language && /[\u0600-\u06FF]/.test(bookTitle))
                                    return (
                                        <div key={idx} style={{ width: `${cellWidth}px`, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                            {book.image ? (
                                                <img src={(book.image?.startsWith('uploads/') || book.image?.startsWith('/uploads/')) ? (book.image.startsWith('/') ? book.image : '/' + book.image) : normalizeImage(book.image)} onError={(e) => { (e.target as HTMLImageElement).src = '/book-placeholder.png' }} loading="eager" style={{ width: '100%', height: `${Math.floor(cellWidth * 1.5)}px`, objectFit: 'cover', borderRadius: isPost ? '25px' : '40px', backgroundColor: '#fff', border: `${isPost ? '8px' : '12px'} solid white`, boxShadow: '0 20px 40px rgba(0,0,0,0.2)', marginBottom: isPost ? '12px' : '20px' }} />
                                            ) : (
                                                <div style={{ width: '100%', height: `${Math.floor(cellWidth * 1.5)}px`, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6', borderRadius: isPost ? '25px' : '40px', border: `${isPost ? '8px' : '12px'} solid white`, boxShadow: '0 20px 40px rgba(0,0,0,0.2)', marginBottom: isPost ? '12px' : '20px' }}>
                                                    <BookIcon style={{ width: isPost ? '80px' : '140px', height: isPost ? '80px' : '140px', color: '#9ca3af' }} />
                                                </div>
                                            )}
                                            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: isPost ? '120px' : '220px' }}>
                                                <h3 dir="auto" style={{
                                                    fontSize: isPost ? '30px' : '48px',
                                                    fontWeight: '850',
                                                    color: config.textColor,
                                                    margin: '0',
                                                    textAlign: 'center',
                                                    width: '100%',
                                                    lineHeight: '1.2',
                                                    direction: isArabic ? 'rtl' : 'ltr',
                                                    paddingBottom: isPost ? '20px' : '30px',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical'
                                                }}>
                                                    {bookTitle}
                                                </h3>
                                                {config.showPrice && (
                                                    <div style={{
                                                        backgroundColor: config.primaryColor,
                                                        color: '#ffffff',
                                                        padding: isPost ? '14px 40px' : '22px 65px',
                                                        borderRadius: '100px',
                                                        fontSize: isPost ? '26px' : '42px',
                                                        fontWeight: '950',
                                                        marginTop: 'auto',
                                                        boxShadow: '0 25px 50px rgba(0,0,0,0.2)',
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        {book.price} درهم
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Footer */}
                            <div style={{ width: '100%', marginTop: 'auto', paddingTop: isPost ? '40px' : '100px', borderTop: isPost ? 'none' : `10px solid ${config.textColor}1a`, textAlign: 'center', flexShrink: 0 }}>
                                <p style={{ fontSize: isPost ? '60px' : '110px', fontWeight: '950', color: config.textColor, opacity: 0.1, letterSpacing: isPost ? '15px' : '25px', textTransform: 'uppercase', margin: 0 }}>tekno.ma</p>
                            </div>
                        </div>
                    </div>
                </div>
                )})}
            </div>
        </div>
        </div>
    )
}
