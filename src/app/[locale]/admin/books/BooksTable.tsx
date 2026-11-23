'use client'

import { useState, useEffect } from 'react'
import { Link } from '@/i18n/routing'
import { Edit, Trash2, Eye, EyeOff, Search, Check, X, Edit3, ImageIcon, FileDown, GripVertical, LayoutGrid, List, Upload, Send, MessageSquare, MoreVertical, ExternalLink, Video, Zap, FileText, Image, Layers, ChevronRight, ArrowUp, ArrowDown, ArrowUpDown, RefreshCw, Bot, ClipboardPaste, Barcode, AlertCircle, Sparkles } from 'lucide-react'
import { deleteBook, toggleBookStatus, bulkDeleteBooks, updateBookQuick, updateBookOrder, bulkUpdateBookPrices, bulkUpdateBookStock, bulkUpdateBookLanguages, bulkUpdateBooksFromAi, bulkGenerateSkus } from '@/lib/actions/books'
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
    titleFr?: string | null
    titleEn?: string | null
    author: string
    price: number
    stock: number
    image: string
    category: string | null
    subCategory: string | null
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
    seoScore?: number
    warehouseStocks?: {
        warehouseId: string
        warehouseName: string
        quantity: number
    }[]
}

interface ActiveFilters {
    search: string;
    status: string;
    type: string;
    lang: string;
    sort: string;
    condition: string;
    category?: string;
    subCategory?: string;
    jumia?: string;
    seoScore?: string;
    linked?: string;
    limit?: string | number;
}

export default function BooksTable({
    books,
    pageNumber,
    totalProviderPages,
    activeFilters,
    limit = 20,
    warehouses = []
}: {
    books: Book[],
    pageNumber: number,
    totalProviderPages: number,
    activeFilters: ActiveFilters,
    limit?: number,
    warehouses?: { id: string; name: string }[]
}) {
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
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(warehouses[0]?.id || 'TOTAL')
    const [bulkStock, setBulkStock] = useState<string>('')
    const [isUpdatingStock, setIsUpdatingStock] = useState(false)
    const [bulkLanguage, setBulkLanguage] = useState<'fr' | 'ar' | 'en'>('fr')
    const [isUpdatingLanguage, setIsUpdatingLanguage] = useState(false)
    const [isGeneratingSku, setIsGeneratingSku] = useState(false)
    const [isBulkPublishOpen, setIsBulkPublishOpen] = useState(false)
    const [hoveredImage, setHoveredImage] = useState<{ src: string; title: string; rect: { top: number; left: number; right: number; bottom: number } } | null>(null)
    const router = useRouter()
    const pathname = usePathname()

    const getWarehouseInitial = (name: string) => {
        const normalizedName = name.trim().toLocaleLowerCase('fr')
        if (normalizedName.includes('principal')) return 'P'
        return name.trim().charAt(0).toLocaleUpperCase('fr') || '?'
    }

    const getEditUrl = (book: Book) => {
        if (book.productType === 'PACK') return `/admin/packs/${book.id}/edit`
        if (book.productType === 'EXTRA') return `/admin/accessories/${book.id}`

        const params = new URLSearchParams()
        if (activeFilters.search?.trim()) params.set('search', activeFilters.search.trim())
        if (activeFilters.status) params.set('status', activeFilters.status)
        if (activeFilters.type) params.set('type', activeFilters.type)
        if (activeFilters.lang) params.set('lang', activeFilters.lang)
        if (activeFilters.sort) params.set('sort', activeFilters.sort)
        if (activeFilters.condition) params.set('condition', activeFilters.condition)
        if (activeFilters.category) params.set('category', activeFilters.category)
        if (activeFilters.subCategory) params.set('subCategory', activeFilters.subCategory)
        if (activeFilters.jumia) params.set('jumia', activeFilters.jumia)
        if (activeFilters.seoScore) params.set('seoScore', activeFilters.seoScore)
        if (activeFilters.linked) params.set('linked', activeFilters.linked)

        const effectiveLimit = activeFilters.limit || limit
        if (effectiveLimit && effectiveLimit.toString() !== '20') {
            params.set('limit', effectiveLimit.toString())
        }
        params.set('page', pageNumber.toString())
        return `/admin/books/${book.id}/edit?${params.toString()}`
    }

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
        if (!confirm(`Êtes-vous sûr de vouloir supprimer ${selectedIds.length} produit(s) ?`)) return

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

        if (!confirm(`Êtes-vous sûr de vouloir changer le prix de ${selectedIds.length} produit(s) à ${price} درهم ?`)) return

        setIsUpdatingPrice(true)
        const result = await bulkUpdateBookPrices(selectedIds, price)
        setIsUpdatingPrice(false)

        if (result.success) {
            setOrderedBooks(prev => prev.map(book =>
                selectedIds.includes(book.id)
                    ? { ...book, price }
                    : book
            ))
            setBulkPrice('')
            setSelectedIds([])
            setToast({ msg: `✅ Prix mis à jour pour ${selectedIds.length} produits`, ok: true })
            router.refresh()
            setTimeout(() => setToast(null), 4000)
        } else {
            alert(result.error)
        }
    }

    const handleBulkStockUpdate = async () => {
        if (selectedIds.length === 0 || !bulkStock) return
        const stock = parseInt(bulkStock, 10)
        if (isNaN(stock) || stock < 0) return alert('Stock invalide (doit être un entier >= 0)')

        const targetWarehouse = warehouses.find(w => w.id === selectedWarehouseId)
        const targetLabel = selectedWarehouseId === 'TOTAL' ? 'Stock Total' : (targetWarehouse?.name || 'Entrepôt sélectionné')

        if (!confirm(`Êtes-vous sûr de vouloir changer le stock (${targetLabel}) de ${selectedIds.length} produit(s) à ${stock} ?`)) return

        setIsUpdatingStock(true)
        const result = await bulkUpdateBookStock(selectedIds, stock, selectedWarehouseId)
        setIsUpdatingStock(false)

        if (result.success) {
            setOrderedBooks(prev => prev.map(book => {
                if (!selectedIds.includes(book.id)) return book

                if (!selectedWarehouseId || selectedWarehouseId === 'TOTAL') {
                    return { ...book, stock }
                }

                let updatedWarehouseStocks = (book.warehouseStocks || []).map(ws =>
                    ws.warehouseId === selectedWarehouseId
                        ? { ...ws, quantity: stock }
                        : ws
                )
                if (!updatedWarehouseStocks.some(ws => ws.warehouseId === selectedWarehouseId)) {
                    updatedWarehouseStocks.push({
                        warehouseId: selectedWarehouseId,
                        warehouseName: targetWarehouse?.name || 'Entrepôt',
                        quantity: stock
                    })
                }

                const newTotal = updatedWarehouseStocks.reduce((sum, ws) => sum + (ws.quantity || 0), 0)
                return {
                    ...book,
                    stock: newTotal,
                    warehouseStocks: updatedWarehouseStocks
                }
            }))
            setBulkStock('')
            setSelectedIds([])
            setToast({ msg: `✅ Stock (${targetLabel}) mis à jour pour ${selectedIds.length} produits`, ok: true })
            router.refresh()
            setTimeout(() => setToast(null), 4000)
        } else {
            alert(result.error)
        }
    }

    const handleBulkLanguageUpdate = async () => {
        if (selectedIds.length === 0) return

        const languageLabels = { fr: 'Français', ar: 'Arabe', en: 'Anglais' }
        const selectedBookIds = orderedBooks
            .filter(book => selectedIds.includes(book.id) && book.productType !== 'PACK' && book.productType !== 'EXTRA')
            .map(book => book.id)

        if (selectedBookIds.length === 0) {
            return alert('La sélection ne contient aucun produit.')
        }
        if (!confirm(`Changer la langue de ${selectedBookIds.length} produit(s) en ${languageLabels[bulkLanguage]} ?`)) return

        setIsUpdatingLanguage(true)
        const result = await bulkUpdateBookLanguages(selectedBookIds, bulkLanguage)
        setIsUpdatingLanguage(false)

        if (result.success) {
            setOrderedBooks(current => current.map(book =>
                selectedBookIds.includes(book.id) ? { ...book, language: bulkLanguage } : book
            ))
            setSelectedIds([])
            setToast({ msg: `✅ Langue mise à jour pour ${result.count ?? selectedBookIds.length} produit(s)`, ok: true })
            router.refresh()
            setTimeout(() => setToast(null), 4000)
        } else {
            alert(result.error)
        }
    }

    const handleGenerateSkusSelected = async () => {
        if (selectedIds.length === 0) return
        const hasExistingSkus = orderedBooks.some(b => selectedIds.includes(b.id) && Boolean(b.sellerSku))
        const confirmMsg = hasExistingSkus
            ? `Régénérer / changer le SKU pour les ${selectedIds.length} produit(s) sélectionné(s) ? (Les SKU existants seront remplacés par de nouveaux codes uniques)`
            : `Générer un SKU unique pour les ${selectedIds.length} produit(s) sélectionné(s) ?`

        if (!confirm(confirmMsg)) return

        setIsGeneratingSku(true)
        try {
            const res = await bulkGenerateSkus(selectedIds)
            if (res.success && res.updatedMap) {
                const map = res.updatedMap
                setOrderedBooks(prev => prev.map(book =>
                    map[book.id] ? { ...book, sellerSku: map[book.id] } : book
                ))
                setSelectedIds([])
                setToast({ msg: `✅ SKU générés / modifiés avec succès pour ${res.count || Object.keys(map).length} produit(s)`, ok: true })
                router.refresh()
                setTimeout(() => setToast(null), 4000)
            } else {
                alert(res.error || 'Erreur lors de la génération des SKU')
            }
        } finally {
            setIsGeneratingSku(false)
        }
    }

    const handleGenerateSingleSku = async (e: React.MouseEvent, bookId: string, currentSku?: string | null) => {
        e.stopPropagation()
        const confirmMsg = currentSku
            ? `Changer le SKU actuel (${currentSku}) par un nouveau code SKU unique ?`
            : 'Générer un code SKU unique pour ce produit ?'
        if (!confirm(confirmMsg)) return

        setLoading(bookId + '-sku')
        try {
            const res = await bulkGenerateSkus([bookId])
            if (res.success && res.updatedMap && res.updatedMap[bookId]) {
                const newSku = res.updatedMap[bookId]
                setOrderedBooks(prev => prev.map(b => b.id === bookId ? { ...b, sellerSku: newSku } : b))
                setToast({ msg: `✅ SKU mis à jour : ${newSku}`, ok: true })
                router.refresh()
            } else {
                setToast({ msg: `❌ ${res.error || 'Erreur lors de la génération du SKU'}`, ok: false })
            }
        } catch {
            setToast({ msg: '❌ Erreur réseau', ok: false })
        } finally {
            setLoading(null)
            setTimeout(() => setToast(null), 4000)
        }
    }

    const handleGenerateAllMissingSkus = async () => {
        if (!confirm('Voulez-vous générer automatiquement un SKU unique pour TOUS les produits sans SKU du catalogue ?')) return

        setIsGeneratingSku(true)
        try {
            const res = await bulkGenerateSkus()
            if (res.success && res.updatedMap) {
                const map = res.updatedMap
                setOrderedBooks(prev => prev.map(book =>
                    map[book.id] ? { ...book, sellerSku: map[book.id] } : book
                ))
                setToast({ msg: `✅ ${res.count || Object.keys(map).length} SKU générés avec succès pour l'ensemble du catalogue !`, ok: true })
                router.refresh()
                setTimeout(() => setToast(null), 5000)
            } else {
                alert(res.error || 'Erreur lors de la génération des SKU')
            }
        } finally {
            setIsGeneratingSku(false)
        }
    }

    // Export Excel de tous les produits
    const handleExportExcel = async () => {
        try {
            const params = new URLSearchParams()
            if (activeFilters.search) params.set('search', activeFilters.search)
            if (activeFilters.status) params.set('status', activeFilters.status)
            if (activeFilters.type) params.set('type', activeFilters.type)
            if (activeFilters.lang) params.set('lang', activeFilters.lang)
            if (activeFilters.sort) params.set('sort', activeFilters.sort)
            if (activeFilters.condition) params.set('condition', activeFilters.condition)

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

    // Export Excel Jumia pour les produits sélectionnés
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
        if (!confirm(`Publier ${selectedIds.length} produit(s) sur Jumia ?`)) return

        setBulkLoading(true)
        try {
            const { publishBooksToJumia } = await import('@/lib/actions/jumia')
            const result = await publishBooksToJumia(selectedIds)
            if (result.success) {
                setToast({ msg: `✅ ${result.message}`, ok: true })
                setOrderedBooks(prev => prev.map(book =>
                    selectedIds.includes(book.id)
                        ? { ...book, isSyncedWithJumia: true }
                        : book
                ))
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

    // Synchroniser le stock en masse
    const handleBulkSyncQuantity = async () => {
        if (selectedIds.length === 0) return
        setBulkLoading(true)
        try {
            const { syncBooksQuantityToJumia } = await import('@/lib/actions/jumia')
            const result = await syncBooksQuantityToJumia(selectedIds)
            if (result.success) {
                setToast({ msg: `✅ ${result.message}`, ok: true })
                setOrderedBooks(prev => prev.map(book =>
                    selectedIds.includes(book.id)
                        ? { ...book, isSyncedWithJumia: true, jumiaStock: book.stock }
                        : book
                ))
                setSelectedIds([])
            } else {
                setToast({ msg: `❌ ${result.message}`, ok: false })
            }
            setTimeout(() => setToast(null), 5000)
        } catch (error) {
            setToast({ msg: '❌ Erreur de synchronisation', ok: false })
            setTimeout(() => setToast(null), 5000)
        } finally {
            setBulkLoading(false)
        }
    }

    // Synchroniser le stock en itérant un par un
    const handleSyncAllQuantity = async () => {
        if (selectedIds.length === 0) return
        setBulkLoading(true)
        try {
            const { syncBooksQuantityToJumia } = await import('@/lib/actions/jumia')
            let successCount = 0
            for (const id of selectedIds) {
                const result = await syncBooksQuantityToJumia([id])
                if (result.success) {
                    successCount++
                    setOrderedBooks(prev => prev.map(book =>
                        book.id === id
                            ? { ...book, isSyncedWithJumia: true, jumiaStock: book.stock }
                            : book
                    ))
                }
            }
            setToast({ msg: `✅ ${successCount}/${selectedIds.length} stocks synchronisés avec succès`, ok: true })
            if (successCount === selectedIds.length) {
                setSelectedIds([])
            }
            setTimeout(() => setToast(null), 5000)
        } catch (error) {
            setToast({ msg: '❌ Erreur lors de la synchronisation séquentielle', ok: false })
            setTimeout(() => setToast(null), 5000)
        } finally {
            setBulkLoading(false)
        }
    }


    const handleVerifyJumiaSku = async (e: React.MouseEvent, bookId: string, sellerSku: string | null | undefined) => {
        e.stopPropagation();
        setLoading(bookId + '-verify');
        try {
            const { verifyJumiaSku } = await import('@/lib/actions/jumia');
            const result = await verifyJumiaSku(bookId, sellerSku);
            if (result.success) {
                const isLinked = !!result.isLinked;
                setToast({
                    msg: isLinked ? `✅ ${result.message}` : `ℹ️ ${result.message}`,
                    ok: isLinked
                });
                setOrderedBooks(prev => prev.map(book =>
                    book.id === bookId
                        ? {
                            ...book,
                            isSyncedWithJumia: isLinked,
                            jumiaStock: isLinked ? (result.stock !== undefined ? result.stock : book.jumiaStock) : null
                          }
                        : book
                ));
            } else {
                setToast({ msg: `❌ ${result.message}`, ok: false });
            }
        } catch (err: any) {
            setToast({ msg: '❌ Erreur lors de la vérification Jumia', ok: false });
        } finally {
            setLoading(null);
            setTimeout(() => setToast(null), 4000);
        }
    }

    // Vérifier les produits sélectionnés sur Jumia par Seller SKU
    const handleBulkVerifyJumiaSku = async () => {
        if (selectedIds.length === 0) return;
        setBulkLoading(true);
        try {
            const { verifyBulkBooksJumiaSku } = await import('@/lib/actions/jumia');
            const result = await verifyBulkBooksJumiaSku(selectedIds);
            if (result.success && result.results) {
                const resultMap = new Map(result.results.map(r => [r.id, r]));
                setOrderedBooks(prev => prev.map(book => {
                    const found = resultMap.get(book.id);
                    if (found) {
                        return {
                            ...book,
                            isSyncedWithJumia: found.isLinked,
                            jumiaStock: found.isLinked ? (found.stock !== undefined ? found.stock : book.jumiaStock) : null
                        };
                    }
                    return book;
                }));
                setToast({ msg: `✅ ${result.message}`, ok: true });
            } else {
                setToast({ msg: `❌ ${result.message || 'Erreur lors de la vérification bulk'}`, ok: false });
            }
        } catch (err: any) {
            setToast({ msg: '❌ Erreur lors de la vérification', ok: false });
        } finally {
            setBulkLoading(false);
            setTimeout(() => setToast(null), 5000);
        }
    }

    // Nettoyer les espaces parasites et resynchroniser vers Jumia
    const handleResyncCleanSku = async () => {
        if (selectedIds.length === 0) return;
        setBulkLoading(true);
        try {
            const { resyncCleanJumiaSellerSku } = await import('@/lib/actions/jumia');
            const result = await resyncCleanJumiaSellerSku(selectedIds);
            if (result.success && result.results) {
                const resultMap = new Map(result.results.map(r => [r.id, r]));
                setOrderedBooks(prev => prev.map(book => {
                    const found = resultMap.get(book.id);
                    if (found) {
                        return {
                            ...book,
                            sellerSku: found.cleanSku,
                            isSyncedWithJumia: found.isLinked
                        };
                    }
                    return book;
                }));
                setToast({ msg: `✅ ${result.message}`, ok: true });
            } else {
                setToast({ msg: `❌ ${result.message || 'Erreur lors du nettoyage du SKU'}`, ok: false });
            }
        } catch (err: any) {
            setToast({ msg: '❌ Erreur lors de la resynchronisation du SKU Jumia', ok: false });
        } finally {
            setBulkLoading(false);
            setTimeout(() => setToast(null), 5000);
        }
    }

    const handleResyncCleanSkuRow = async (e: React.MouseEvent, bookId: string) => {
        e.stopPropagation();
        setLoading(bookId + '-clean-sku');
        try {
            const { resyncCleanJumiaSellerSku } = await import('@/lib/actions/jumia');
            const result = await resyncCleanJumiaSellerSku([bookId]);
            if (result.success) {
                setToast({ msg: `✅ ${result.message}`, ok: true });
                const item = result.results?.[0];
                if (item) {
                    setOrderedBooks(prev => prev.map(book =>
                        book.id === bookId
                            ? { ...book, sellerSku: item.cleanSku, isSyncedWithJumia: item.isLinked }
                            : book
                    ));
                }
            } else {
                setToast({ msg: `❌ ${result.message}`, ok: false });
            }
        } catch (err: any) {
            setToast({ msg: '❌ Erreur lors du nettoyage du SKU', ok: false });
        } finally {
            setLoading(null);
            setTimeout(() => setToast(null), 4000);
        }
    }

    const handleSyncQuantity = async (e: React.MouseEvent, bookId: string) => {
        e.stopPropagation();
        setLoading(bookId + '-sync');
        try {
            const { syncBooksQuantityToJumia } = await import('@/lib/actions/jumia');
            const result = await syncBooksQuantityToJumia([bookId]);
            if (result.success) {
                setToast({ msg: `✅ Stock synchronisé avec succès`, ok: true });
                setOrderedBooks(prev => prev.map(book =>
                    book.id === bookId
                        ? { ...book, isSyncedWithJumia: true, jumiaStock: book.stock }
                        : book
                ));
            } else {
                setToast({ msg: `❌ ${result.message}`, ok: false });
            }
        } catch (err: any) {
            setToast({ msg: '❌ Erreur lors de la synchronisation du stock', ok: false });
        } finally {
            setLoading(null);
            setTimeout(() => setToast(null), 3000);
        }
    }

    const handleCopyChatGptPrompt = () => {
        if (selectedIds.length === 0) return

        const selectedBooksData = orderedBooks.filter(b => selectedIds.includes(b.id))
        if (selectedBooksData.length === 0) return

        const booksListText = selectedBooksData.map((b, i) => {
            return `PRODUIT #${i + 1}:
- ID: ${b.id}
- Titre actuel (Arabe ou principal): ${b.title || 'N/A'}
- Titre actuel (Français): ${b.titleFr || 'N/A'}
- Titre actuel (Anglais): ${b.titleEn || 'N/A'}
- Marque: ${b.author || 'N/A'}
- Catégorie actuelle: ${b.category || 'N/A'}${b.subCategory ? ` / ${b.subCategory}` : ''}
- Langue: ${b.language || 'fr'}
- SKU Vendeur: ${b.sellerSku || 'N/A'}`
        }).join('\n\n')

        const prompt = `Act as an expert e-commerce copywriter & bookseller for Tekno Store bookstore & Jumia marketplace.
I have ${selectedBooksData.length} book(s) to optimize.

=== BOOKS LIST TO PROCESS ===
${booksListText}

CRITICAL INSTRUCTIONS:
1. TITLES TRANSLITERATION:
   For title_fr and title_en, DO NOT translate Arabic titles literally. You MUST use the phonetic transcription (transliteration) in Latin characters.
   Example: "سلسلة روايات بساتين عربستان" MUST become "Silsilat teknot basatin arabistan" (NOT "Série de romans...").
2. STRICT ZERO PRICE / NO DISCOUNT POLICY:
   NEVER mention or include any price, currency, discount or promo in descriptions, titles, keywords, highlights or package content (ABSOLUTELY NO 'prix', 'price', 'سعر', 'ثمن', 'DH', 'MAD', 'درهم', 'gratuit', 'free', 'off', 'promo', '%', 'remise', 'solde'). Jumia strictly rejects listings containing price mentions in the description!
3. MULTILINGUAL CONTENT & SEMANTIC SEO STRUCTURE:
   - For "longDescription_ar", "longDescription_fr", and "longDescription_en", use semantic <h2> headings to capture high-intent long-tail and voice search queries in Morocco (e.g. <h2>Pourquoi lire ce produit ?</h2>, <h2>Résumé et thèmes principaux</h2>, <h2>À qui s'adresse ce produit ?</h2> / <h2>لماذا يجب قراءة هذا الكتاب؟</h2>, <h2>ملخص وأهم المحاور</h2>).
   - "description_ar", "description_fr", "description_en": 2 to 3 engaging hook paragraphs highlighting the reading experience and book value.
   - "category": Recommended main category (e.g. Romans & Littérature, Développement Personnel, Histoire, etc.).
   - "subCategory": Recommended subcategory.
   - "seoKeywords": High-volume search keywords separated by commas (author name, title transliteration, genre, book in Morocco).
   - "jumiaHighlights": Clean HTML bullet points (<ul><li>...</li></ul>) with 3-4 key selling points WITHOUT any price.
   - "jumiaPackageContent": e.g. "1 x Produit : [Titre du produit]"

STRICT JSON OUTPUT REQUIREMENT:
You MUST return ONLY a valid JSON array of objects (one object per book), preserving the EXACT "id" for each book:
[
  {
    "id": "EXACT_BOOK_ID",
    "title_ar": "العنوان بالعربية",
    "title_fr": "Titre phonétique en français",
    "title_en": "Phonetic title in English",
    "description_ar": "الوصف المختصر بالعربية",
    "description_fr": "Description courte et engageante en français",
    "description_en": "Engaging short description in English",
    "longDescription_ar": "<h2>لماذا يجب قراءة هذا الكتاب؟</h2><p>...</p><h2>ملخص وأهم المحاور</h2><p>...</p>",
    "longDescription_fr": "<h2>Pourquoi lire ce produit ?</h2><p>...</p><h2>Résumé et thèmes principaux</h2><p>...</p>",
    "longDescription_en": "<h2>Why read this book?</h2><p>...</p><h2>Key themes & summary</h2><p>...</p>",
    "category": "Catégorie principale",
    "subCategory": "Sous-catégorie",
    "seoKeywords": "mot-clé 1, mot-clé 2, mot-clé 3",
    "jumiaHighlights": "<ul><li>Marque: ...</li><li>Genre: ...</li></ul>",
    "jumiaPackageContent": "1 x Produit : [Titre]"
  }
]
Do not add explanatory text outside the JSON array or code block.`

        navigator.clipboard.writeText(prompt)
        setToast({ msg: `Prompt ChatGPT copié pour ${selectedBooksData.length} produit(s) !`, ok: true })
        setTimeout(() => setToast(null), 4000)
    }

    const handlePasteChatGptResponse = async () => {
        try {
            const text = await navigator.clipboard.readText()
            if (!text || !text.trim()) {
                setToast({ msg: 'Le presse-papier est vide.', ok: false })
                setTimeout(() => setToast(null), 4000)
                return
            }

            // Extraction robuste du JSON (gère markdown ```json ... ``` ou accolades)
            let jsonStr = text.trim()
            const matchCodeBlock = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
            if (matchCodeBlock) {
                jsonStr = matchCodeBlock[1].trim()
            } else {
                const firstBracket = text.indexOf('[')
                const lastBracket = text.lastIndexOf(']')
                const firstBrace = text.indexOf('{')
                const lastBrace = text.lastIndexOf('}')

                if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
                    jsonStr = text.substring(firstBracket, lastBracket + 1)
                } else if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                    jsonStr = text.substring(firstBrace, lastBrace + 1)
                }
            }

            let parsedData: any
            try {
                parsedData = JSON.parse(jsonStr)
            } catch {
                setToast({ msg: 'Le contenu du presse-papier n\'est pas un JSON valide.', ok: false })
                setTimeout(() => setToast(null), 4000)
                return
            }

            let itemsArray: any[] = []
            if (Array.isArray(parsedData)) {
                itemsArray = parsedData
            } else if (typeof parsedData === 'object' && parsedData !== null) {
                if (parsedData.id) {
                    itemsArray = [parsedData]
                } else if (selectedIds.length === 1) {
                    itemsArray = [{ ...parsedData, id: selectedIds[0] }]
                } else {
                    setToast({ msg: 'Format invalide : tableau JSON requis pour plusieurs produits.', ok: false })
                    setTimeout(() => setToast(null), 4000)
                    return
                }
            }

            if (itemsArray.length === 0) {
                setToast({ msg: 'Aucun produit trouvé dans le JSON.', ok: false })
                setTimeout(() => setToast(null), 4000)
                return
            }

            // Associer par index de sélection en fallback si l'ID n'a pas été retourné correctement
            itemsArray = itemsArray.map((item, idx) => {
                if (item.id && selectedIds.includes(item.id)) return item
                if (selectedIds[idx]) return { ...item, id: selectedIds[idx] }
                return item
            })

            setBulkLoading(true)
            const result = await bulkUpdateBooksFromAi(itemsArray)
            setBulkLoading(false)

            if (result.success) {
                const updatedMap = new Map(itemsArray.map(item => [item.id, item]))
                setOrderedBooks(prev => prev.map(book => {
                    const update = updatedMap.get(book.id)
                    if (!update) return book
                    return {
                        ...book,
                        title: update.title_ar || update.title || book.title,
                        titleFr: update.title_fr || update.titleFr || book.titleFr,
                        titleEn: update.title_en || update.titleEn || book.titleEn,
                        category: update.category || book.category,
                        subCategory: update.subCategory || book.subCategory,
                        description: update.description_ar || update.description || book.description,
                        longDescription: update.longDescription_ar || update.longDescription || book.longDescription,
                    }
                }))
                setToast({ msg: `✅ ${result.count || itemsArray.length} produit(s) mis à jour avec succès depuis ChatGPT !`, ok: true })
                router.refresh()
                setTimeout(() => setToast(null), 5000)
            } else {
                setToast({ msg: `❌ ${result.error || 'Erreur de mise à jour'}`, ok: false })
                setTimeout(() => setToast(null), 5000)
            }
        } catch (err: any) {
            console.error('Erreur pasteChatGptResponse:', err)
            setToast({ msg: 'Erreur lors de la lecture du presse-papier.', ok: false })
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
        const currentUrlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
        const params = new URLSearchParams()
        if (activeFilters.search?.trim()) params.set('search', activeFilters.search.trim())
        if (activeFilters.status) params.set('status', activeFilters.status)
        if (activeFilters.type) params.set('type', activeFilters.type)
        if (activeFilters.lang) params.set('lang', activeFilters.lang)
        if (activeFilters.sort) params.set('sort', activeFilters.sort)
        if (activeFilters.condition) params.set('condition', activeFilters.condition)
        if (activeFilters.category) params.set('category', activeFilters.category)
        if (activeFilters.subCategory) params.set('subCategory', activeFilters.subCategory)
        if (activeFilters.jumia) params.set('jumia', activeFilters.jumia)
        if (activeFilters.seoScore) params.set('seoScore', activeFilters.seoScore)
        if (activeFilters.linked) params.set('linked', activeFilters.linked)

        const effectiveLimit = newLimit || activeFilters.limit || limit || currentUrlParams.get('limit')
        if (effectiveLimit && effectiveLimit.toString() !== '20') {
            params.set('limit', effectiveLimit.toString())
        }
        params.set('page', page.toString())
        return `${pathname}?${params.toString()}`
    }

    const handleSort = (column: 'price' | 'stock' | 'orders' | 'title') => {
        let newSort = `${column}-desc`;
        if (column === 'title') {
            const isCurrentAsc = activeFilters.sort === 'title-asc' || activeFilters.sort === 'a-z'
            newSort = isCurrentAsc ? 'title-desc' : 'title-asc'
        } else {
            if (activeFilters.sort === `${column}-desc`) {
                newSort = `${column}-asc`;
            }
        }

        const currentUrlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
        const params = new URLSearchParams()
        if (activeFilters.search?.trim()) params.set('search', activeFilters.search.trim())
        if (activeFilters.status) params.set('status', activeFilters.status)
        if (activeFilters.type) params.set('type', activeFilters.type)
        if (activeFilters.lang) params.set('lang', activeFilters.lang)
        if (activeFilters.condition) params.set('condition', activeFilters.condition)
        if (activeFilters.category) params.set('category', activeFilters.category)
        if (activeFilters.subCategory) params.set('subCategory', activeFilters.subCategory)
        if (activeFilters.jumia) params.set('jumia', activeFilters.jumia)
        if (activeFilters.seoScore) params.set('seoScore', activeFilters.seoScore)
        if (activeFilters.linked) params.set('linked', activeFilters.linked)
        params.set('sort', newSort)

        const effectiveLimit = activeFilters.limit || limit || currentUrlParams.get('limit')
        if (effectiveLimit && effectiveLimit.toString() !== '20') {
            params.set('limit', effectiveLimit.toString())
        }
        params.set('page', '1')
        router.push(`${pathname}?${params.toString()}`)
    }

    const getSortIcon = (column: 'price' | 'stock' | 'orders' | 'title') => {
        const isAsc = activeFilters.sort === `${column}-asc` || (column === 'title' && activeFilters.sort === 'a-z')
        const isDesc = activeFilters.sort === `${column}-desc` || (column === 'title' && activeFilters.sort === 'z-a')
        if (isAsc) return <ArrowUp className="w-3 h-3 ml-1 text-blue-600" />
        if (isDesc) return <ArrowDown className="w-3 h-3 ml-1 text-blue-600" />
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
                        Total: <span className="text-gray-900 font-black">{books.length}</span> produits affichés
                    </p>
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                        <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-900'}`} title="Vue Liste"><List className="w-4 h-4"/></button>
                        <button onClick={() => setViewMode('kanban')} className={`p-1.5 rounded-lg transition-all ${viewMode === 'kanban' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-900'}`} title="Vue Kanban"><LayoutGrid className="w-4 h-4"/></button>
                    </div>
                    <select aria-label="Champ de sélection"
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
                    title="Exporter tous les produits en Excel"
                >
                    <FileDown className="w-4 h-4" />
                    Export Excel
                </button>
            </div>

            {books.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-gray-500">Aucun produit trouvé {activeFilters.search && `pour "${activeFilters.search}"`}</p>
                </div>
            ) : (
                <>
                    {activeFilters.jumia?.includes('no-sku') && (
                        <div className="mx-4 mt-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 flex-shrink-0">
                                    <Barcode className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-amber-900">
                                        Produits sans SKU Jumia détectés
                                    </p>
                                    <p className="text-[11px] text-amber-700">
                                        Attribuez un code SKU unique à ces produits pour activer la synchronisation Jumia et Google Shopping.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleGenerateAllMissingSkus}
                                disabled={isGeneratingSku}
                                className="flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50 cursor-pointer whitespace-nowrap"
                            >
                                <Barcode className="w-4 h-4" />
                                {isGeneratingSku ? 'Génération en cours...' : 'Générer tous les SKU manquants'}
                            </button>
                        </div>
                    )}

                    {(activeFilters.jumia?.includes('anomaly') || activeFilters.linked === 'anomaly') && (
                        <div className="mx-4 mt-4 bg-red-50 border border-red-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-red-100 border border-red-300 flex items-center justify-center text-red-800 flex-shrink-0">
                                    <AlertCircle className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-red-900">
                                        Filtre actif : Produits en anomalie Jumia ({books.length})
                                    </p>
                                    <p className="text-[11px] text-red-700">
                                        Ces produits possèdent un Seller SKU mais sont introuvables ou marqués non linkés sur Jumia Vendor.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const allIds = books.map(b => b.id);
                                        setSelectedIds(allIds);
                                    }}
                                    className="px-3.5 py-2 bg-white border border-red-200 text-red-800 hover:bg-red-50 text-xs font-bold rounded-xl transition shadow-xs whitespace-nowrap cursor-pointer"
                                >
                                    Sélectionner tout ({books.length})
                                </button>
                            </div>
                        </div>
                    )}

                    {selectedIds.length > 0 && (
                        <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200 mx-4 mt-4 flex-wrap">
                            <span className="text-sm font-black text-gray-900">{selectedIds.length} produit(s) sélectionnés</span>

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
                                    className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-700 transition shadow-sm disabled:opacity-50 cursor-pointer"
                                >
                                    {isUpdatingPrice ? 'Mise à jour...' : 'Changer Prix'}
                                </button>
                            </div>

                            <div className="h-6 w-px bg-gray-300 mx-2 hidden sm:block"></div>

                            <div className="flex items-center gap-2 flex-wrap">
                                <select
                                    value={selectedWarehouseId}
                                    onChange={(e) => setSelectedWarehouseId(e.target.value)}
                                    className="px-3 py-2 text-xs font-bold border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 bg-white cursor-pointer shadow-sm"
                                    title="Choisir l'entrepôt à modifier"
                                >
                                    {warehouses.map(w => (
                                        <option key={w.id} value={w.id}>
                                            {w.name}
                                        </option>
                                    ))}
                                    <option value="TOTAL">Stock Total (Direct)</option>
                                </select>
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="Nouveau stock..."
                                    value={bulkStock}
                                    onChange={(e) => setBulkStock(e.target.value)}
                                    className="w-28 px-3 py-2 text-xs font-bold border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                                <button
                                    onClick={handleBulkStockUpdate}
                                    disabled={isUpdatingStock || !bulkStock}
                                    className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 transition shadow-sm disabled:opacity-50 cursor-pointer whitespace-nowrap"
                                >
                                    {isUpdatingStock ? 'Mise à jour...' : 'Changer Stock'}
                                </button>
                            </div>

                            <div className="h-6 w-px bg-gray-300 mx-2 hidden sm:block"></div>

                            <div className="flex items-center gap-2">
                                <select
                                    value={bulkLanguage}
                                    onChange={(event) => setBulkLanguage(event.target.value as 'fr' | 'ar' | 'en')}
                                    className="px-3 py-2 text-xs font-bold border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-violet-500 bg-white cursor-pointer shadow-sm"
                                    aria-label="Nouvelle langue des produits sélectionnés"
                                >
                                    <option value="fr">Français</option>
                                    <option value="ar">Arabe</option>
                                    <option value="en">Anglais</option>
                                </select>
                                <button
                                    type="button"
                                    onClick={handleBulkLanguageUpdate}
                                    disabled={isUpdatingLanguage}
                                    className="bg-violet-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-violet-700 transition shadow-sm disabled:opacity-50 cursor-pointer whitespace-nowrap"
                                >
                                    {isUpdatingLanguage ? 'Mise à jour...' : 'Changer Langue'}
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
                                onClick={handleBulkSyncQuantity}
                                disabled={bulkLoading}
                                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-700 transition"
                                title="Synchroniser uniquement le stock (Global)"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Synch quantity
                            </button>
                            <button
                                onClick={handleSyncAllQuantity}
                                disabled={bulkLoading}
                                className="flex items-center gap-2 bg-cyan-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-cyan-700 transition"
                                title="Synchroniser le stock un par un (Itératif)"
                            >
                                <RefreshCw className="w-4 h-4" />
                                Synch all quantity
                            </button>
                            <button
                                onClick={handleBulkVerifyJumiaSku}
                                disabled={bulkLoading}
                                className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-amber-700 transition disabled:opacity-50"
                                title="Vérifier sur Jumia Vendor par Seller SKU pour chaque produit sélectionné"
                            >
                                <RefreshCw className={`w-4 h-4 ${bulkLoading ? 'animate-spin' : ''}`} />
                                Vérifier Link Jumia ({selectedIds.length})
                            </button>
                            <button
                                onClick={handleResyncCleanSku}
                                disabled={bulkLoading}
                                className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 transition disabled:opacity-50 shadow-sm"
                                title="Nettoyer les espaces parasites Unicode et resynchroniser le Seller SKU vers Jumia"
                            >
                                <Sparkles className={`w-4 h-4 ${bulkLoading ? 'animate-spin' : ''}`} />
                                Nettoyer SKU Jumia ({selectedIds.length})
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
                                type="button"
                                onClick={handleCopyChatGptPrompt}
                                className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-purple-700 transition shadow-sm"
                                title="Générer et copier le prompt ChatGPT pour les produits sélectionnés"
                            >
                                <Bot className="w-4 h-4" />
                                Prompt ChatGPT
                            </button>
                            <button
                                type="button"
                                onClick={handlePasteChatGptResponse}
                                disabled={bulkLoading}
                                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-green-700 transition shadow-sm disabled:opacity-50"
                                title="Coller la réponse ChatGPT pour mettre à jour les produits sélectionnés"
                            >
                                <ClipboardPaste className="w-4 h-4" />
                                Coller réponse
                            </button>
                            <button
                                type="button"
                                onClick={handleGenerateSkusSelected}
                                disabled={bulkLoading || isGeneratingSku}
                                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 transition shadow-sm disabled:opacity-50 cursor-pointer"
                                title="Générer ou changer le SKU pour les produits sélectionnés (même si un SKU existe déjà)"
                            >
                                <Barcode className="w-4 h-4" />
                                {isGeneratingSku ? 'Génération...' : 'Générer / Changer SKU'}
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
                                        <th
                                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                            onClick={() => handleSort('title')}
                                            title="Trier par ordre alphabétique (A-Z / Z-A)"
                                        >
                                            <div className="flex items-center">Produit {getSortIcon('title')}</div>
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
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Stock Jumia
                                        </th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Qté Synch
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
                                            Lien Jumia
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
                                            {orderedBooks.map((book, index) => {
                                                const displayTitle = book.language === 'fr' ? (book.titleFr || book.title || book.titleEn || 'Sans titre') : book.language === 'en' ? (book.titleEn || book.title || book.titleFr || 'Sans titre') : (book.title || book.titleFr || book.titleEn || 'Sans titre')
                                                return (
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
                                                                    <div
                                                                        className="h-12 w-10 flex-shrink-0 cursor-pointer relative rounded overflow-hidden group/thumb transition-transform hover:scale-105 hover:ring-2 hover:ring-indigo-500/60 shadow-xs"
                                                                        onMouseEnter={(e) => {
                                                                            const rect = e.currentTarget.getBoundingClientRect()
                                                                            setHoveredImage({
                                                                                src: normalizeImage(book.image),
                                                                                title: displayTitle,
                                                                                rect: { top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom }
                                                                            })
                                                                        }}
                                                                        onMouseLeave={() => setHoveredImage(null)}
                                                                    >
                                                                        <img
                                                                            src={normalizeImage(book.image)}
                                                                            alt={displayTitle}
                                                                            width={40}
                                                                            height={48}
                                                                            loading="lazy"
                                                                            decoding="async"
                                                                            className="w-full h-full object-cover rounded"
                                                                            onError={(e) => { (e.target as HTMLImageElement).src = '/book-placeholder.png' }}
                                                                        />
                                                                    </div>
                                                                    <div className="ml-4">
                                                                        <div className="text-sm font-medium text-gray-900 flex flex-wrap items-center gap-2">
                                                                            <Link
                                                                                href={getEditUrl(book)}
                                                                                locale={book.language || 'ar'}
                                                                                className="hover:text-blue-600 hover:underline transition-colors"
                                                                                title={displayTitle}
                                                                            >
                                                                                {displayTitle.length > 12
                                                                                    ? displayTitle.substring(0, 12) + '...'
                                                                                    : displayTitle}
                                                                            </Link>
                                                                        </div>
                                                                        <div className="text-sm text-gray-500">{book.author}</div>
                                                                        <div className="mt-1 flex max-w-[190px] flex-wrap items-center gap-1">
                                                                            <span className={`px-1.5 py-0.5 text-[8px] font-black uppercase tracking-tighter rounded-md border ${book.isOriginal ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                                                                {book.isOriginal ? 'Original' : 'Copie'}
                                                                            </span>
                                                                            {book.seoScore !== undefined && book.productType === 'BOOK' && (
                                                                                <span
                                                                                    className={`px-1.5 py-0.5 text-[8px] font-black tracking-tight rounded-md border ${
                                                                                        book.seoScore >= 80
                                                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                                        : book.seoScore >= 50
                                                                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                                                        : 'bg-red-50 text-red-700 border-red-200'
                                                                                    }`}
                                                                                    title={`Score SEO : ${book.seoScore}%`}
                                                                                >
                                                                                    SEO {book.seoScore}%
                                                                                </span>
                                                                            )}
                                                                            {book.sellerSku ? (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={(e) => handleGenerateSingleSku(e, book.id, book.sellerSku)}
                                                                                    className="max-w-[155px] truncate rounded bg-gray-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 border border-transparent px-1.5 py-0.5 font-mono text-[9px] text-gray-600 transition-colors inline-flex items-center gap-1 cursor-pointer"
                                                                                    title={`SKU actuel: ${book.sellerSku} — Cliquer pour changer`}
                                                                                >
                                                                                    <Barcode className="w-2.5 h-2.5 text-gray-400 group-hover:text-indigo-600" />
                                                                                    <span>SKU: {book.sellerSku}</span>
                                                                                </button>
                                                                            ) : (
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={(e) => handleGenerateSingleSku(e, book.id, null)}
                                                                                    className="rounded bg-amber-50 hover:bg-amber-100 border border-amber-200 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 transition-colors cursor-pointer inline-flex items-center gap-1"
                                                                                    title="Cliquer pour générer un SKU unique"
                                                                                >
                                                                                    <Barcode className="w-2.5 h-2.5 text-amber-600" />
                                                                                    <span>Générer SKU</span>
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 w-fit">
                                                                        {book.productType === 'PACK' ? 'Pack' : book.productType === 'EXTRA' ? `Accessoire: ${book.category || ''}` : book.category || 'N/A'}
                                                                    </span>
                                                                    {book.subCategory && (
                                                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800 w-fit">
                                                                            {book.subCategory}
                                                                        </span>
                                                                    )}
                                                                </div>
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
                                                                    <>{book.price} درهم</>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-4">
                                                                {editingId === book.id ? (
                                                                    <input
                                                                        type="number"
                                                                        value={editData.stock}
                                                                        onChange={e => setEditData({ ...editData, stock: Number(e.target.value) })}
                                                                        className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                                    />
                                                                ) : (
                                                                    <div className="min-w-[116px]">
                                                                        <div className="flex items-center gap-1">
                                                                            {(book.warehouseStocks || []).map(warehouse => (
                                                                                <div
                                                                                    key={warehouse.warehouseId}
                                                                                    title={`${warehouse.warehouseName}: ${warehouse.quantity} unités`}
                                                                                    aria-label={`${warehouse.warehouseName}: ${warehouse.quantity} unités`}
                                                                                    className={`flex min-w-9 items-center justify-center gap-1 rounded-md border px-1.5 py-1 text-[10px] font-black ${warehouse.quantity > 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-600'}`}
                                                                                >
                                                                                    <span className="text-gray-500">{getWarehouseInitial(warehouse.warehouseName)}</span>
                                                                                    <span>{warehouse.quantity}</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                        <div className={`mt-1 text-[9px] font-bold ${book.stock > 10 ? 'text-green-600' : book.stock > 0 ? 'text-orange-600' : 'text-red-600'}`}>
                                                                            Total {book.stock}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                                                <span className={book.jumiaStock != null ? 'text-gray-900' : 'text-gray-400'}>
                                                                    {book.jumiaStock != null ? `${book.jumiaStock} unités` : '-'}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                                            <div className="flex flex-col items-center gap-1">
                                                                {book.jumiaStock != null && book.stock === book.jumiaStock ? (
                                                                    <span className="text-green-600">Oui</span>
                                                                ) : (
                                                                    <span className="text-red-600">Non</span>
                                                                )}
                                                                <button
                                                                    onClick={(e) => handleSyncQuantity(e, book.id)}
                                                                    disabled={loading === book.id + '-sync'}
                                                                    className="bg-blue-500 text-white px-2 py-0.5 rounded text-[10px] font-bold hover:bg-blue-600 shadow-sm disabled:opacity-50 transition-colors"
                                                                >
                                                                    {loading === book.id + '-sync' ? '...' : 'Synch quantity'}
                                                                </button>
                                                            </div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                                                    {book.orderCount || 0} fois
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                {editingId === book.id ? (
                                                                    <select aria-label="Champ de sélection"
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
                                                                <div className="flex justify-center items-center h-6">
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => handleVerifyJumiaSku(e, book.id, book.sellerSku)}
                                                                        disabled={loading === book.id + '-verify'}
                                                                        title={`Cliquer pour vérifier sur Jumia Vendor par Seller SKU (${book.sellerSku || 'Aucun SKU'})`}
                                                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-full transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs border ${
                                                                            loading === book.id + '-verify'
                                                                                ? 'bg-gray-100 text-gray-600 border-gray-300 animate-pulse'
                                                                                : book.isSyncedWithJumia
                                                                                    ? 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100'
                                                                                    : 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100'
                                                                        }`}
                                                                    >
                                                                        {loading === book.id + '-verify' ? (
                                                                            <>
                                                                                <RefreshCw className="w-3 h-3 animate-spin text-gray-500" />
                                                                                <span>Vérif...</span>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <span className={`w-1.5 h-1.5 rounded-full ${book.isSyncedWithJumia ? 'bg-green-500 ring-2 ring-green-200' : 'bg-red-500 ring-2 ring-red-200'}`} />
                                                                                <span>{book.isSyncedWithJumia ? 'Linké' : 'Non Linké'}</span>
                                                                            </>
                                                                        )}
                                                                    </button>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                                                {book.sellerSku ? (
                                                                    <a
                                                                        href={`https://www.jumia.ma/catalog/?q=${encodeURIComponent(book.title)}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black bg-orange-50 text-[#F68B1E] border border-orange-200 hover:bg-[#F68B1E] hover:text-white transition shadow-xs group"
                                                                        title={`Ouvrir le produit sur Jumia (${book.sellerSku})`}
                                                                    >
                                                                        <span className="font-mono text-[11px] truncate max-w-[85px]">{book.sellerSku}</span>
                                                                        <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                                                                    </a>
                                                                ) : (
                                                                    <a
                                                                        href={`https://www.jumia.ma/catalog/?q=${encodeURIComponent(book.title)}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold text-gray-400 hover:text-[#F68B1E] hover:bg-orange-50 transition"
                                                                        title="Rechercher ce titre sur Jumia"
                                                                    >
                                                                        <span>Rechercher</span>
                                                                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                                                    </a>
                                                                )}
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
                                                                                        <button
                                                                                            onClick={(e) => { handleVerifyJumiaSku(e, book.id, book.sellerSku); setOpenDropdown(null) }}
                                                                                            disabled={loading === book.id + '-verify'}
                                                                                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-700 transition-colors disabled:opacity-40"
                                                                                        >
                                                                                            <RefreshCw className={`w-4 h-4 text-amber-500 ${loading === book.id + '-verify' ? 'animate-spin' : ''}`} />
                                                                                            Vérifier Link Jumia (Seller SKU)
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={(e) => { handleResyncCleanSkuRow(e, book.id); setOpenDropdown(null) }}
                                                                                            disabled={loading === book.id + '-clean-sku'}
                                                                                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors disabled:opacity-40"
                                                                                            title="Nettoyer les espaces parasites et resynchroniser le Seller SKU vers Jumia"
                                                                                        >
                                                                                            <Sparkles className={`w-4 h-4 text-emerald-500 ${loading === book.id + '-clean-sku' ? 'animate-spin' : ''}`} />
                                                                                            Nettoyer SKU Jumia (Marketplace)
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={(e) => { handleGenerateSingleSku(e, book.id, book.sellerSku); setOpenDropdown(null) }}
                                                                                            disabled={loading === book.id + '-sku'}
                                                                                            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors disabled:opacity-40"
                                                                                            title="Générer ou régénérer un nouveau code SKU"
                                                                                        >
                                                                                            <Barcode className={`w-4 h-4 text-indigo-500 ${loading === book.id + '-sku' ? 'animate-spin' : ''}`} />
                                                                                            {book.sellerSku ? 'Changer / Régénérer SKU' : 'Générer SKU'}
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
                                                                                            href={getEditUrl(book)}
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
                                                )
                                            })}
                                            {provided.placeholder}
                                        </tbody>
                                    )}
                                </Droppable>
                            </table>
                        </DragDropContext>
                    </div>

                    {viewMode === 'kanban' && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-10 gap-4 p-4">
                            {orderedBooks.map(book => {
                                const displayTitle = book.language === 'fr' ? (book.titleFr || book.title || book.titleEn || 'Sans titre') : book.language === 'en' ? (book.titleEn || book.title || book.titleFr || 'Sans titre') : (book.title || book.titleFr || book.titleEn || 'Sans titre')
                                return (
                                <div key={book.id} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3 relative group">
                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-white/90 p-1 rounded-lg shadow-sm backdrop-blur-sm">
                                        <button onClick={() => handleToggleStatus(book.id, book.active)} className={`p-1.5 rounded-md ${book.active ? 'text-green-600 hover:bg-green-50' : 'text-gray-500 hover:bg-gray-100'}`} title={book.active ? 'Désactiver' : 'Activer'}>
                                            {book.active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                        </button>
                                        <Link aria-label="Modifier" href={getEditUrl(book)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md">
                                            <Edit className="w-3.5 h-3.5" />
                                        </Link>
                                        <button onClick={() => handleDelete(book.id, book.title)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-md">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    <div
                                        className="aspect-[3/4] w-full overflow-hidden rounded-xl bg-gray-100 cursor-pointer group/thumb hover:ring-2 hover:ring-indigo-500/60 transition-all"
                                        onMouseEnter={(e) => {
                                            const rect = e.currentTarget.getBoundingClientRect()
                                            setHoveredImage({
                                                src: normalizeImage(book.image),
                                                title: displayTitle,
                                                rect: { top: rect.top, left: rect.left, right: rect.right, bottom: rect.bottom }
                                            })
                                        }}
                                        onMouseLeave={() => setHoveredImage(null)}
                                    >
                                        <img src={normalizeImage(book.image)} alt={displayTitle} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/book-placeholder.png' }} />
                                    </div>
                                    <div className="flex-1 flex flex-col">
                                        <Link
                                            href={getEditUrl(book)}
                                        >
                                            <h3 className="font-bold text-sm text-gray-900 line-clamp-2 leading-tight hover:text-blue-600 hover:underline transition-colors">{displayTitle}</h3>
                                        </Link>
                                        {book.seoScore !== undefined && book.productType === 'BOOK' && (
                                            <div className="mt-1">
                                                <span
                                                    className={`inline-block text-[8px] font-black px-1.5 py-0.5 rounded border ${
                                                        book.seoScore >= 80
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        : book.seoScore >= 50
                                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                        : 'bg-red-50 text-red-700 border-red-200'
                                                    }`}
                                                    title={`Score SEO : ${book.seoScore}%`}
                                                >
                                                    SEO {book.seoScore}%
                                                </span>
                                            </div>
                                        )}
                                        <p className="text-xs text-gray-500 mt-1 truncate flex items-center flex-wrap gap-1">
                                            <span>{book.author}</span>
                                            {book.sellerSku && (
                                                <a
                                                    href={`https://www.jumia.ma/catalog/?q=${encodeURIComponent(book.title)}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="inline-flex items-center gap-1 font-mono text-[9px] px-1.5 py-0.5 bg-orange-50 text-[#F68B1E] hover:bg-[#F68B1E] hover:text-white rounded border border-orange-200 transition"
                                                    title="Ouvrir sur Jumia"
                                                >
                                                    <span>Jumia: {book.sellerSku}</span>
                                                    <ExternalLink className="w-2.5 h-2.5" />
                                                </a>
                                            )}
                                        </p>
                                        <div className="mt-auto pt-3 flex items-center justify-between">
                                            <span className="font-black text-sm text-gray-900">{book.price} <span className="text-[10px] text-gray-500">درهم</span></span>
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${book.stock > 10 ? 'bg-green-100 text-green-700' : book.stock > 0 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                                                {book.stock} en stock
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                )
                            })}
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

            {/* Aperçu agrandi au survol de l'image produit */}
            {hoveredImage && (
                <div
                    className="fixed z-[9999] pointer-events-none bg-white p-2.5 rounded-2xl shadow-2xl border border-gray-200/90 transition-opacity duration-150 animate-in fade-in zoom-in-95"
                    style={{
                        top: typeof window !== 'undefined' ? Math.min(Math.max(12, hoveredImage.rect.top - 80), window.innerHeight - 360) : 12,
                        left: typeof window !== 'undefined' && hoveredImage.rect.right + 16 < window.innerWidth - 270
                            ? hoveredImage.rect.right + 16
                            : typeof window !== 'undefined' ? Math.max(12, hoveredImage.rect.left - 270) : 12,
                        width: '250px',
                    }}
                >
                    <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-gray-50 border border-gray-100 shadow-inner">
                        <img
                            src={hoveredImage.src}
                            alt={hoveredImage.title}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src = '/book-placeholder.png' }}
                        />
                    </div>
                    <div className="mt-2.5 px-1 pb-0.5">
                        <p className="text-xs font-bold text-gray-900 line-clamp-2 leading-snug">
                            {hoveredImage.title}
                        </p>
                        <p className="text-[10px] text-gray-500 font-medium mt-0.5 uppercase tracking-wider">
                            Aperçu produit
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}
