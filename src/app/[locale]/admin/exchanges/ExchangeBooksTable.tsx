'use client'

import { useState } from 'react'
import Image from 'next/image'
import { BookOpen, Trash2, ChevronDown, MapPin, Check } from 'lucide-react'
import { deleteExchangeBook, updateExchangeBookStatus, bulkDeleteExchangeBooks, toggleExchangeBookActive } from '@/lib/actions/admin-exchanges'
import { useRouter } from 'next/navigation'

const STATUS_OPTIONS = [
    { value: 'AVAILABLE', label: 'Disponible', color: 'bg-emerald-50 text-emerald-700' },
    { value: 'RESERVED', label: 'Réservé', color: 'bg-amber-50 text-amber-700' },
    { value: 'EXCHANGED', label: 'Échangé', color: 'bg-blue-50 text-blue-700' },
]

export default function ExchangeBooksTable({ books }: { books: any[] }) {
    const router = useRouter()
    const [loadingId, setLoadingId] = useState<string | null>(null)
    const [openDropdown, setOpenDropdown] = useState<string | null>(null)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [isBulkDeleting, setIsBulkDeleting] = useState(false)
    const [togglingId, setTogglingId] = useState<string | null>(null)

    const allSelected = books.length > 0 && selectedIds.size === books.length
    const someSelected = selectedIds.size > 0

    const toggleAll = () => {
        if (allSelected) setSelectedIds(new Set())
        else setSelectedIds(new Set(books.map(b => b.id)))
    }

    const toggleOne = (id: string) => {
        const next = new Set(selectedIds)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        setSelectedIds(next)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Supprimer ce livre ?')) return
        setLoadingId(id)
        const res = await deleteExchangeBook(id)
        if (res.success) router.refresh()
        else alert(res.error)
        setLoadingId(null)
    }

    const handleBulkDelete = async () => {
        if (!confirm(`Supprimer ${selectedIds.size} livre(s) sélectionné(s) ?`)) return
        setIsBulkDeleting(true)
        const res = await bulkDeleteExchangeBooks(Array.from(selectedIds))
        if (res.success) { setSelectedIds(new Set()); router.refresh() }
        else alert(res.error)
        setIsBulkDeleting(false)
    }

    const handleStatus = async (id: string, status: string) => {
        setLoadingId(id)
        setOpenDropdown(null)
        const res = await updateExchangeBookStatus(id, status)
        if (res.success) router.refresh()
        else alert(res.error)
        setLoadingId(null)
    }

    const handleToggleActive = async (id: string, currentStatus: string) => {
        setTogglingId(id)
        const res = await toggleExchangeBookActive(id, currentStatus)
        if (res.success) router.refresh()
        else alert(res.error)
        setTogglingId(null)
    }

    if (books.length === 0) {
        return (
            <div className="bg-white rounded-[2rem] border border-gray-100 p-16 text-center">
                <BookOpen className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-400 font-bold text-sm">Aucun livre listé</p>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {/* Barre bulk delete */}
            {someSelected && (
                <div className="flex items-center justify-between bg-red-50 border border-red-100 rounded-2xl px-6 py-3">
                    <p className="text-sm font-black text-red-700">
                        {selectedIds.size} livre{selectedIds.size > 1 ? 's' : ''} sélectionné{selectedIds.size > 1 ? 's' : ''}
                    </p>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setSelectedIds(new Set())}
                            className="text-xs font-bold text-red-400 hover:text-red-600 transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            onClick={handleBulkDelete}
                            disabled={isBulkDeleting}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-700 transition-colors disabled:opacity-50"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                            {isBulkDeleting ? 'Suppression...' : 'Supprimer'}
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-[3rem] border border-gray-100 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50/50">
                                <th className="px-6 py-4 w-10">
                                    <input
                                        type="checkbox"
                                        checked={allSelected}
                                        onChange={toggleAll}
                                        className="w-4 h-4 rounded border-gray-300 cursor-pointer accent-red-500"
                                    />
                                </th>
                                <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Livre</th>
                                <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Propriétaire</th>
                                <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Type</th>
                                <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">État</th>
                                <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Ville</th>
                                <th className="text-center px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Actif</th>
                                <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Statut</th>
                                <th className="text-right px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {books.map((book: any) => {
                                const isActive = book.status !== 'SUSPENDED'
                                const currentStatus = isActive
                                    ? (STATUS_OPTIONS.find(s => s.value === book.status) || STATUS_OPTIONS[0])
                                    : { value: 'SUSPENDED', label: 'Suspendu', color: 'bg-red-50 text-red-500' }
                                const isLoading = loadingId === book.id
                                const isSelected = selectedIds.has(book.id)
                                const isToggling = togglingId === book.id

                                return (
                                    <tr
                                        key={book.id}
                                        className={`hover:bg-gray-50/50 transition-colors ${isLoading ? 'opacity-50' : ''} ${isSelected ? 'bg-red-50/30' : ''} ${!isActive ? 'opacity-60' : ''}`}
                                    >
                                        {/* Checkbox */}
                                        <td className="px-6 py-4">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleOne(book.id)}
                                                className="w-4 h-4 rounded border-gray-300 cursor-pointer accent-red-500"
                                            />
                                        </td>

                                        {/* Livre */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                {book.image ? (
                                                    <Image src={book.image} alt={book.title} width={40} height={56} className="w-10 h-14 object-cover rounded-xl shrink-0" />
                                                ) : (
                                                    <div className="w-10 h-14 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
                                                        <BookOpen className="w-4 h-4 text-gray-300" />
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-black text-black text-sm">{book.title}</p>
                                                    <p className="text-xs text-gray-400 font-bold">{book.author}</p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Propriétaire */}
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-sm text-black">{book.owner?.fullName || '—'}</p>
                                            <p className="text-xs text-gray-400">{book.owner?.email}</p>
                                        </td>

                                        {/* Type */}
                                        <td className="px-6 py-4">
                                            <span className="px-3 py-1 bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-widest rounded-full">
                                                {book.exchangeType}
                                            </span>
                                        </td>

                                        {/* État physique */}
                                        <td className="px-6 py-4">
                                            <span className="px-3 py-1 bg-gray-100 text-gray-700 text-[10px] font-black uppercase tracking-widest rounded-full">
                                                {book.condition}
                                            </span>
                                        </td>

                                        {/* Ville */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1 text-gray-400">
                                                <MapPin className="w-3 h-3" />
                                                <span className="text-xs font-bold">{book.city || '—'}</span>
                                            </div>
                                        </td>

                                        {/* Toggle Actif / Inactif */}
                                        <td className="px-6 py-4">
                                            <div className="flex justify-center">
                                                <button
                                                    onClick={() => handleToggleActive(book.id, book.status)}
                                                    disabled={isToggling}
                                                    title={isActive ? 'Désactiver' : 'Activer'}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
                                                        isActive ? 'bg-emerald-500' : 'bg-gray-200'
                                                    }`}
                                                >
                                                    <span
                                                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
                                                            isActive ? 'translate-x-6' : 'translate-x-1'
                                                        }`}
                                                    />
                                                </button>
                                            </div>
                                        </td>

                                        {/* Statut dropdown */}
                                        <td className="px-6 py-4">
                                            <div className="relative">
                                                <button
                                                    onClick={() => isActive && setOpenDropdown(openDropdown === book.id ? null : book.id)}
                                                    disabled={isLoading || !isActive}
                                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                                                        isActive ? 'hover:opacity-80 cursor-pointer' : 'cursor-not-allowed opacity-60'
                                                    } ${currentStatus.color}`}
                                                >
                                                    {currentStatus.label}
                                                    {isActive && <ChevronDown className="w-3 h-3" />}
                                                </button>
                                                {openDropdown === book.id && (
                                                    <div className="absolute left-0 top-full mt-1 bg-white rounded-2xl border border-gray-100 shadow-xl z-20 min-w-[140px] py-1">
                                                        {STATUS_OPTIONS.map(opt => (
                                                            <button
                                                                key={opt.value}
                                                                onClick={() => handleStatus(book.id, opt.value)}
                                                                className="flex items-center gap-2 w-full px-4 py-2.5 text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-colors text-left"
                                                            >
                                                                {book.status === opt.value && <Check className="w-3 h-3 text-emerald-500 shrink-0" />}
                                                                <span className={`px-2 py-0.5 rounded-full ${opt.color}`}>{opt.label}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        {/* Supprimer */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-end">
                                                <button
                                                    onClick={() => handleDelete(book.id)}
                                                    disabled={isLoading}
                                                    className="w-9 h-9 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center transition-colors disabled:opacity-50"
                                                    title="Supprimer"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
