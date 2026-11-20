'use client'

import { useState } from 'react'
import { updateReservationStatus, deleteReservation, bulkUpdateReservations, updateReservationWhatsapp } from '@/lib/actions/admin-reservations'
import { MessageCircle, Trash2, CheckCircle, Clock, RotateCcw, Loader2, Pencil, Save, X, Send, AlertTriangle } from 'lucide-react'
import ImageWithFallback from '@/components/ImageWithFallback'
import { normalizeImage } from '@/lib/utils'

interface Reservation {
    id: string
    bookId: string
    whatsapp: string
    status: string
    createdAt: Date | string
    updatedAt: Date | string
    book: {
        title: string
        image: string | null
        author: string
    }
}

type WhatsAppLanguage = 'fr' | 'darija' | 'ar'

function normalizeWhatsAppRecipient(phone: string) {
    const digits = phone.replace(/\D/g, '')
    if (digits.startsWith('00')) return digits.slice(2)
    if (digits.startsWith('0') && digits.length === 10) return `212${digits.slice(1)}`
    return digits
}

function isValidWhatsAppPhone(phone: string) {
    const recipient = normalizeWhatsAppRecipient(phone)
    return recipient.length >= 8 && recipient.length <= 15
}

function buildReservationMessage(reservation: Reservation, language: WhatsAppLanguage, bookUrl: string) {
    if (language === 'ar') {
        return `مرحبًا، الكتاب «${reservation.book.title}» الذي حجزته على Tekno Store أصبح متوفرًا الآن. يمكنك الاطلاع عليه وطلبه من هنا:\n${bookUrl}`
    }
    if (language === 'darija') {
        return `سلام، الكتاب «${reservation.book.title}» اللي حجزتي فـ Tekno Store ولى متوفر دابا. تقدر تشوفو وتطلبو من هنا:\n${bookUrl}`
    }
    return `Bonjour, le livre « ${reservation.book.title} » que vous avez réservé sur Tekno Store est maintenant disponible. Vous pouvez le consulter et le commander ici :\n${bookUrl}`
}

export default function ReservationsClient({ initialReservations }: { initialReservations: Reservation[] }) {
    const [reservations, setReservations] = useState<Reservation[]>(initialReservations)
    const [isLoading, setIsLoading] = useState<string | null>(null)
    const [openWhatsAppDropdown, setOpenWhatsAppDropdown] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [isBulkLoading, setIsBulkLoading] = useState(false)
    const [editingWhatsappId, setEditingWhatsappId] = useState<string | null>(null)
    const [whatsappDraft, setWhatsappDraft] = useState('')
    const [bulkWhatsAppLanguage, setBulkWhatsAppLanguage] = useState<WhatsAppLanguage>('fr')

    const filteredReservations = reservations.filter(res => {
        const searchLower = searchTerm.toLowerCase()
        return res.book.title.toLowerCase().includes(searchLower) || (res.book.author || '').toLowerCase().includes(searchLower)
    })

    const filteredIds = filteredReservations.map(res => res.id)
    const areAllFilteredSelected = filteredIds.length > 0 && filteredIds.every(id => selectedIds.has(id))

    const toggleSelection = (id: string) => {
        setSelectedIds(current => {
            const next = new Set(current)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const toggleAllFiltered = () => {
        setSelectedIds(current => {
            const next = new Set(current)
            if (areAllFilteredSelected) filteredIds.forEach(id => next.delete(id))
            else filteredIds.forEach(id => next.add(id))
            return next
        })
    }

    const handleBulkAction = async (action: 'PENDING' | 'NOTIFIED' | 'DELETE') => {
        const ids = Array.from(selectedIds)
        if (ids.length === 0) return
        const affectedIds = new Set(ids)

        if (action === 'DELETE' && !confirm(`Supprimer définitivement ${ids.length} réservation(s) ?`)) return

        setIsBulkLoading(true)
        try {
            const result = await bulkUpdateReservations(ids, action)
            if (!result.success) {
                alert('Erreur: ' + result.error)
                return
            }

            if (action === 'DELETE') {
                setReservations(current => current.filter(reservation => !affectedIds.has(reservation.id)))
            } else {
                setReservations(current => current.map(reservation => (
                    affectedIds.has(reservation.id) ? { ...reservation, status: action } : reservation
                )))
            }
            setSelectedIds(new Set())
        } finally {
            setIsBulkLoading(false)
        }
    }

    const launchBulkWhatsApp = () => {
        const selectedReservations = reservations.filter(reservation => selectedIds.has(reservation.id))
        if (selectedReservations.length === 0) return

        const validReservations = selectedReservations.filter(reservation => isValidWhatsAppPhone(reservation.whatsapp))
        const invalidCount = selectedReservations.length - validReservations.length

        if (validReservations.length === 0) {
            alert('Aucun numéro WhatsApp valide dans la sélection. Corrigez les numéros avant de relancer les messages.')
            return
        }

        if (validReservations.length > 1 && !confirm(
            `Ouvrir ${validReservations.length} conversations WhatsApp ?${invalidCount > 0 ? ` ${invalidCount} numéro(s) invalide(s) seront ignoré(s).` : ''} Votre navigateur peut demander l'autorisation d'ouvrir plusieurs onglets.`
        )) return

        const productLocale = bulkWhatsAppLanguage === 'fr' ? 'fr' : 'ar'
        validReservations.forEach(reservation => {
            const recipient = normalizeWhatsAppRecipient(reservation.whatsapp)
            const bookUrl = `https://tekno.ma/${productLocale}/books/${reservation.bookId}`
            const message = buildReservationMessage(reservation, bulkWhatsAppLanguage, bookUrl)
            window.open(`https://wa.me/${recipient}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer')
        })
    }

    const handleStatusChange = async (id: string, newStatus: string) => {
        setIsLoading(id)
        try {
            const res = await updateReservationStatus(id, newStatus)
            if (res.success) {
                setReservations(reservations.map(r => r.id === id ? { ...r, status: newStatus } : r))
            } else {
                alert('Erreur: ' + res.error)
            }
        } finally {
            setIsLoading(null)
        }
    }

    const startWhatsappEdit = (reservation: Reservation) => {
        setEditingWhatsappId(reservation.id)
        setWhatsappDraft(reservation.whatsapp)
        setOpenWhatsAppDropdown(null)
    }

    const cancelWhatsappEdit = () => {
        setEditingWhatsappId(null)
        setWhatsappDraft('')
    }

    const saveWhatsapp = async (id: string) => {
        setIsLoading(id)
        try {
            const result = await updateReservationWhatsapp(id, whatsappDraft)
            if (!result.success || !result.whatsapp) {
                alert('Erreur: ' + result.error)
                return
            }

            setReservations(current => current.map(reservation => (
                reservation.id === id ? { ...reservation, whatsapp: result.whatsapp } : reservation
            )))
            cancelWhatsappEdit()
        } finally {
            setIsLoading(null)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette réservation ?')) return

        setIsLoading(id)
        try {
            const res = await deleteReservation(id)
            if (res.success) {
                setReservations(reservations.filter(r => r.id !== id))
            } else {
                alert('Erreur: ' + res.error)
            }
        } finally {
            setIsLoading(null)
        }
    }

    return (
        <div className="space-y-6">
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <input
                        type="text"
                        placeholder="Rechercher par livre ou auteur..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full max-w-md px-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />

                    {selectedIds.size > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="mr-1 text-xs font-bold text-gray-500">
                                {selectedIds.size} sélectionnée{selectedIds.size > 1 ? 's' : ''}
                            </span>
                            <button
                                type="button"
                                onClick={() => handleBulkAction('NOTIFIED')}
                                disabled={isBulkLoading}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
                            >
                                <CheckCircle className="h-4 w-4" /> Notifiées
                            </button>
                            <button
                                type="button"
                                onClick={() => handleBulkAction('PENDING')}
                                disabled={isBulkLoading}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-50"
                            >
                                <RotateCcw className="h-4 w-4" /> En attente
                            </button>
                            <button
                                type="button"
                                onClick={() => handleBulkAction('DELETE')}
                                disabled={isBulkLoading}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
                            >
                                {isBulkLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                Supprimer
                            </button>
                            <div className="flex items-center overflow-hidden rounded-xl border border-green-200 bg-green-50">
                                <select
                                    value={bulkWhatsAppLanguage}
                                    onChange={(event) => setBulkWhatsAppLanguage(event.target.value as WhatsAppLanguage)}
                                    disabled={isBulkLoading}
                                    aria-label="Langue des messages WhatsApp"
                                    className="border-0 bg-transparent px-2.5 py-2 text-xs font-bold text-green-800 outline-none disabled:opacity-50"
                                >
                                    <option value="fr">Français</option>
                                    <option value="darija">Darija</option>
                                    <option value="ar">العربية</option>
                                </select>
                                <button
                                    type="button"
                                    onClick={launchBulkWhatsApp}
                                    disabled={isBulkLoading}
                                    className="inline-flex items-center gap-1.5 border-l border-green-200 px-3 py-2 text-xs font-bold text-green-700 transition-colors hover:bg-green-100 disabled:opacity-50"
                                >
                                    <Send className="h-4 w-4" /> WhatsApp
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                            <th className="w-12 px-4 py-4">
                                <input
                                    type="checkbox"
                                    checked={areAllFilteredSelected}
                                    onChange={toggleAllFiltered}
                                    aria-label="Sélectionner toutes les réservations affichées"
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                            </th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Livre</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">WhatsApp</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Date</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Statut</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredReservations.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-500 font-medium">
                                    Aucune réservation trouvée
                                </td>
                            </tr>
                        ) : (
                            filteredReservations.map((res) => (
                                <tr key={res.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-4 py-4">
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(res.id)}
                                            onChange={() => toggleSelection(res.id)}
                                            aria-label={`Sélectionner la réservation de ${res.book.title}`}
                                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            {res.book.image ? (
                                                <div className="w-12 h-16 relative rounded-lg overflow-hidden shrink-0 shadow-sm">
                                                    <ImageWithFallback
                                                        src={normalizeImage(res.book.image)}
                                                        alt={res.book.title}
                                                        className="object-cover"
                                                        fallback="/placeholder.png"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="w-12 h-16 bg-gray-100 rounded-lg shrink-0 flex items-center justify-center">
                                                    <span className="text-gray-400 text-xs">No img</span>
                                                </div>
                                            )}
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-900 line-clamp-2 max-w-xs">{res.book.title}</span>
                                                <span className="text-sm text-gray-500 line-clamp-1">{res.book.author}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {editingWhatsappId === res.id ? (
                                            <div className="flex min-w-56 items-center gap-1.5">
                                                <input
                                                    type="tel"
                                                    value={whatsappDraft}
                                                    onChange={(event) => setWhatsappDraft(event.target.value)}
                                                    onKeyDown={(event) => {
                                                        if (event.key === 'Enter') saveWhatsapp(res.id)
                                                        if (event.key === 'Escape') cancelWhatsappEdit()
                                                    }}
                                                    autoFocus
                                                    aria-label="Corriger le numéro WhatsApp"
                                                    className="min-w-0 flex-1 rounded-lg border border-blue-300 px-2.5 py-1.5 text-sm font-medium text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => saveWhatsapp(res.id)}
                                                    disabled={isLoading === res.id || whatsappDraft.trim().length === 0}
                                                    className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 disabled:opacity-40"
                                                    title="Enregistrer le numéro"
                                                >
                                                    {isLoading === res.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={cancelWhatsappEdit}
                                                    disabled={isLoading === res.id}
                                                    className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-40"
                                                    title="Annuler"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="space-y-1.5">
                                                <div className="flex items-center gap-2">
                                                    <span className={`font-medium ${isValidWhatsAppPhone(res.whatsapp) ? 'text-gray-900' : 'text-red-700'}`}>
                                                        {res.whatsapp}
                                                    </span>
                                                    {isValidWhatsAppPhone(res.whatsapp) && (
                                                        <button
                                                            type="button"
                                                            onClick={() => startWhatsappEdit(res)}
                                                            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                                                            title="Corriger le numéro WhatsApp"
                                                        >
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}
                                                </div>

                                                {!isValidWhatsAppPhone(res.whatsapp) && (
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <span className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-[10px] font-bold text-red-700">
                                                            <AlertTriangle className="h-3 w-3" /> Numéro invalide
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => startWhatsappEdit(res)}
                                                            className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700 hover:bg-blue-100"
                                                        >
                                                            <Pencil className="h-3 w-3" /> Modifier
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDelete(res.id)}
                                                            disabled={isLoading === res.id}
                                                            className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-[10px] font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
                                                        >
                                                            <Trash2 className="h-3 w-3" /> Supprimer
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-500">
                                            {new Date(res.createdAt).toLocaleDateString('fr-FR', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                                timeZone: 'Africa/Casablanca',
                                            })}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {res.status === 'PENDING' ? (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold uppercase tracking-widest rounded-full border border-amber-200">
                                                <Clock className="w-3.5 h-3.5" />
                                                En attente
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-widest rounded-full border border-emerald-200">
                                                <CheckCircle className="w-3.5 h-3.5" />
                                                Notifié
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        <div className="relative inline-block text-left">
                                            <button
                                                onClick={() => setOpenWhatsAppDropdown(openWhatsAppDropdown === res.id ? null : res.id)}
                                                className="inline-flex items-center justify-center p-2 text-green-600 hover:bg-green-50 rounded-xl transition-colors"
                                                title="Contacter sur WhatsApp"
                                            >
                                                <MessageCircle className="w-5 h-5" />
                                            </button>

                                            {openWhatsAppDropdown === res.id && (
                                                <div className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-xl bg-white shadow-lg ring-1 ring-black/5 focus:outline-none overflow-hidden">
                                                    <div className="py-1">
                                                        <a
                                                            href={`https://wa.me/${normalizeWhatsAppRecipient(res.whatsapp)}?text=${encodeURIComponent(buildReservationMessage(res, 'fr', `https://tekno.ma/fr/books/${res.bookId}`))}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="block px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100"
                                                            onClick={() => setOpenWhatsAppDropdown(null)}
                                                        >
                                                            🇫🇷 Français
                                                        </a>
                                                        <a
                                                            href={`https://wa.me/${normalizeWhatsAppRecipient(res.whatsapp)}?text=${encodeURIComponent(buildReservationMessage(res, 'darija', `https://tekno.ma/ar/books/${res.bookId}`))}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="block px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100"
                                                            onClick={() => setOpenWhatsAppDropdown(null)}
                                                        >
                                                            🇲🇦 Darija
                                                        </a>
                                                        <a
                                                            href={`https://wa.me/${normalizeWhatsAppRecipient(res.whatsapp)}?text=${encodeURIComponent(buildReservationMessage(res, 'ar', `https://tekno.ma/ar/books/${res.bookId}`))}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="block px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100"
                                                            onClick={() => setOpenWhatsAppDropdown(null)}
                                                        >
                                                            🇸🇦 العربية
                                                        </a>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {res.status === 'PENDING' && (
                                            <button
                                                onClick={() => handleStatusChange(res.id, 'NOTIFIED')}
                                                disabled={isLoading === res.id}
                                                className="inline-flex items-center justify-center p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors disabled:opacity-50"
                                                title="Marquer comme notifié"
                                            >
                                                <CheckCircle className="w-5 h-5" />
                                            </button>
                                        )}

                                        <button
                                            onClick={() => handleDelete(res.id)}
                                            disabled={isLoading === res.id}
                                            className="inline-flex items-center justify-center p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
                                            title="Supprimer"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
        </div>
    )
}
