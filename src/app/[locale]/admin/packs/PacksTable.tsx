'use client'

import { useState } from 'react'
import { Link } from '@/i18n/routing'
import Image from 'next/image'
import { Edit, Trash2, Eye, EyeOff, Save, Send, AlertTriangle } from 'lucide-react'
import { deletePack, togglePackStatus } from '@/lib/actions/packs'
import { deactivatePackOnJumia } from '@/lib/actions/jumia'
import N8nPublishModal from '@/components/admin/N8nPublishModal'

interface Pack {
    id: string
    name: string
    price: number
    originalPrice?: number | null
    image: string | null
    description?: string | null
    active: boolean
    isSyncedWithJumia: boolean
    sellerSku?: string | null
    language?: string
    createdAt?: Date | string
    books: Array<{
        book: {
            id: string
            title: string
            author: string
            image: string
            stock?: number
        }
    }>
}

export default function PacksTable({ packs }: { packs: Pack[] }) {
    const [loading, setLoading] = useState<string | null>(null)
    const [n8nPack, setN8nPack] = useState<any | null>(null)
    const [n8nFormat, setN8nFormat] = useState<'post' | 'story'>('post')
    const [quickPublishing, setQuickPublishing] = useState<string | null>(null)
    const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('ALL')
    const [stockFilter, setStockFilter] = useState('ALL')
    const [sortFilter, setSortFilter] = useState('DATE_DESC')

    async function handleDelete(id: string, name: string) {
        if (!confirm(`Êtes-vous sûr de vouloir supprimer "${name}" ?`)) {
            return
        }

        setLoading(id)
        const result = await deletePack(id)
        setLoading(null)

        if (!result.success) {
            alert(result.error)
        }
    }

    async function handleToggleStatus(id: string, currentStatus: boolean) {
        setLoading(id)
        const result = await togglePackStatus(id, !currentStatus)
        setLoading(null)

        if (!result.success) {
            alert(result.error)
        }
    }

    async function handleDeactivateJumia(id: string) {
        if (!confirm('Voulez-vous vraiment désactiver ce pack sur Jumia ?')) return
        setLoading(id)
        const result = await deactivatePackOnJumia(id)
        setLoading(null)
        if (result.success) {
            setToast({ msg: result.message, ok: true })
            setTimeout(() => window.location.reload(), 1500)
        } else {
            setToast({ msg: result.message, ok: false })
            setTimeout(() => setToast(null), 5000)
        }
    }

    // Publication immédiate sans modal
    const handleQuickPublish = async (pack: Pack) => {
        setQuickPublishing(pack.id)
        try {
            const res = await fetch('/api/n8n/publish', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    packId: pack.id,
                    format: 'post',
                    platform: 'both',
                    useDescription: 'short',
                    scheduleAt: null
                })
            })
            const data = await res.json()
            if (data.success) {
                setToast({ msg: `✅ Pack "${pack.name}" envoyé à n8n`, ok: true })
                setTimeout(() => setToast(null), 4000)
            } else {
                setToast({ msg: `❌ ${data.error || 'Erreur n8n'}`, ok: false })
                setTimeout(() => setToast(null), 5000)
            }
        } catch {
            setToast({ msg: '❌ Erreur réseau', ok: false })
            setTimeout(() => setToast(null), 5000)
        } finally {
            setQuickPublishing(null)
        }
    }

    const filteredPacks = packs.filter(pack => {
        const matchesSearch = pack.name.toLowerCase().includes(search.toLowerCase())
        
        let matchesStatus = true
        if (statusFilter === 'ACTIVE') matchesStatus = pack.active
        if (statusFilter === 'INACTIVE') matchesStatus = !pack.active
        if (statusFilter === 'NO_IMAGE') matchesStatus = !pack.image
        
        let matchesStock = true
        const isOutOfStock = pack.books.some(b => (b.book.stock || 0) <= 0)
        if (stockFilter === 'IN_STOCK') matchesStock = !isOutOfStock
        if (stockFilter === 'OUT_OF_STOCK') matchesStock = isOutOfStock
        
        return matchesSearch && matchesStatus && matchesStock
    }).sort((a, b) => {
        if (sortFilter === 'DATE_DESC') {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
        }
        if (sortFilter === 'DATE_ASC') {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateA - dateB;
        }
        if (sortFilter === 'NAME_ASC') return a.name.localeCompare(b.name)
        if (sortFilter === 'NAME_DESC') return b.name.localeCompare(a.name)
        if (sortFilter === 'PRICE_ASC') return a.price - b.price
        if (sortFilter === 'PRICE_DESC') return b.price - a.price
        return 0
    })

    return (
        <div className="overflow-x-auto relative flex flex-col">
            <div className="p-4 bg-white border-b border-gray-200 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex gap-4 flex-1 flex-wrap">
                    <input 
                        type="text" 
                        placeholder="Rechercher un pack par nom..." 
                        className="border border-gray-300 rounded-lg px-4 py-2 text-sm w-full max-w-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <select aria-label="Champ de sélection" 
                        className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="ALL">Tous les statuts</option>
                        <option value="ACTIVE">Actifs uniquement</option>
                        <option value="INACTIVE">Inactifs uniquement</option>
                        <option value="NO_IMAGE">Sans Image</option>
                    </select>
                    <select aria-label="Champ de sélection" 
                        className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={stockFilter}
                        onChange={(e) => setStockFilter(e.target.value)}
                    >
                        <option value="ALL">Tous les packs</option>
                        <option value="IN_STOCK">Complet</option>
                        <option value="OUT_OF_STOCK">Incomplet (livres manquants)</option>
                    </select>
                    <select aria-label="Champ de sélection" 
                        className="border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={sortFilter}
                        onChange={(e) => setSortFilter(e.target.value)}
                    >
                        <option value="DATE_DESC">Plus récent</option>
                        <option value="DATE_ASC">Plus ancien</option>
                        <option value="NAME_ASC">Nom (A-Z)</option>
                        <option value="NAME_DESC">Nom (Z-A)</option>
                        <option value="PRICE_ASC">Prix croissant</option>
                        <option value="PRICE_DESC">Prix décroissant</option>
                    </select>
                </div>
            </div>

            {/* Toast notification */}
            {toast && (
                <div className={`fixed top-6 right-6 z-[9999] px-5 py-3 rounded-xl shadow-2xl text-sm font-bold transition-all animate-in slide-in-from-top-2 ${toast.ok ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                    {toast.msg}
                </div>
            )}
            <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Pack
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Livres Inclus
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Prix Normal
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Prix Promo
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Jumia
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            État du Pack
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Statut
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {filteredPacks.length === 0 && (
                        <tr>
                            <td colSpan={5} className="text-center py-12 text-gray-500">
                                {packs.length === 0 ? "Aucun pack trouvé" : "Aucun pack ne correspond à vos filtres"}
                            </td>
                        </tr>
                    )}
                    {filteredPacks.map((pack) => (
                        <tr key={pack.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4">
                                <div className="flex items-center">
                                    {pack.image && (
                                        <div className="h-16 w-12 flex-shrink-0 relative mr-4">
                                            <Image
                                                src={pack.image}
                                                alt={pack.name}
                                                fill
                                                className="object-cover rounded"
                                                unoptimized
                                            />
                                        </div>
                                    )}
                                    <div className="flex flex-col">
                                        <Link 
                                            href={`/admin/packs/${pack.id}/edit`}
                                            className="text-sm font-bold text-blue-600 hover:text-blue-800 hover:underline"
                                        >
                                            {pack.name}
                                        </Link>
                                        <div className="text-sm text-gray-500 flex items-center gap-2">
                                            <span>{pack.books.length} livre{pack.books.length > 1 ? 's' : ''}</span>
                                            {pack.language && (
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-100 text-gray-600 border border-gray-200">
                                                    {pack.language}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                                            SKU: {pack.sellerSku || pack.id}
                                        </div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex flex-wrap gap-2">
                                    {pack.books.slice(0, 3).map((pb) => (
                                        <Link
                                            key={pb.book.id}
                                            href={`/admin/books/${pb.book.id}/edit`}
                                            className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-gray-100 text-[10px] font-bold text-gray-700 uppercase tracking-tighter hover:bg-blue-50 hover:text-blue-700 transition-colors border border-gray-200"
                                            title={pb.book.title}
                                        >
                                            <span className="truncate max-w-[120px]">{pb.book.title}</span>
                                            <span className={`px-1.5 py-0.5 rounded-sm flex items-center ${pb.book.stock && pb.book.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                Qté: {pb.book.stock || 0}
                                            </span>
                                        </Link>
                                    ))}
                                    {pack.books.length > 3 && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-200 text-[10px] font-bold text-gray-700">
                                            +{pack.books.length - 3}
                                        </span>
                                    )}
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {pack.originalPrice ? <span className="line-through text-gray-400 mr-2">{pack.originalPrice} درهم</span> : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-blue-600">
                                {pack.price} درهم
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <button
                                    onClick={() => handleToggleStatus(pack.id, pack.active)}
                                    disabled={loading === pack.id}
                                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold transition-all ${pack.active
                                        ? 'bg-green-100 text-green-800 border border-green-200'
                                        : 'bg-gray-100 text-gray-800 border border-gray-200'
                                        } hover:opacity-80 shadow-sm`}
                                >
                                    {pack.active ? (
                                        <>
                                            <Eye className="w-3 h-3 mr-1.5" />
                                            Actif
                                        </>
                                    ) : (
                                        <>
                                            <EyeOff className="w-3 h-3 mr-1.5" />
                                            Inactif
                                        </>
                                    )}
                                </button>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-col gap-2 items-start">
                                    {pack.isSyncedWithJumia ? (
                                        <>
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-orange-100 text-[10px] font-bold text-orange-800 uppercase tracking-tighter border border-orange-200">
                                                Publié
                                            </span>
                                            <button 
                                                onClick={() => handleDeactivateJumia(pack.id)}
                                                disabled={loading === pack.id}
                                                className="text-[10px] font-bold text-red-600 hover:text-red-800 uppercase tracking-tighter border border-red-200 bg-red-50 px-2 py-1 rounded disabled:opacity-50"
                                            >
                                                Désactiver Jumia
                                            </button>
                                        </>
                                    ) : (
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-tighter border border-gray-200">
                                            Non publié
                                        </span>
                                    )}
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                {pack.books.some(pb => (pb.book.stock || 0) <= 0) ? (
                                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-red-100 text-[10px] font-bold text-red-700 uppercase tracking-tighter border border-red-200">
                                        <AlertTriangle className="w-3 h-3 mr-1" />
                                        Incomplet (Livre en rupture)
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-green-100 text-[10px] font-bold text-green-700 uppercase tracking-tighter border border-green-200">
                                        Complet
                                    </span>
                                )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex items-center justify-end gap-2">
                                    {/* Boutons n8n */}
                                    <button
                                        onClick={() => { setN8nFormat('post'); setN8nPack({ ...pack, title: pack.name, description: pack.description || `Pack de ${pack.books.length} livres` }); }}
                                        className="text-green-600 hover:text-green-900 p-2 hover:bg-green-50 rounded-xl transition-all"
                                        title="Publier / Programmer via n8n (FB/Insta)"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
                                    </button>
                                    <button
                                        onClick={() => handleQuickPublish(pack)}
                                        disabled={quickPublishing === pack.id}
                                        className="text-orange-600 hover:text-orange-900 p-2 hover:bg-orange-50 rounded-xl transition-all disabled:opacity-40"
                                        title="Publier maintenant (FB+Insta) sans options"
                                    >
                                        {quickPublishing === pack.id
                                            ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                                            : <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                                        }
                                    </button>

                                    <Link
                                        href={`/admin/packs/${pack.id}/edit`}
                                        className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-xl transition-all"
                                        title="Modifier"
                                    >
                                        <Edit className="w-4 h-4" />
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(pack.id, pack.name)}
                                        disabled={loading === pack.id}
                                        className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-xl transition-all disabled:opacity-50"
                                        title="Supprimer"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <N8nPublishModal
                isOpen={!!n8nPack}
                onClose={() => setN8nPack(null)}
                book={n8nPack}
                format={n8nFormat}
            />
        </div>
    )
}
