'use client'

import { useState, useEffect } from 'react'
import { Link } from '@/i18n/routing'
import { Edit, Trash2, Eye, EyeOff, Search, Check, X, Edit3, ImageIcon, FileDown, GripVertical, LayoutGrid, List, Upload, Send, MessageSquare, MoreVertical, ExternalLink, Video, Zap, FileText, Image, Layers, ChevronRight, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react'
import { deleteBook, toggleBookStatus, bulkDeleteBooks, updateBookQuick, updateBookOrder, bulkUpdateBookPrices } from '@/lib/actions/books'
import { useRouter, usePathname } from 'next/navigation'
import ImageWithFallback from '@/components/ImageWithFallback'
import BookCreativeModal from '@/components/admin/BookCreativeModal'
import BookDescriptionModal from '@/components/admin/BookDescriptionModal'
import N8nPublishModal from '@/components/admin/N8nPublishModal'
import BulkPublishModal from '@/components/admin/BulkPublishModal'
import CaptionPreviewModal from '@/components/admin/CaptionPreviewModal'
import VideoStudioModal from '@/components/admin/VideoStudioModal'
import { normalizeImage } from '@/lib/utils'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'

interface Book {
    id: string
    title: string
    author: string
    price: number
    stock: number
    image: string
    category: string | null
    language: string
    description: string
    longDescription?: string | null
    active: boolean
    isOriginal: boolean
    orderCount?: number
    productType?: string
    sellerSku?: string | null
    isSyncedWithJumia?: boolean
    jumiaStock?: number | null
    hasArticle?: boolean
}

interface ActiveFilters {
    search: string;
    status: string;
    type: string;
    lang: string;
    sort: string;
}

export default function BooksTable({ books, pageNumber, totalProviderPages, activeFilters, limit = 20 }: { books: Book[], pageNumber: number, totalProviderPages: number, activeFilters: ActiveFilters, limit?: number }) {
    const [loading, setLoading] = useState<string | null>(null)
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [bulkLoading, setBulkLoading] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editData, setEditData] = useState({ price: 0, stock: 0, active: true })
    const [creativeBook, setCreativeBook] = useState<Book | null>(null)
    const [creativeFormat, setCreativeFormat] = useState<'post' | 'story'>('post')
    const [descriptionBook, setDescriptionBook] = useState<Book | null>(null)
    const [descriptionFormat, setDescriptionFormat] = useState<'post' | 'story'>('post')
    const [n8nBook, setN8nBook] = useState<Book | null>(null)
    const [n8nFormat, setN8nFormat] = useState<'post' | 'story'>('post')
    const [videoStudioBook, setVideoStudioBook] = useState<Book | null>(null)
    const [previewCaptionBook, setPreviewCaptionBook] = useState<Book | null>(null)
    const [quickPublishing, setQuickPublishing] = useState<string | null>(null)
    const [openDropdown, setOpenDropdown] = useState<string | null>(null)
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
    const [orderedBooks, setOrderedBooks] = useState(books)
    const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list')
    const [bulkPrice, setBulkPrice] = useState<string>('')
    const [isUpdatingPrice, setIsUpdatingPrice] = useState(false)
    const [isBulkPublishOpen, setIsBulkPublishOpen] = useState(false)
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        setOrderedBooks(books)
    }, [books])

    const onDragEnd = async (result: DropResult) => {
        if (!result.destination) return
        if (result.destination.index === result.source.index) return

        const items = Array.from(orderedBooks)
        const [reorderedItem] = items.splice(result.source.index, 1)
        items.splice(result.destination.index, 0, reorderedItem)

        setOrderedBooks(items)

        const offset = (pageNumber - 1) * limit
        const res = await updateBookOrder(items.map(b => b.id), offset)
        if (!res.success) {
            alert(res.error)
            setOrderedBooks(books)
        } else {
            setToast({ msg: 'Ordre mis à jour', ok: true })
            router.refresh()
            setTimeout(() => setToast(null), 2000)
        }
    }

    const handleQuickEdit = (book: Book) => {
        setEditingId(book.id)
        setEditData({ price: book.price, stock: book.stock, active: book.active })
    }

    // Publication immédiate sans modal
    const handleQuickPublish = async (book: Book) => {
        setQuickPublishing(book.id)
        try {
            const res = await fetch('/api/n8n/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    bookId: book.id,
                    format: 'post',
                    platform: 'both',
                    useDescription: 'short',
                    scheduleAt: null
                })
            })
            const data = await res.json()
            if (data.success) {
                setToast({ msg: `✅ "${book.title}" envoyé à n8n pour publication`, ok: true })
                setTimeout(() => setToast(null), 4000)
            } else {
                setToast({ msg: `❌ ${data.error || 'Erreur n8n'}`, ok: false })
                setTimeout(() => setToast(null), 5000)
            }
        } catch {
            setToast({ msg: '❌ Erreur réseau — vérifiez que n8n tourne', ok: false })
            setTimeout(() => setToast(null), 5000)
        } finally {
            setQuickPublishing(null)
        }
    }

    const saveQuickEdit = async () => {
        if (!editingId) return
        setLoading(editingId)
        const result = await updateBookQuick(editingId, editData)
        setLoading(null)
        if (result.success) {
            setEditingId(null)
        } else {
            alert(result.error)
        }
    }

    const handleSearch = (e: React.FormEvent) => {
        // Removed - handled by BookFilters
    }

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(books.map(b => b.id))
        } else {
            setSelectedIds([])
        }
    }

    const handleSelectOne = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
    }

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return
        if (!confirm(`Êtes-vous sûr de vouloir supprimer ${selectedIds.length} livre(s) ?`)) return

        setBulkLoading(true)
        const result = await bulkDeleteBooks(selectedIds)
        setBulkLoading(false)

        if (result.success) {
            setSelectedIds([])
        } else {
            alert(result.error)
        }
    }

    const handleBulkPriceUpdate = async () => {
        if (selectedIds.length === 0 || !bulkPrice) return
        const price = Number(bulkPrice)
        if (isNaN(price)) return alert('Prix invalide')
        
        if (!confirm(`Êtes-vous sûr de vouloir changer le prix de ${selectedIds.length} livre(s) à ${price} MAD ?`)) return

        setIsUpdatingPrice(true)
        const result = await bulkUpdateBookPrices(selectedIds, price)
        setIsUpdatingPrice(false)

        if (result.success) {
            setBulkPrice('')
            setSelectedIds([])
            setToast({ msg: `✅ Prix mis à jour pour ${selectedIds.length} livres`, ok: true })
            setTimeout(() => setToast(null), 4000)
        } else {
            alert(result.error)
        }
    }

    // Export Excel de tous les livres
    const handleExportExcel = async () => {
        try {
            const params = new URLSearchParams()
            if (activeFilters.search) params.set('search', activeFilters.search)
            if (activeFilters.status) params.set('status', activeFilters.status)
            if (activeFilters.type) params.set('type', activeFilters.type)
            if (activeFilters.lang) params.set('lang', activeFilters.lang)
            if (activeFilters.sort) params.set('sort', activeFilters.sort)

            const res = await fetch(`/api/admin/books/export-excel?${params.toString()}`)
            if (!res.ok) throw new Error('Export échoué')
            const blob = await res.blob()
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `livres_export_${new Date().toISOString().split('T')[0]}.xlsx`
            a.click()
            URL.revokeObjectURL(url)
            setToast({ msg: 'Export Excel téléchargé', ok: true })
            setTimeout(() => setToast(null), 4000)
        } catch {
            setToast({ msg: 'Erreur lors de l\'export Excel', ok: false })
            setTimeout(() => setToast(null), 5000)
        }
    }

    // Export Excel Jumia pour les livres sélectionnés
    const handleExportJumia = async () => {
        if (selectedIds.length === 0) return
        try {
            const res = await fetch('/api/admin/books/export-jumia', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedIds })
            })
            if (!res.ok) throw new Error('Export échoué')
            const blob = await res.blob()
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `jumia_export_${new Date().toISOString().split('T')[0]}.xlsx`
            a.click()
            URL.revokeObjectURL(url)
        } catch {
            setToast({ msg: '❌ Erreur lors de l\'export Jumia', ok: false })
            setTimeout(() => setToast(null), 5000)
        }
    }

    // Publier vers Jumia
    const handlePublishJumia = async () => {
        if (selectedIds.length === 0) return
        if (!confirm(`Publier ${selectedIds.length} livre(s) sur Jumia ?`)) return

        setBulkLoading(true)
        try {
            const { publishBooksToJumia } = await import('@/lib/actions/jumia')
            const result = await publishBooksToJumia(selectedIds)
            if (result.success) {
                setToast({ msg: `✅ ${result.message}`, ok: true })
                setSelectedIds([])
            } else {
                setToast({ msg: `❌ ${result.message}`, ok: false })
            }
            setTimeout(() => setToast(null), 5000)
        } catch (error) {
            setToast({ msg: '❌ Erreur de publication', ok: false })
            setTimeout(() => setToast(null), 5000)
        } finally {
            setBulkLoading(false)
        }
    }

    async function handleDelete(id: string, title: string) {
        if (!confirm(`Êtes-vous sûr de vouloir supprimer "${title}" ?`)) {
            return
        }

        setLoading(id)
        const result = await deleteBook(id)
        setLoading(null)

        if (!result.success) {
            alert(result.error)
        }
    }

    async function handleToggleStatus(id: string, currentStatus: boolean) {
        setLoading(id)
        const result = await toggleBookStatus(id, !currentStatus)
        setLoading(null)

        if (!result.success) {
            alert(result.error)
        }
    }

    const buildUrl = (page: number, newLimit?: number) => {
        const params = new URLSearchParams()
        if (activeFilters.search?.trim()) params.set('search', activeFilters.search.trim())
        if (activeFilters.status) params.set('status', activeFilters.status)
        if (activeFilters.type) params.set('type', activeFilters.type)
        if (activeFilters.lang) params.set('lang', activeFilters.lang)
        if (activeFilters.sort) params.set('sort', activeFilters.sort)
        if (newLimit || limit !== 20) params.set('limit', (newLimit || limit).toString())
        params.set('page', page.toString())
        return `${pathname}?${params.toString()}`
    }

    const handleSort = (column: 'price' | 'stock' | 'orders') => {
        let newSort = `${column}-desc`;
        if (activeFilters.sort === `${column}-desc`) {
            newSort = `${column}-asc`;
        }
        
        const params = new URLSearchParams()
        if (activeFilters.search?.trim()) params.set('search', activeFilters.search.trim())
        if (activeFilters.status) params.set('status', activeFilters.status)
        if (activeFilters.type) params.set('type', activeFilters.type)
        if (activeFilters.lang) params.set('lang', activeFilters.lang)
        params.set('sort', newSort)
        params.set('limit', limit.toString())
        params.set('page', '1')
        router.push(`${pathname}?${params.toString()}`)
    }

    const getSortIcon = (column: 'price' | 'stock' | 'orders') => {
        if (activeFilters.sort === `${column}-asc`) return <ArrowUp className="w-3 h-3 ml-1" />
        if (activeFilters.sort === `${column}-desc`) return <ArrowDown className="w-3 h-3 ml-1" />
        return <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />
    }

    const renderPaginationNumbers = () => {
        const pages = [];
        const maxVisiblePages = 5;
        let startPage = Math.max(1, pageNumber - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalProviderPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        if (startPage > 1) {
            pages.push(
                <button key={1} onClick={() => router.push(buildUrl(1))} className={`px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 transition-colors`}>1</button>
            );
            if (startPage > 2) {
                pages.push(<span key="dots1" className="px-2 text-gray-500">...</span>);
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(
                <button
                    key={i}
                    onClick={() => router.push(buildUrl(i))}
                    className={`px-3 py-1 border border-gray-300 rounded text-sm transition-colors ${pageNumber === i ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700' : 'hover:bg-gray-50'}`}
                >
                    {i}
                </button>
            );
        }

        if (endPage < totalProviderPages) {
            if (endPage < totalProviderPages - 1) {
                pages.push(<span key="dots2" className="px-2 text-gray-500">...</span>);
            }
            pages.push(
                <button key={totalProviderPages} onClick={() => router.push(buildUrl(totalProviderPages))} className={`px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 transition-colors`}>{totalProviderPages}</button>
            );
        }

        return pages;
    };

    return (
        <div className="space-y-4">
            {/* Toast notification */}
            {toast && (
                <div className={`fixed top-6 right-6 z-[9999] px-5 py-3 rounded-xl shadow-2xl text-sm font-bold transition-all animate-in slide-in-from-top-2 ${toast.ok ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                    {toast.msg}
                </div>
            )}
            <div className="p-4 bg-white border-b border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                        Total: <span className="text-gray-900 font-black">{books.length}</span> livres affichés
                    </p>
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                        <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-900'}`} title="Vue Liste"><List className="w-4 h-4"/></button>
                        <button onClick={() => setViewMode('kanban')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'kanban' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-900'}`} title="Vue Kanban"><LayoutGrid className="w-4 h-4"/></button>
                    </div>
                    <select
                        value={limit}
                        onChange={(e) => router.push(buildUrl(1, Number(e.target.value)))}
                        className="px-3 py-1.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 bg-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    >
                        <option value="20">20 / page</option>
                        <option value="50">50 / page</option>
                        <option value="100">100 / page</option>
                        <option value="10000">Toutes</option>
                    </select>
                </div>
                <button
                    onClick={handleExportExcel}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-green-700 transition shadow-sm"
                    title="Exporter tous les livres en Excel"
                >
                    <FileDown className="w-4 h-4" />
                    Export Excel
                </button>
            </div>

            {books.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-gray-500">Aucun livre trouvé {activeFilters.search && `pour "${activeFilters.search}"`}</p>
                </div>
            ) : (
                <>
                    {selectedIds.length > 0 && (
                        <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200 mx-4 mt-4 flex-wrap">
                            <span className="text-sm font-black text-gray-900">{selectedIds.length} livre(s) sélectionnés</span>
                            
                            <div className="h-6 w-px bg-gray-300 mx-2 hidden sm:block"></div>

                            <div className="flex items-center gap-2">
                                <input 
                                    type="number" 
                                    placeholder="Nouveau prix..."
                                    value={bulkPrice}
                                    onChange={(e) => setBulkPrice(e.target.value)}
                                    className="w-32 px-3 py-2 text-xs font-bold border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <button
                                    onClick={handleBulkPriceUpdate}
                                    disabled={isUpdatingPrice || !bulkPrice}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-700 transition shadow-sm disabled:opacity-50"
                                >
                                    {isUpdatingPrice ? 'Mise à jour...' : 'Changer Prix'}
                                </button>
                            </div>

                            <div className="h-6 w-px bg-gray-300 mx-2 hidden sm:block"></div>

                            {/* Bouton export Jumia */}
                            <button
                                onClick={handleExportJumia}
                                className="flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-orange-600 transition"
                                title="Exporter au format Excel Jumia Vendor"
                            >
                                <FileDown className="w-4 h-4" />
                                Export
                            </button>
                            <button
                                onClick={handlePublishJumia}
                                disabled={bulkLoading}
                                className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-orange-700 transition"
                                title="Publier directement via l'API Jumia"
                            >
                                <Upload className="w-4 h-4" />
                                Publier Jumia
                            </button>
                            <button
                                onClick={() => setIsBulkPublishOpen(true)}
                                disabled={bulkLoading}
                                className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-purple-700 transition"
                                title="Publier en boucle sur les réseaux sociaux (n8n)"
                            >
                                <Send className="w-4 h-4" />
                                Publier Réseaux
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                disabled={bulkLoading}
                                className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-700 transition"
                            >
                                <Trash2 className="w-4 h-4" />
                                {bulkLoading ? 'Suppression...' : 'Supprimer'}
                            </button>
                        </div>
                    )}
                    <div className={`overflow-x-auto ${viewMode === 'kanban' ? 'hidden' : ''}`}>
                        <DragDropContext onDragEnd={onDragEnd}>
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 w-10 text-left">
                                            <input
                                                type="checkbox"
                                                onChange={handleSelectAll}
                                                checked={books.length > 0 && selectedIds.length === books.length}
                                                className="rounded border-gray-300 text-black focus:ring-black"
                                            />
                                        </th>
                                        <th className="px-4 py-3 w-8"></th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Livre
                                        </th>
                                        <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Catégorie
                                        </th>
                                        <th className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Langue
                                        </th>
                                        <th 
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                            onClick={() => handleSort('price')}
                                        >
                                            <div className="flex items-center">Prix {getSortIcon('price')}</div>
                                        </th>
                                        <th 
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                            onClick={() => handleSort('stock')}
                                        >
                                            <div className="flex items-center">Stock {getSortIcon('stock')}</div>
                                        </th>
                                        <th 
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                            onClick={() => handleSort('orders')}
                                        >
                                            <div className="flex items-center">Commandes {getSortIcon('orders')}</div>
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Statut
                                        </th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Jumia
                                        </th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Qté Synch
                                        </th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Lié à un article
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <Droppable droppableId="books-list">
                                    {(provided) => (
                                        <tbody 
                                            {...provided.droppableProps} 
                                            ref={provided.innerRef}
                                            className="bg-white divide-y divide-gray-200"
                                        >
                                            {orderedBooks.map((book, index) => (
                                                <Draggable key={book.id} draggableId={book.id} index={index}>
                                                    {(provided, snapshot) => (
                                                        <tr 
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            className={`transition-colors ${snapshot.isDragging ? 'bg-blue-50 shadow-lg' : 'hover:bg-gray-50'}`}
                                                        >
                                                            <td className="px-6 py-4">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedIds.includes(book.id)}
                                                                    onChange={() => handleSelectOne(book.id)}
                                                                    className="rounded border-gray-300 text-black focus:ring-black"
                                                                />
                                                            </td>
                                                            <td className="px-4 py-4 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600" {...provided.dragHandleProps}>
                                                                <GripVertical className="w-5 h-5" />
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="flex items-center">
                                                                    <div className="h-12 w-10 flex-shrink-0">
                                                                        <img
                                                                            src={normalizeImage(book.image)}
                                                                            alt={book.title}
                                                                            className="w-full h-full object-cover rounded"
                                                                            onError={(e) => { (e.target as HTMLImageElement).src = '/book-placeholder.png' }}
                                                                        />
                                                                    </div>
                                                                    <div className="ml-4">
                                                                        <div className="text-sm font-medium text-gray-900 flex flex-wrap items-center gap-2">
                                                                            <Link 
                                                                                href={book.productType === 'PACK' ? `/admin/packs/${book.id}/edit` : book.productType === 'EXTRA' ? `/admin/accessories/${book.id}` : `/admin/books/${book.id}/edit?${new URLSearchParams({ page: pageNumber.toString(), ...(activeFilters.search ? {search: activeFilters.search} : {}), ...(activeFilters.status ? {status: activeFilters.status} : {}), ...(activeFilters.type ? {type: activeFilters.type} : {}), ...(activeFilters.lang ? {lang: activeFilters.lang} : {}), ...(activeFilters.sort ? {sort: activeFilters.sort} : {}) }).toString()}`}
                                                                                className="hover:text-blue-600 hover:underline transition-colors"
                                                                            >
                                                                                {book.title}
                                                                            </Link>
                                                                            <span className={`px-1.5 py-0.5 text-[8px] font-black uppercase tracking-tighter rounded-md border ${book.isOriginal ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                                                                {book.isOriginal ? 'Original' : 'Copie'}
                                                                            </span>
                                                                        </div>
                                                                        <div className="text-sm text-gray-500">
                                                                            {book.author}
                                                                            {book.sellerSku && (
                                                                                <span className="ml-2 px-1.5 py-0.5 text-[9px] font-mono bg-gray-100 text-gray-600 rounded inline-flex items-center gap-1">
                                                                                    SKU: {book.sellerSku}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                                                    {book.productType === 'PACK' ? 'Pack' : book.productType === 'EXTRA' ? `Accessoire: ${book.category || ''}` : book.category || 'N/A'}
                                                                </span>
                                                            </td>
                                                            <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap">
                                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 uppercase">
                                                                    {book.language}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                                {editingId === book.id ? (
                                                                    <input
                                                                        type="number"
                                                                        value={editData.price}
                                                                        onChange={e => setEditData({ ...editData, price: Number(e.target.value) })}
                                                                        className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                                    />
                                                                ) : (
                                                                    <>{book.price} MAD</>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                {editingId === book.id ? (
                                                                    <input
                                                                        type="number"
                                                                        value={editData.stock}
                                                                        onChange={e => setEditData({ ...editData, stock: Number(e.target.value) })}
                                                                        className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                                    />
                                                                ) : (
                                                                    <span className={`text-sm font-medium ${book.stock > 10 ? 'text-green-600' : book.stock > 0 ? 'text-orange-600' : 'text-red-600'}`}>
                                                                        {book.stock} unités
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                                                    {book.orderCount || 0} fois
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                {editingId === book.id ? (
                                                                    <select
                                                                        value={editData.active ? 'true' : 'false'}
                                                                        onChange={e => setEditData({ ...editData, active: e.target.value === 'true' })}
                                                                        className={`text-xs px-2 py-1 rounded border outline-none font-medium ${editData.active ? 'border-green-500 text-green-700 bg-green-50' : 'border-gray-400 text-gray-700 bg-gray-50'}`}
                                                                    >
                                                                        <option value="true">✅ Actif</option>
                                                                        <option value="false">❌ Inactif</option>
                                                                    </select>
                                                                ) : (
                                                                    <button
                                                                        onClick={() => handleToggleStatus(book.id, book.active)}
                                                                        disabled={loading === book.id}
                                                                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${book.active
                                                                            ? 'bg-green-100 text-green-800'
                                                                            : 'bg-gray-100 text-gray-800'
                                                                            } hover:opacity-80 transition-opacity`}
                                                                    >
                                                                        {book.active ? (
                                                                            <>
                                                                                <Eye className="w-3 h-3 mr-1" />
                                                                                Actif
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <EyeOff className="w-3 h-3 mr-1" />
                                                                                Inactif
                                                                            </>
                                                                        )}
                                                                    </button>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                                                <span className={book.isSyncedWithJumia ? 'text-green-600' : 'text-gray-400'}>
                                                                    {book.isSyncedWithJumia ? <Check className="w-4 h-4 mx-auto" /> : '-'}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                                                <span className={book.jumiaStock != null && book.stock === book.jumiaStock ? 'text-green-600' : 'text-red-600'}>
                                                                    {book.jumiaStock != null && book.stock === book.jumiaStock ? 'Oui' : 'Non'}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                                                <span className={book.hasArticle ? 'text-green-600' : 'text-red-600'}>
                                                                    {book.hasArticle ? 'Oui' : 'Non'}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                                <div className="flex items-center justify-end gap-2">
                                                                    {editingId === book.id ? (
                                                                        <>
                                                                            <button
                                                                                onClick={saveQuickEdit}
                                                                                disabled={loading === book.id}
                                                                                className="text-green-600 hover:text-green-900 p-2 hover:bg-green-50 rounded transition-colors"
                                                                                title="Enregistrer"
                                                                            >
                                                                                <Check className="w-4 h-4" />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => setEditingId(null)}
                                                                                className="text-gray-500 hover:text-gray-800 p-2 hover:bg-gray-100 rounded transition-colors"
                                                                                title="Annuler"
                                                                            >
                                                                                <X className="w-4 h-4" />
                                                                            </button>
                                                                        </>
                                                                    ) : (
                                                                        <div className="relative">
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === book.id ? null : book.id) }}
                                                                                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors"
                                                                                title="Actions"
                                                                            >
                                                                                <MoreVertical className="w-4 h-4" />
                                                                            </button>

                                                                            {openDropdown === book.id && (
                                                                                <>
                                                                                    {/* Backdrop */}
                                                                                    <div className="fixed inset-0 z-40" onClick={() => setOpenDropdown(null)} />
                                                                                    {/* Menu */}
                                                                                    <div className="absolute right-0 top-9 z-50 w-56 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden py-1 animate-[fadeIn_0.1s_ease]">

                                                                                        {/* Voir */}
                                                                                        <div className="px-3 py-1.5">
                                                                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Voir</p>
                                                                                        </div>
                                                                                        <Link
                                                                                            href={book.productType === 'PACK' ? `/packs/${book.id}` : book.productType === 'EXTRA' ? `/accessories/${book.id}` : `/books/${book.id}`}
                                                                                            target="_blank"
                                                                                            onClick={() => setOpenDropdown(null)}
                                                                                            className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                                                                        >
                                                                                            <ExternalLink className="w-4 h-4 text-gray-400" /> Voir sur le site
                                                                                        </Link>
                                                                                        <button
                                                                                            onClick={() => { setPreviewCaptionBook(book); setOpenDropdown(null) }}
                                                                                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                                                                        >
                                                                                            <MessageSquare className="w-4 h-4 text-yellow-500" /> Aperçu Caption
                                                                                        </button>

                                                                                        <div className="border-t border-gray-100 my-1" />

                                                                                        {/* Créatives */}
                                                                                        <div className="px-3 py-1.5">
                                                                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Créatives</p>
                                                                                        </div>
                                                                                        <button
                                                                                            onClick={() => { setCreativeFormat('post'); setCreativeBook(book); setOpenDropdown(null) }}
                                                                                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors"
                                                                                        >
                                                                                            <Image className="w-4 h-4 text-purple-500" /> Post créatif (FB/IG)
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={() => { setCreativeFormat('story'); setCreativeBook(book); setOpenDropdown(null) }}
                                                                                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-pink-50 hover:text-pink-700 transition-colors"
                                                                                        >
                                                                                            <Layers className="w-4 h-4 text-pink-500" /> Story créative (FB/IG)
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={() => { setVideoStudioBook(book); setOpenDropdown(null) }}
                                                                                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                                                                                        >
                                                                                            <Video className="w-4 h-4 text-indigo-500" /> Studio Shorts / Vidéo
                                                                                        </button>

                                                                                        <div className="border-t border-gray-100 my-1" />

                                                                                        {/* Descriptions */}
                                                                                        <div className="px-3 py-1.5">
                                                                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Descriptions IA</p>
                                                                                        </div>
                                                                                        <button
                                                                                            onClick={() => { setDescriptionFormat('post'); setDescriptionBook(book); setOpenDropdown(null) }}
                                                                                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                                                                                        >
                                                                                            <FileText className="w-4 h-4 text-blue-500" /> Desc. courte Post
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={() => { setDescriptionFormat('story'); setDescriptionBook(book); setOpenDropdown(null) }}
                                                                                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                                                                                        >
                                                                                            <FileText className="w-4 h-4 text-indigo-500" /> Desc. courte Story
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={() => { setDescriptionFormat('post'); setDescriptionBook({...book, description: book.longDescription || book.description}); setOpenDropdown(null) }}
                                                                                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-cyan-50 hover:text-cyan-700 transition-colors"
                                                                                        >
                                                                                            <FileText className="w-4 h-4 text-cyan-500" /> Desc. longue Post
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={() => { setDescriptionFormat('story'); setDescriptionBook({...book, description: book.longDescription || book.description}); setOpenDropdown(null) }}
                                                                                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-teal-50 hover:text-teal-700 transition-colors"
                                                                                        >
                                                                                            <FileText className="w-4 h-4 text-teal-500" /> Desc. longue Story
                                                                                        </button>

                                                                                        <div className="border-t border-gray-100 my-1" />

                                                                                        {/* Publication */}
                                                                                        <div className="px-3 py-1.5">
                                                                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Publication</p>
                                                                                        </div>
                                                                                        <button
                                                                                            onClick={() => { setN8nFormat('post'); setN8nBook(book); setOpenDropdown(null) }}
                                                                                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors"
                                                                                        >
                                                                                            <Send className="w-4 h-4 text-green-500" /> Publier via n8n
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={() => { handleQuickPublish(book); setOpenDropdown(null) }}
                                                                                            disabled={quickPublishing === book.id}
                                                                                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-colors disabled:opacity-40"
                                                                                        >
                                                                                            <Zap className="w-4 h-4 text-orange-500" />
                                                                                            {quickPublishing === book.id ? 'Publication...' : 'Publier maintenant'}
                                                                                        </button>

                                                                                        <div className="border-t border-gray-100 my-1" />

                                                                                        {/* Édition */}
                                                                                        <div className="px-3 py-1.5">
                                                                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Édition</p>
                                                                                        </div>
                                                                                        <button
                                                                                            onClick={() => { handleQuickEdit(book); setOpenDropdown(null) }}
                                                                                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                                                                                        >
                                                                                            <Edit3 className="w-4 h-4 text-emerald-500" /> Modification rapide
                                                                                        </button>
                                                                                        <Link
                                                                                            href={book.productType === 'PACK' ? `/admin/packs/${book.id}/edit` : book.productType === 'EXTRA' ? `/admin/accessories/${book.id}` : `/admin/books/${book.id}/edit?${new URLSearchParams({ page: pageNumber.toString(), ...(activeFilters.search ? {search: activeFilters.search} : {}), ...(activeFilters.status ? {status: activeFilters.status} : {}), ...(activeFilters.type ? {type: activeFilters.type} : {}), ...(activeFilters.lang ? {lang: activeFilters.lang} : {}), ...(activeFilters.sort ? {sort: activeFilters.sort} : {}) }).toString()}`}
                                                                                            onClick={() => setOpenDropdown(null)}
                                                                                            className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                                                                                        >
                                                                                            <Edit className="w-4 h-4 text-blue-500" /> Modification complète
                                                                                        </Link>

                                                                                        <div className="border-t border-gray-100 my-1" />

                                                                                        {/* Supprimer */}
                                                                                        <button
                                                                                            onClick={() => { handleDelete(book.id, book.title); setOpenDropdown(null) }}
                                                                                            disabled={loading === book.id}
                                                                                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                                                                                        >
                                                                                            <Trash2 className="w-4 h-4" /> Supprimer
                                                                                        </button>
                                                                                    </div>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}
                                        </tbody>
                                    )}
                                </Droppable>
                            </table>
                        </DragDropContext>
                    </div>

                    {viewMode === 'kanban' && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-10 gap-4 p-4">
                            {orderedBooks.map(book => (
                                <div key={book.id} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3 relative group">
                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-white/90 p-1 rounded-lg shadow-sm backdrop-blur-sm">
                                        <button onClick={() => handleToggleStatus(book.id, book.active)} className={`p-1.5 rounded-md ${book.active ? 'text-green-600 hover:bg-green-50' : 'text-gray-500 hover:bg-gray-100'}`} title={book.active ? 'Désactiver' : 'Activer'}>
                                            {book.active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                        </button>
                                        <Link href={book.productType === 'PACK' ? `/admin/packs/${book.id}/edit` : book.productType === 'EXTRA' ? `/admin/accessories/${book.id}` : `/admin/books/${book.id}/edit?${new URLSearchParams({ page: pageNumber.toString(), ...(activeFilters.search ? {search: activeFilters.search} : {}), ...(activeFilters.status ? {status: activeFilters.status} : {}), ...(activeFilters.type ? {type: activeFilters.type} : {}), ...(activeFilters.lang ? {lang: activeFilters.lang} : {}), ...(activeFilters.sort ? {sort: activeFilters.sort} : {}) }).toString()}`} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md">
                                            <Edit className="w-3.5 h-3.5" />
                                        </Link>
                                        <button onClick={() => handleDelete(book.id, book.title)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-md">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    <div className="aspect-[3/4] w-full overflow-hidden rounded-xl bg-gray-100">
                                        <img src={normalizeImage(book.image)} alt={book.title} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/book-placeholder.png' }} />
                                    </div>
                                    <div className="flex-1 flex flex-col">
                                        <Link 
                                            href={book.productType === 'PACK' ? `/admin/packs/${book.id}/edit` : book.productType === 'EXTRA' ? `/admin/accessories/${book.id}` : `/admin/books/${book.id}/edit?${new URLSearchParams({ page: pageNumber.toString(), ...(activeFilters.search ? {search: activeFilters.search} : {}), ...(activeFilters.status ? {status: activeFilters.status} : {}), ...(activeFilters.type ? {type: activeFilters.type} : {}), ...(activeFilters.lang ? {lang: activeFilters.lang} : {}), ...(activeFilters.sort ? {sort: activeFilters.sort} : {}) }).toString()}`}
                                        >
                                            <h3 className="font-bold text-sm text-gray-900 line-clamp-2 leading-tight hover:text-blue-600 hover:underline transition-colors">{book.title}</h3>
                                        </Link>
                                        <p className="text-xs text-gray-500 mt-1 truncate">
                                            {book.author}
                                            {book.sellerSku && <span className="ml-2 font-mono text-[9px] px-1 bg-gray-100 rounded">SKU: {book.sellerSku}</span>}
                                        </p>
                                        <div className="mt-auto pt-3 flex items-center justify-between">
                                            <span className="font-black text-sm text-gray-900">{book.price} <span className="text-[10px] text-gray-500">MAD</span></span>
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${book.stock > 10 ? 'bg-green-100 text-green-700' : book.stock > 0 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                                                {book.stock} en stock
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className={`px-6 py-3 bg-white border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4 ${totalProviderPages > 1 ? '' : 'hidden'}`}>
                        <div className="flex items-center gap-2">
                            <p className="text-sm text-gray-700">
                                Page <span className="font-medium">{pageNumber}</span> sur <span className="font-medium">{totalProviderPages}</span>
                            </p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap justify-center">
                            <button
                                onClick={() => router.push(buildUrl(pageNumber - 1))}
                                disabled={pageNumber === 1}
                                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 hover:bg-gray-50 transition-colors"
                            >
                                Précédent
                            </button>
                            
                            <div className="hidden sm:flex items-center gap-1">
                                {renderPaginationNumbers()}
                            </div>

                            <button
                                onClick={() => router.push(buildUrl(pageNumber + 1))}
                                disabled={pageNumber === totalProviderPages}
                                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 hover:bg-gray-50 transition-colors"
                            >
                                Suivant
                            </button>
                        </div>
                    </div>
                </>
            )}

            <BookCreativeModal
                isOpen={!!creativeBook}
                onClose={() => setCreativeBook(null)}
                book={creativeBook}
                format={creativeFormat}
            />

            <BookDescriptionModal
                isOpen={!!descriptionBook}
                onClose={() => setDescriptionBook(null)}
                book={descriptionBook}
                format={descriptionFormat}
            />

            <N8nPublishModal
                isOpen={!!n8nBook}
                onClose={() => setN8nBook(null)}
                book={n8nBook}
                format={n8nFormat}
            />
            <BulkPublishModal
                isOpen={isBulkPublishOpen}
                onClose={() => setIsBulkPublishOpen(false)}
                books={books.filter(b => selectedIds.includes(b.id))}
            />
            <CaptionPreviewModal
                isOpen={!!previewCaptionBook}
                onClose={() => setPreviewCaptionBook(null)}
                book={previewCaptionBook}
            />

            <VideoStudioModal
                isOpen={!!videoStudioBook}
                onClose={() => setVideoStudioBook(null)}
                book={videoStudioBook}
            />
        </div>
    )
}
