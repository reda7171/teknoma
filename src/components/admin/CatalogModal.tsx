'use client'

import { useState, useEffect, type CSSProperties } from 'react'
import { FileText, X, Printer, LayoutList, Type, Loader2, ImageIcon, Book as BookIcon, Filter, Palette, Grid3X3, Globe, Warehouse, ArrowUpDown, Layers } from 'lucide-react'
import { getAllBooksForCatalog } from '@/lib/actions/books'
import { getWarehouses } from '@/lib/actions/warehouse'
import { normalizeImage } from '@/lib/utils'
import { getLocalizedTitle } from '@/lib/i18n-utils'

interface CatalogModalProps {
    isOpen: boolean
    onClose: () => void
    triggerEvent?: string // New prop for external triggers
    visitor?: boolean
}

export default function CatalogModal({ isOpen: initialIsOpen, onClose, triggerEvent, visitor = false }: CatalogModalProps) {
    const [isOpen, setIsOpen] = useState(initialIsOpen)
    const [isGenerating, setIsGenerating] = useState(false)
    const [isVisitor, setIsVisitor] = useState(visitor)
    const [allBooks, setAllBooks] = useState<any[]>([])
    const [categories, setCategories] = useState<string[]>([])
    const [warehouses, setWarehouses] = useState<any[]>([])
    const [config, setConfig] = useState({
        booksPerPage: 12,
        title: 'Catalogue Riwaya',
        subtitle: 'Découvrez notre collection',
        primaryColor: '#2563eb',
        backgroundColor: '#ffffff',
        pattern: 'none',
        showPrice: true,
        selectedCategory: 'all',
        selectedWarehouse: 'all',
        sortBy: 'date_desc',
        grouping: 'none',
        groupByLanguage: false
    })

    const printWhenReady = async () => {
        if ('fonts' in document) await document.fonts.ready
        const images = Array.from(document.querySelectorAll<HTMLImageElement>('.catalog-print-root img'))
        await Promise.all(images.map(image => {
            if (image.complete) return Promise.resolve()
            return new Promise<void>(resolve => {
                image.addEventListener('load', () => resolve(), { once: true })
                image.addEventListener('error', () => resolve(), { once: true })
            })
        }))
        window.print()
    }

    useEffect(() => {
        if (!triggerEvent) return
        
        const handleTrigger = () => {
            setIsVisitor(true)
            setConfig(prev => ({ ...prev, booksPerPage: 12 }))
            setIsOpen(true)
        }
        window.addEventListener(triggerEvent, handleTrigger)
        return () => window.removeEventListener(triggerEvent, handleTrigger)
    }, [triggerEvent])

    // Auto-download for visitors
    useEffect(() => {
        if (isVisitor && isOpen && allBooks.length > 0) {
            setTimeout(async () => {
                await printWhenReady()
                setIsOpen(false)
            }, 1500)
        }
    }, [isVisitor, isOpen, allBooks])

    useEffect(() => {
        setIsOpen(initialIsOpen)
    }, [initialIsOpen])

    useEffect(() => {
        if (isOpen) {
            const loadData = async () => {
                const [result, whResult] = await Promise.all([
                    getAllBooksForCatalog(),
                    getWarehouses().catch(() => [])
                ])
                if (result.success && result.data) {
                    setAllBooks(result.data)
                    const uniqueCats = Array.from(new Set(result.data.map((b: any) => b.category).filter(Boolean))) as string[]
                    setCategories(uniqueCats.sort())
                }
                if (Array.isArray(whResult)) {
                    setWarehouses(whResult)
                }
            }
            loadData()
        }
    }, [isOpen])

    if (!isOpen) return null

    const handleClose = () => {
        setIsOpen(false)
        onClose()
    }

    const filteredBooks = allBooks.filter(b => {
        const matchesCategory = config.selectedCategory === 'all' || b.category === config.selectedCategory
        const matchesWarehouse = config.selectedWarehouse === 'all' || (b.inventories && b.inventories.some((inv: any) => inv.warehouseId === config.selectedWarehouse && inv.quantity > 0))
        return matchesCategory && matchesWarehouse
    })

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

    const chunkBooks = (arr: any[], size: number) => {
        return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
            arr.slice(i * size, i * size + size)
        )
    }

    const handleGenerate = async () => {
        if (sortedBooks.length === 0) {
            alert('Aucun livre trouvé.')
            return
        }
        setIsGenerating(true)
        try {
            await printWhenReady()
        } finally {
            setIsGenerating(false)
        }
    }

    const languageNames: { [key: string]: string } = {
        fr: 'Langue : Français',
        ar: 'اللغة : العربية',
        en: 'Language : English'
    }

    const getBookPages = () => {
        if (config.grouping === 'category') {
            const booksByCategory: { [cat: string]: any[] } = {}
            sortedBooks.forEach(book => {
                const cat = book.category || 'Non classé'
                if (!booksByCategory[cat]) booksByCategory[cat] = []
                booksByCategory[cat].push(book)
            })

            const pages: { groupTitle: string; books: any[] }[] = []
            const sortedCats = Object.keys(booksByCategory).sort((a, b) => a.localeCompare(b))
            sortedCats.forEach(cat => {
                const chunks = chunkBooks(booksByCategory[cat], config.booksPerPage)
                chunks.forEach(chunk => {
                    pages.push({ groupTitle: `Catégorie : ${cat}`, books: chunk })
                })
            })
            return pages
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

            const pages: { groupTitle: string; books: any[] }[] = []
            const sortedLanguages = Object.keys(booksByLanguage).sort()
            sortedLanguages.forEach(lang => {
                const chunks = chunkBooks(booksByLanguage[lang], config.booksPerPage)
                chunks.forEach(chunk => {
                    pages.push({ groupTitle: languageNames[lang] || lang, books: chunk })
                })
            })

            return pages
        }

        return chunkBooks(sortedBooks, config.booksPerPage).map(chunk => ({
            groupTitle: '',
            books: chunk
        }))
    }

    const bookPages = getBookPages()
    const numRows = Math.ceil(config.booksPerPage / 2)

    // Définition des styles de motifs
    const getPatternStyle = () => {
        switch (config.pattern) {
            case 'stripes':
                return { backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.015) 10px, rgba(0,0,0,0.015) 20px)' };
            case 'dots':
                return { backgroundImage: 'radial-gradient(rgba(0,0,0,0.04) 1px, transparent 1px)', backgroundSize: '15px 15px' };
            case 'grid':
                return { backgroundImage: 'linear-gradient(rgba(0,0,0,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.02) 1px, transparent 1px)', backgroundSize: '25px 25px' };
            default:
                return {};
        }
    }

    return (
        <>
            <div className={`fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all duration-300 print:hidden ${isVisitor ? 'opacity-0 pointer-events-none' : ''}`}>
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 border border-white/20">
                    <div className="bg-slate-900 p-6 flex items-center justify-between text-white border-b border-slate-800 shadow-xl">
                        <div className="flex items-center gap-3">
                            <FileText className="w-6 h-6 text-blue-400" />
                            <h2 className="text-xl font-black uppercase tracking-tight">Catalogue Riwaya</h2>
                        </div>
                        <button aria-label="Fermer" onClick={handleClose} className="p-2 hover:bg-white/20 rounded-full transition-colors font-bold"><X className="w-6 h-6" /></button>
                    </div>

                    <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                        <div className="space-y-4">
                            <h3 className="font-semibold text-gray-900 border-b pb-2 flex items-center gap-2">
                                <Type className="w-4 h-4 text-blue-600" /> Texte
                            </h3>
                            <input 
                                type="text"
                                value={config.title}
                                onChange={(e) => setConfig({...config, title: e.target.value})}
                                className="w-full px-4 py-2 border rounded-lg"
                                placeholder="Titre"
                            />
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-semibold text-gray-900 border-b pb-2 flex items-center gap-2">
                                <Palette className="w-4 h-4 text-blue-600" /> Apparence
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Couleur de fond</label>
                                    <div className="flex gap-2">
                                        {['#ffffff', '#fdfbf7', '#f3f4f6', '#f0f9ff', '#f0fdf4'].map(color => (
                                            <button
                                                key={color}
                                                onClick={() => setConfig({...config, backgroundColor: color})}
                                                className={`w-6 h-6 rounded-full border-2 ${config.backgroundColor === color ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Motif de fond</label>
                                    <div className="flex gap-3">
                                        {[
                                            { id: 'none', label: 'Aucun' },
                                            { id: 'stripes', label: 'Rayures' },
                                            { id: 'dots', label: 'Points' },
                                            { id: 'grid', label: 'Grille' }
                                        ].map(p => (
                                            <button
                                                key={p.id}
                                                onClick={() => setConfig({...config, pattern: p.id})}
                                                className={`px-3 py-1 rounded-md text-xs font-bold transition-all border ${config.pattern === p.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-blue-400'}`}
                                            >
                                                {p.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            <div className="space-y-3">
                                <h3 className="font-semibold text-gray-900 border-b pb-2 flex items-center gap-2 text-sm">
                                    <Warehouse className="w-4 h-4 text-blue-600" /> Catalogue de quel entrepôt
                                </h3>
                                <select aria-label="Catalogue de quel entrepôt" 
                                    value={config.selectedWarehouse}
                                    onChange={(e) => setConfig({...config, selectedWarehouse: e.target.value})}
                                    className="w-full px-4 py-2.5 border rounded-xl text-sm bg-white font-medium"
                                >
                                    <option value="all">Tous les entrepôts</option>
                                    {warehouses.map(w => (
                                        <option key={w.id} value={w.id}>
                                            {w.name} {w.location ? `(${w.location})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-3">
                                <h3 className="font-semibold text-gray-900 border-b pb-2 flex items-center gap-2 text-sm">
                                    <Filter className="w-4 h-4 text-blue-600" /> Catégorie
                                </h3>
                                <select aria-label="Champ de sélection" 
                                    value={config.selectedCategory}
                                    onChange={(e) => setConfig({...config, selectedCategory: e.target.value})}
                                    className="w-full px-4 py-2.5 border rounded-xl text-sm bg-white font-medium"
                                >
                                    <option value="all">Toutes les catégories</option>
                                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>

                            <div className="space-y-3">
                                <h3 className="font-semibold text-gray-900 border-b pb-2 flex items-center gap-2 text-sm">
                                    <ArrowUpDown className="w-4 h-4 text-blue-600" /> Trier par
                                </h3>
                                <select aria-label="Ordre de tri" 
                                    value={config.sortBy}
                                    onChange={(e) => setConfig({...config, sortBy: e.target.value})}
                                    className="w-full px-4 py-2.5 border rounded-xl text-sm bg-white font-medium"
                                >
                                    <option value="date_desc">Date d'ajout (Plus récents)</option>
                                    <option value="date_asc">Date d'ajout (Plus anciens)</option>
                                    <option value="title_asc">Titre (A à Z)</option>
                                    <option value="title_desc">Titre (Z à A)</option>
                                    <option value="price_asc">Prix croissant (Moins cher)</option>
                                    <option value="price_desc">Prix décroissant (Plus cher)</option>
                                </select>
                            </div>

                            <div className="space-y-3">
                                <h3 className="font-semibold text-gray-900 border-b pb-2 flex items-center gap-2 text-sm">
                                    <Layers className="w-4 h-4 text-blue-600" /> Regrouper par
                                </h3>
                                <select aria-label="Regroupement" 
                                    value={config.grouping}
                                    onChange={(e) => setConfig({...config, grouping: e.target.value})}
                                    className="w-full px-4 py-2.5 border rounded-xl text-sm bg-white font-medium"
                                >
                                    <option value="none">Aucun regroupement (Continu)</option>
                                    <option value="category">Par Catégorie (Page dédiée)</option>
                                    <option value="language">Par Langue (Français, Arabe, Anglais)</option>
                                </select>
                            </div>

                            <div className="space-y-3">
                                <h3 className="font-semibold text-gray-900 border-b pb-2 flex items-center gap-2 text-sm">
                                    <LayoutList className="w-4 h-4 text-blue-600" /> Livres par page
                                </h3>
                                <select aria-label="Champ de sélection" 
                                    value={config.booksPerPage}
                                    onChange={(e) => setConfig({...config, booksPerPage: Number(e.target.value)})}
                                    className="w-full px-4 py-2.5 border rounded-xl text-sm bg-white font-medium"
                                >
                                    <option value="6">6 livres / page</option>
                                    <option value="12">12 livres / page</option>
                                    <option value="18">18 livres / page</option>
                                </select>
                            </div>

                            <div className="space-y-3">
                                <h3 className="font-semibold text-gray-900 border-b pb-2 flex items-center gap-2 text-sm">
                                    <Globe className="w-4 h-4 text-blue-600" /> Affichage
                                </h3>
                                <div className="pt-2">
                                    <label className="flex items-center gap-2.5 cursor-pointer">
                                        <input 
                                            type="checkbox"
                                            checked={config.showPrice}
                                            onChange={(e) => setConfig({...config, showPrice: e.target.checked})}
                                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                        />
                                        <span className="text-sm font-semibold text-gray-700">Afficher le prix sur les fiches</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 bg-gray-50 flex justify-end gap-3 border-t">
                        <button onClick={onClose} className="px-6 py-2.5 text-gray-700 font-bold rounded-xl hover:bg-gray-100 transition-colors">Annuler</button>
                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating || sortedBooks.length === 0}
                            className="px-8 py-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition-all disabled:opacity-50"
                        >
                            {isGenerating ? 'Préparation...' : 'Générer le PDF'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Print Area */}
            <div className="catalog-print-root hidden print:block absolute top-0 left-0 w-full" style={{ backgroundColor: config.backgroundColor, ...getPatternStyle() }}>
                <style dangerouslySetInnerHTML={{ __html: `
                    @media print {
                        @page { margin: 0; size: A4; }
                        body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; box-sizing: border-box; }
                        aside, header, nav, .print-hidden, button, input, .search-bar, .lucide { display: none !important; }
                        .catalog-print-area .lucide { display: block !important; }
                        .pl-64 { padding-left: 0 !important; }
                        main { padding: 0 !important; }
                        .catalog-print-root { position: absolute !important; inset: 0 !important; width: 210mm !important; }
                        .catalog-page {
                            width: 210mm !important;
                            height: 297mm !important;
                            padding: 12mm !important;
                            box-sizing: border-box !important;
                            overflow: hidden !important;
                            position: relative !important;
                            break-after: page !important;
                            page-break-after: always !important;
                        }
                        .catalog-page:last-child { break-after: auto !important; page-break-after: auto !important; }
                        .catalog-cover { display: flex !important; flex-direction: column !important; padding: 0 !important; }
                        .catalog-cover-hero { height: 119mm !important; display: flex !important; align-items: center !important; justify-content: center !important; }
                        .catalog-cover-body { height: 178mm !important; display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: center !important; text-align: center !important; padding: 10mm !important; box-sizing: border-box !important; }
                        .catalog-page-header { height: 11mm !important; box-sizing: border-box !important; margin: 0 0 4mm !important; }
                        .catalog-grid {
                            display: grid !important;
                            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                            grid-template-rows: repeat(var(--catalog-rows), minmax(0, 1fr)) !important;
                            gap: 3mm 4mm !important;
                            height: 258mm !important;
                            min-height: 0 !important;
                        }
                        .catalog-card {
                            display: flex !important;
                            min-width: 0 !important;
                            min-height: 0 !important;
                            height: auto !important;
                            padding: 3mm !important;
                            gap: 3mm !important;
                            box-sizing: border-box !important;
                            overflow: hidden !important;
                            break-inside: avoid !important;
                            page-break-inside: avoid !important;
                        }
                        .catalog-card-image { width: 35% !important; height: 100% !important; flex: 0 0 35% !important; padding: 1.5mm !important; box-sizing: border-box !important; overflow: hidden !important; }
                        .catalog-card-image img { display: block !important; width: 100% !important; height: 100% !important; max-width: 100% !important; max-height: 100% !important; object-fit: contain !important; }
                        .catalog-card-content { display: flex !important; flex-direction: column !important; flex: 1 1 0 !important; min-width: 0 !important; min-height: 0 !important; overflow: hidden !important; }
                        .catalog-card-footer { margin-top: auto !important; flex-shrink: 0 !important; }
                    }
                `}} />

                {/* Cover Page */}
                <div className="catalog-page catalog-cover" style={{ ...getPatternStyle() }}>
                    <div className="catalog-cover-hero w-full shadow-lg" style={{ backgroundColor: config.primaryColor }}>
                        <div className="catalog-print-area"><BookIcon className="w-32 h-32 text-white/30 lucide" /></div>
                    </div>
                    <div className="catalog-cover-body">
                        <h1 className="text-6xl font-black text-gray-900 mb-4 tracking-tighter uppercase">{config.title}</h1>
                        <p className="text-2xl text-gray-400 italic mb-10">
                            {config.selectedCategory !== 'all' ? `Collection : ${config.selectedCategory}` : config.subtitle}
                        </p>
                        <div className="w-20 h-1 bg-blue-600 mb-10"></div>
                        <p className="text-sm font-bold text-gray-300 tracking-[0.5em] uppercase tracking-widest">Riwaya Catalogue</p>
                    </div>
                </div>

                {/* Book Pages */}
                {bookPages.map(({ groupTitle, books }, pageIdx) => (
                    <div key={pageIdx} className="catalog-page" style={{ ...getPatternStyle() }}>
                        <div className="catalog-page-header flex items-center justify-between border-b pb-2" style={{ borderColor: config.primaryColor + '33' }}>
                            {groupTitle ? (
                                <span className="text-xs font-black uppercase tracking-widest" style={{ color: config.primaryColor }}>
                                    {groupTitle}
                                </span>
                            ) : <span />}
                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                    Partie {pageIdx + 1} / {bookPages.length}
                                </span>
                        </div>
                        <div className="catalog-grid" style={{ '--catalog-rows': numRows } as CSSProperties}>
                            {books.map((book, idx) => (
                                <div 
                                    key={idx} 
                                    className="catalog-card border border-gray-100 rounded-2xl shadow-sm"
                                    style={{ backgroundColor: 'white' }}
                                >
                                    <div className="catalog-card-image bg-gray-100 rounded-xl flex items-center justify-center">
                                        {book.image ? (
                                            <img src={normalizeImage(book.image)} alt={getLocalizedTitle(book)} className="h-full w-full object-contain" />
                                        ) : (
                                            <div className="catalog-print-area"><ImageIcon className="w-8 h-8 text-gray-200 lucide" /></div>
                                        )}
                                    </div>
                                    <div className="catalog-card-content py-1">
                                        <div className="flex-1 overflow-hidden">
                                            <h3 className="text-sm font-black text-gray-900 uppercase line-clamp-2 mb-1">{getLocalizedTitle(book)}</h3>
                                            <p className="text-[10px] text-blue-600 font-bold truncate mb-2">{book.author}</p>
                                            <p className="text-[9px] text-gray-400 line-clamp-3 leading-relaxed italic">{book.description || "Sélectionné par nos soins."}</p>
                                        </div>
                                        <div className="catalog-card-footer flex items-center justify-between pt-2 border-t border-gray-50">
                                            {config.showPrice && <span className="text-base font-black text-gray-900">{book.price} درهم</span>}
                                            {book.category && <span className="text-[8px] font-bold text-gray-400 uppercase border border-gray-200 px-2 py-0.5 rounded truncate">{book.category}</span>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </>
    )
}
