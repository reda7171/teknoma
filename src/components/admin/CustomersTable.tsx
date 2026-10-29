'use client'

import React, { useState } from 'react'
import {
    Users,
    ShoppingBag,
    ShoppingCart,
    MapPin,
    Phone,
    Edit2,
    Trash2,
    X,
    Save,
    Loader2,
    Mail,
    BookOpen,
    ExternalLink,
    MessagesSquare,
    CheckCircle,
    Eye
} from 'lucide-react'
import { updateCustomer, deleteCustomer, createCustomer } from '@/lib/actions/customers'
import type { CustomerCartInfo, CartProductItem } from '@/app/[locale]/admin/customers/page'

export interface Customer {
    id: string
    fullName: string
    phone: string
    email?: string
    city?: string
    address?: string
    totalOrders: number
    totalSpent: number
    lastOrderDate: Date | string
    source?: 'google' | 'facebook' | 'order' | 'community'
    cart?: CustomerCartInfo
}

interface CustomersTableProps {
    initialCustomers: Customer[]
    externalSearch?: string
    selectedSource?: string
    setIsCreating?: (val: boolean) => void
}

export default function CustomersTable({
    initialCustomers,
    externalSearch = '',
    selectedSource = 'all',
    setIsCreating: setExternalIsCreating
}: CustomersTableProps) {
    const [customers, setCustomers] = useState(initialCustomers)
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
    const [viewingCartCustomer, setViewingCartCustomer] = useState<Customer | null>(null)
    const [isCreating, setIsCreating] = useState(false)
    const [isDeleting, setIsDeleting] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const getWhatsAppUrl = (phone?: string, name?: string, items?: CartProductItem[], type?: string) => {
        if (!phone) return null
        let clean = phone.replace(/[^0-9]/g, '')
        if (clean.startsWith('0') && clean.length === 10) {
            clean = '212' + clean.slice(1)
        } else if (clean.startsWith('00')) {
            clean = clean.slice(2)
        } else if (!clean.startsWith('212') && clean.length === 9) {
            clean = '212' + clean
        }
        const booksList = items?.map(i => `• ${i.title} (x${i.quantity}) - ${i.price} DH`).join('\n') || ''
        const intro = type === 'active_cart'
            ? `Bonjour ${name || ''}, nous avons remarqué que vous aviez sélectionné des articles sur PetsUnivers :`
            : `Bonjour ${name || ''}, suite à votre commande sur PetsUnivers :`
        const msg = `${intro}\n\n${booksList}\n\nSouhaitez-vous de l'aide ou finaliser une nouvelle livraison ? Nous restons à votre entière disposition.`
        return `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`
    }

    React.useEffect(() => {
        setCustomers(initialCustomers)
    }, [initialCustomers])

    React.useEffect(() => {
        const handleOpen = () => setIsCreating(true)
        window.addEventListener('open-customer-modal', handleOpen)
        return () => window.removeEventListener('open-customer-modal', handleOpen)
    }, [])

    // Filtrage recherche textuelle + source
    const filteredCustomers = customers.filter(c => {
        const search = externalSearch.toLowerCase()
        const matchesSearch =
            (c.fullName || '').toLowerCase().includes(search) ||
            (c.phone || '').includes(search) ||
            (c.email || '').toLowerCase().includes(search) ||
            (c.city || '').toLowerCase().includes(search)

        const matchesSource = !selectedSource || selectedSource === 'all' || c.source === selectedSource
        return matchesSearch && matchesSource
    })

    const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!editingCustomer) return

        setLoading(true)
        setError(null)
        const formData = new FormData(e.currentTarget)
        const data = {
            fullName: formData.get('fullName') as string,
            phone: formData.get('phone') as string,
            email: formData.get('email') as string,
            city: formData.get('city') as string,
            address: formData.get('address') as string,
        }

        const result = await updateCustomer(editingCustomer.id, data)

        if (result.success) {
            setCustomers(prev => prev.map(c =>
                c.id === editingCustomer.id ? { ...c, ...data } : c
            ))
            setEditingCustomer(null)
        } else {
            setError(result.error || 'Erreur lors de la mise à jour')
        }
        setLoading(false)
    }

    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        const formData = new FormData(e.currentTarget)
        const data = {
            fullName: formData.get('fullName') as string,
            phone: formData.get('phone') as string,
            email: formData.get('email') as string,
            city: formData.get('city') as string,
            address: formData.get('address') as string,
        }

        const result = await createCustomer(data)

        if (result.success) {
            setCustomers(prev => [{
                id: Math.random().toString(),
                ...data,
                totalOrders: 0,
                totalSpent: 0,
                lastOrderDate: new Date(),
                source: 'community'
            }, ...prev])
            setIsCreating(false)
        } else {
            setError(result.error || 'Erreur lors de la création')
        }
        setLoading(false)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Voulez-vous vraiment supprimer ce lecteur de la base de données ?')) return
        setIsDeleting(id)
        const result = await deleteCustomer(id)
        if (result.success) {
            setCustomers(prev => prev.filter(c => c.id !== id))
        } else {
            alert(result.error || 'Erreur lors de la suppression')
        }
        setIsDeleting(null)
    }

    return (
        <div className="relative">
            {/* Table Container */}
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Lecteur</th>
                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Localisation</th>
                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Panier & Produits</th>
                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 text-center">Historique</th>
                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 text-right">Valeur</th>
                                <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredCustomers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-8 py-16 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <Users className="w-12 h-12 text-gray-100" />
                                            <p className="text-gray-400 font-bold">Aucun lecteur trouvé</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredCustomers.map((customer) => (
                                    <tr key={customer.id} className="group hover:bg-gray-50/60 transition-colors">
                                        <td className="px-8 py-7">
                                            <div className="flex items-center gap-5">
                                                <div className="relative flex-shrink-0">
                                                    <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-black/10">
                                                        {(customer.fullName || 'L').charAt(0).toUpperCase()}
                                                    </div>
                                                    {customer.source === 'google' && (
                                                        <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md border border-gray-100" title="Connecté via Google">
                                                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                                                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                                                            </svg>
                                                        </span>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                                        <p className="text-base font-black text-black leading-none">{customer.fullName}</p>
                                                        {customer.source === 'google' && (
                                                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-50 text-red-600 border border-red-100 flex items-center gap-1">
                                                                Google
                                                            </span>
                                                        )}
                                                        {customer.source === 'facebook' && (
                                                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-100">
                                                                Facebook
                                                            </span>
                                                        )}
                                                        {customer.source === 'community' && (
                                                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-100">
                                                                Communauté
                                                            </span>
                                                        )}
                                                        {customer.source === 'order' && (
                                                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                                Client COD
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        <p className="text-xs text-gray-400 font-bold flex items-center gap-1.5">
                                                            <Phone className="w-3 h-3" />
                                                            {customer.phone || 'Non renseigné'}
                                                        </p>
                                                        {customer.email && (
                                                            <p className="text-[10px] text-gray-400 font-bold flex items-center gap-1.5 lowercase">
                                                                <Mail className="w-3 h-3" />
                                                                {customer.email}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-7">
                                            <div className="flex items-center gap-2 text-sm font-bold text-black">
                                                <MapPin className="w-4 h-4 text-gray-300 flex-shrink-0" />
                                                <span>{customer.city || 'Non renseigné'}</span>
                                            </div>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 truncate max-w-[200px]">
                                                {customer.address || 'Aucune adresse'}
                                            </p>
                                        </td>
                                        <td className="px-8 py-7">
                                            {(!customer.cart || !customer.cart.items || customer.cart.items.length === 0) ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-gray-50 text-gray-400 border border-gray-100">
                                                    <ShoppingCart className="w-3 h-3 opacity-50" />
                                                    Panier vide
                                                </span>
                                            ) : (
                                                <div className="flex flex-col gap-2 min-w-[200px]">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                                            customer.cart.type === 'active_cart'
                                                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                        }`}>
                                                            <ShoppingCart className="w-2.5 h-2.5" />
                                                            {customer.cart.type === 'active_cart' ? 'En cours' : 'Dernier'} ({customer.cart.items.reduce((s, it) => s + (it.quantity || 1), 0)})
                                                        </span>
                                                        <span className="text-xs font-black text-black">
                                                            {customer.cart.total.toFixed(0)} <span className="text-[9px] text-gray-400 font-bold">DH</span>
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <div className="flex items-center -space-x-2 overflow-hidden py-0.5">
                                                            {customer.cart.items.slice(0, 3).map((item, idx) => (
                                                                <button
                                                                    key={idx}
                                                                    type="button"
                                                                    title={`${item.title} (x${item.quantity}) - ${item.price} DH`}
                                                                    onClick={() => setViewingCartCustomer(customer)}
                                                                    className="w-8 h-10 rounded-md overflow-hidden bg-gray-100 border-2 border-white shadow-sm flex-shrink-0 relative hover:scale-105 transition-transform"
                                                                >
                                                                    {item.image ? (
                                                                        <img
                                                                            src={item.image}
                                                                            alt={item.title}
                                                                            className="w-full h-full object-cover"
                                                                            loading="lazy"
                                                                        />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                                                                            <BookOpen className="w-3 h-3" />
                                                                        </div>
                                                                    )}
                                                                </button>
                                                            ))}
                                                            {customer.cart.items.length > 3 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setViewingCartCustomer(customer)}
                                                                    className="w-8 h-10 rounded-md bg-black text-white text-[9px] font-black flex items-center justify-center border-2 border-white shadow-sm flex-shrink-0 hover:bg-gray-800 transition-colors"
                                                                    title="Voir tous les articles"
                                                                >
                                                                    +{customer.cart.items.length - 3}
                                                                </button>
                                                            )}
                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={() => setViewingCartCustomer(customer)}
                                                            className="text-[10px] font-bold text-gray-500 hover:text-black flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                                                            title="Consulter le panier"
                                                        >
                                                            <Eye className="w-3 h-3" />
                                                            Voir
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-8 py-7">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="px-4 py-1.5 bg-gray-100 rounded-full text-[10px] font-black text-black uppercase tracking-widest flex items-center gap-2">
                                                    <ShoppingBag className="w-3 h-3" />
                                                    {customer.totalOrders} commandes
                                                </div>
                                                <p className="text-[9px] text-gray-400 font-black uppercase">
                                                    Actif le: {new Date(customer.lastOrderDate).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-8 py-7 text-right">
                                            <p className="text-xl font-black text-black tracking-tighter">
                                                {customer.totalSpent.toFixed(0)} <span className="text-[10px] text-gray-400 uppercase ml-1">درهم</span>
                                            </p>
                                        </td>
                                        <td className="px-8 py-7 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                <button
                                                    onClick={() => setEditingCustomer(customer)}
                                                    className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:bg-black hover:text-white transition-all active:scale-90"
                                                    title="Modifier"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(customer.id)}
                                                    disabled={isDeleting === customer.id}
                                                    className="p-3 bg-red-50 text-red-400 rounded-2xl hover:bg-red-500 hover:text-white transition-all active:scale-90 disabled:opacity-50"
                                                    title="Supprimer"
                                                >
                                                    {isDeleting === customer.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Création/Édition */}
            {(isCreating || editingCustomer) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-white/20">
                        <div className="p-10 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div>
                                <h3 className="text-3xl font-black text-black tracking-tighter">
                                    {isCreating ? 'Nouveau Lecteur' : 'Profil Lecteur'}
                                </h3>
                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">
                                    {isCreating ? 'Ajouter manuellement à la base' : 'Édition des informations de contact'}
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setIsCreating(false)
                                    setEditingCustomer(null)
                                    setError(null)
                                }}
                                className="p-4 hover:bg-white rounded-[2rem] transition-colors shadow-sm"
                            >
                                <X className="w-6 h-6 text-gray-400" />
                            </button>
                        </div>

                        <form onSubmit={isCreating ? handleCreate : handleUpdate} className="p-12 space-y-10">
                            {error && (
                                <div className="p-5 bg-red-50 border-2 border-red-100 rounded-3xl text-red-600 text-xs font-black uppercase tracking-widest text-center">
                                    {error}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Identité complète</label>
                                    <input
                                        name="fullName"
                                        defaultValue={editingCustomer?.fullName}
                                        required
                                        placeholder="Ex: Reda Bench"
                                        className="w-full px-8 py-5 bg-gray-50 border-2 border-transparent rounded-[1.5rem] focus:bg-white focus:border-black outline-none transition-all font-bold text-black text-sm"
                                    />
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Numéro WhatsApp</label>
                                    <input
                                        name="phone"
                                        defaultValue={editingCustomer?.phone}
                                        placeholder="Ex: 0612345678"
                                        className="w-full px-8 py-5 bg-gray-50 border-2 border-transparent rounded-[1.5rem] focus:bg-white focus:border-black outline-none transition-all font-bold text-black text-sm"
                                    />
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Email</label>
                                    <input
                                        name="email"
                                        type="email"
                                        defaultValue={editingCustomer?.email || ''}
                                        placeholder="Ex: contact@petsunivers.ma"
                                        className="w-full px-8 py-5 bg-gray-50 border-2 border-transparent rounded-[1.5rem] focus:bg-white focus:border-black outline-none transition-all font-bold text-black text-sm"
                                    />
                                </div>
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Ville de résidence</label>
                                    <input
                                        name="city"
                                        defaultValue={editingCustomer?.city || ''}
                                        placeholder="Ex: Casablanca"
                                        className="w-full px-8 py-5 bg-gray-50 border-2 border-transparent rounded-[1.5rem] focus:bg-white focus:border-black outline-none transition-all font-bold text-black text-sm"
                                    />
                                </div>
                                <div className="col-span-1 md:col-span-2 space-y-4">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Adresse de livraison détaillée</label>
                                    <textarea
                                        name="address"
                                        defaultValue={editingCustomer?.address || ''}
                                        placeholder="Numéro, rue, quartier..."
                                        rows={3}
                                        className="w-full px-8 py-5 bg-gray-50 border-2 border-transparent rounded-[2rem] focus:bg-white focus:border-black outline-none transition-all font-bold text-black text-sm resize-none"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col md:flex-row gap-5 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsCreating(false)
                                        setEditingCustomer(null)
                                        setError(null)
                                    }}
                                    className="flex-1 py-6 bg-gray-100 text-gray-400 font-black uppercase tracking-widest text-[10px] rounded-[1.5rem] hover:bg-gray-200 transition-all active:scale-95"
                                >
                                    Fermer sans enregistrer
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-2 py-6 bg-black text-white font-black uppercase tracking-widest text-[10px] rounded-[1.5rem] hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 shadow-2xl shadow-black/20"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                    {isCreating ? 'Confirmer la création' : 'Mettre à jour le lecteur'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Détails du Panier */}
            {viewingCartCustomer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-white/20">
                        <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-white">
                                    <ShoppingCart className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-xl font-black text-black">
                                            {viewingCartCustomer.fullName}
                                        </h3>
                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                            viewingCartCustomer.cart?.type === 'active_cart'
                                                ? 'bg-amber-50 text-amber-800 border-amber-200'
                                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                        }`}>
                                            {viewingCartCustomer.cart?.type === 'active_cart' ? 'Panier actif / abandonné' : 'Dernier panier commandé'}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-gray-400 font-bold flex items-center gap-2 mt-0.5">
                                        <span>{viewingCartCustomer.phone || 'Sans téléphone'}</span>
                                        {viewingCartCustomer.city && <span>• {viewingCartCustomer.city}</span>}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setViewingCartCustomer(null)}
                                className="p-3 hover:bg-white rounded-2xl transition-colors shadow-sm"
                            >
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        {/* Liste des articles */}
                        <div className="p-8 max-h-[50vh] overflow-y-auto divide-y divide-gray-100">
                            {(!viewingCartCustomer.cart?.items || viewingCartCustomer.cart.items.length === 0) ? (
                                <div className="py-12 text-center text-gray-400 font-bold text-sm">
                                    Aucun produit dans ce panier
                                </div>
                            ) : (
                                viewingCartCustomer.cart.items.map((item, idx) => (
                                    <div key={idx} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-18 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0 shadow-sm">
                                                {item.image ? (
                                                    <img
                                                        src={item.image}
                                                        alt={item.title}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                        <BookOpen className="w-6 h-6" />
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="text-sm font-black text-black leading-tight">
                                                        {item.title}
                                                    </p>
                                                    {item.type && (
                                                        <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-gray-100 text-gray-600">
                                                            {item.type}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-gray-500 font-bold">
                                                    {item.price.toFixed(0)} DH × {item.quantity}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-sm font-black text-black">
                                                {(item.price * item.quantity).toFixed(0)} DH
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Récapitulatif & Actions */}
                        <div className="p-8 bg-gray-50/70 border-t border-gray-100 flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black uppercase tracking-wider text-gray-400">
                                    Total Panier ({viewingCartCustomer.cart?.items?.reduce((s, it) => s + (it.quantity || 1), 0) || 0} articles)
                                </span>
                                <span className="text-2xl font-black text-black">
                                    {(viewingCartCustomer.cart?.total || 0).toFixed(0)} <span className="text-xs text-gray-400 uppercase font-bold">DH</span>
                                </span>
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                {viewingCartCustomer.phone && getWhatsAppUrl(viewingCartCustomer.phone, viewingCartCustomer.fullName, viewingCartCustomer.cart?.items, viewingCartCustomer.cart?.type) && (
                                    <a
                                        href={getWhatsAppUrl(viewingCartCustomer.phone, viewingCartCustomer.fullName, viewingCartCustomer.cart?.items, viewingCartCustomer.cart?.type) || '#'}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 py-4 bg-emerald-600 text-white font-black uppercase tracking-wider text-[11px] rounded-2xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95"
                                    >
                                        <MessagesSquare className="w-4 h-4" />
                                        Relance WhatsApp Panier
                                    </a>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setViewingCartCustomer(null)}
                                    className="px-8 py-4 bg-gray-200 text-gray-700 font-black uppercase tracking-wider text-[11px] rounded-2xl hover:bg-gray-300 transition-all active:scale-95"
                                >
                                    Fermer
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
