'use client'

import { useState, useMemo } from 'react'
import {
    Briefcase, Plus, Search, MessageCircle, Phone, Mail, MapPin,
    Globe, Edit, Trash2, Check, X, FileSpreadsheet, Star,
    Building2, Filter, AlertCircle, ExternalLink
} from 'lucide-react'
import {
    saveSupplierContact,
    deleteSupplierContact,
    toggleSupplierContactStatus,
    SupplierContactData
} from '@/lib/actions/suppliers'

const DOMAINS = [
    'Distributeur Livres',
    'Éditeur & Impression',
    'Emballage & Expédition',
    'Papeterie & Accessoires',
    'Logistique & Transport',
    'Fournitures & Tech',
    'Marketing & Communication',
    'Autre'
]

const DOMAIN_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    'Distributeur Livres': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    'Éditeur & Impression': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    'Emballage & Expédition': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    'Papeterie & Accessoires': { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
    'Logistique & Transport': { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
    'Fournitures & Tech': { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
    'Marketing & Communication': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
    'Autre': { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' }
}

function formatWhatsAppUrl(rawPhone: string, contactName?: string, company?: string) {
    let clean = (rawPhone || '').replace(/[^0-9]/g, '')
    if (clean.startsWith('0')) {
        clean = '212' + clean.substring(1)
    } else if (!clean.startsWith('212') && clean.length === 9) {
        clean = '212' + clean
    }
    const greeting = contactName ? `Bonjour ${contactName}` : 'Bonjour'
    const companyText = company ? ` (${company})` : ''
    const text = encodeURIComponent(
        `${greeting}${companyText}, je vous contacte de la part de la librairie Tekno Store concernant nos commandes et collaborations.`
    )
    return `https://wa.me/${clean}?text=${text}`
}

export default function SuppliersClient({ initialContacts }: { initialContacts: any[] }) {
    const [contacts, setContacts] = useState(initialContacts)
    const [search, setSearch] = useState('')
    const [domainFilter, setDomainFilter] = useState('all')
    const [statusFilter, setStatusFilter] = useState('all')

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingContact, setEditingContact] = useState<SupplierContactData | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [feedback, setFeedback] = useState<string | null>(null)

    const showFeedback = (msg: string) => {
        setFeedback(msg)
        setTimeout(() => setFeedback(null), 3500)
    }

    const filteredContacts = useMemo(() => {
        return contacts.filter((c) => {
            const query = search.trim().toLowerCase()
            const matchesSearch =
                !query ||
                (c.name && c.name.toLowerCase().includes(query)) ||
                (c.company && c.company.toLowerCase().includes(query)) ||
                (c.phone && c.phone.includes(query)) ||
                (c.city && c.city.toLowerCase().includes(query)) ||
                (c.notes && c.notes.toLowerCase().includes(query))

            const matchesDomain = domainFilter === 'all' || c.domain === domainFilter
            const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'active' ? c.isActive : !c.isActive)

            return matchesSearch && matchesDomain && matchesStatus
        })
    }, [contacts, search, domainFilter, statusFilter])

    const handleOpenCreateModal = () => {
        setEditingContact({
            name: '',
            company: '',
            domain: DOMAINS[0],
            phone: '',
            email: '',
            city: '',
            address: '',
            website: '',
            notes: '',
            rating: 5,
            isActive: true
        })
        setIsModalOpen(true)
    }

    const handleOpenEditModal = (contact: any) => {
        setEditingContact({
            id: contact.id,
            name: contact.name,
            company: contact.company || '',
            domain: contact.domain,
            phone: contact.phone,
            email: contact.email || '',
            city: contact.city || '',
            address: contact.address || '',
            website: contact.website || '',
            notes: contact.notes || '',
            rating: contact.rating || 5,
            isActive: contact.isActive
        })
        setIsModalOpen(true)
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingContact) return

        setIsSaving(true)
        const res = await saveSupplierContact(editingContact)
        setIsSaving(false)

        if (res.success) {
            if (editingContact.id) {
                setContacts((prev) =>
                    prev.map((c) => (c.id === editingContact.id ? { ...c, ...editingContact } : c))
                )
                showFeedback('Contact modifié avec succès')
            } else {
                const newContact = { ...editingContact, id: res.id, createdAt: new Date().toISOString() }
                setContacts((prev) => [newContact, ...prev])
                showFeedback('Nouveau contact ajouté avec succès')
            }
            setIsModalOpen(false)
            setEditingContact(null)
        } else {
            alert(res.error || 'Erreur lors de l\'enregistrement')
        }
    }

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Supprimer définitivement le contact "${name}" ?`)) return
        const res = await deleteSupplierContact(id)
        if (res.success) {
            setContacts((prev) => prev.filter((c) => c.id !== id))
            showFeedback('Contact supprimé')
        } else {
            alert(res.error)
        }
    }

    const handleToggleStatus = async (contact: any) => {
        const next = !contact.isActive
        setContacts((prev) =>
            prev.map((c) => (c.id === contact.id ? { ...c, isActive: next } : c))
        )
        const res = await toggleSupplierContactStatus(contact.id, next)
        if (!res.success) {
            setContacts((prev) =>
                prev.map((c) => (c.id === contact.id ? { ...c, isActive: contact.isActive } : c))
            )
            alert(res.error)
        }
    }

    const handleExportExcel = () => {
        const headers = [
            'Nom Contact', 'Entreprise', 'Domaine', 'Téléphone', 'Email',
            'Ville', 'Adresse', 'Site Web', 'Statut', 'Note (Étoiles)', 'Remarques'
        ]

        const tableRows = filteredContacts.map((c) => `
            <tr>
                <td style="font-weight: bold;">${c.name}</td>
                <td>${c.company || '-'}</td>
                <td style="text-align: center;">${c.domain}</td>
                <td style="mso-number-format:'\\@';">${c.phone}</td>
                <td>${c.email || '-'}</td>
                <td>${c.city || '-'}</td>
                <td>${c.address || '-'}</td>
                <td>${c.website || '-'}</td>
                <td style="text-align: center;">${c.isActive ? 'Actif' : 'Inactif'}</td>
                <td style="text-align: center;">${c.rating || 5}/5</td>
                <td>${c.notes || ''}</td>
            </tr>
        `).join('')

        const excelTemplate = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 11pt; }
                table { border-collapse: collapse; width: 100%; }
                th { background-color: #047857; color: #ffffff; font-weight: bold; padding: 10px 8px; border: 1px solid #065f46; text-align: center; }
                td { padding: 8px; border: 1px solid #e5e7eb; vertical-align: middle; }
                tr:nth-child(even) td { background-color: #f9fafb; }
            </style>
        </head>
        <body>
            <table>
                <thead>
                    <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
                </thead>
                <tbody>${tableRows}</tbody>
            </table>
        </body>
        </html>`

        const blob = new Blob([excelTemplate], { type: 'application/vnd.ms-excel;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        const date = new Date().toISOString().split('T')[0]
        link.href = url
        link.setAttribute('download', `Tekno Store_Fournisseurs_Contacts_${date}.xls`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        showFeedback('Fichier Excel exporté avec succès')
    }

    return (
        <div className="space-y-6">
            {/* Feedback notification */}
            {feedback && (
                <div className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-bold border border-slate-700 animate-fade-in">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>{feedback}</span>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center">
                            <Briefcase className="w-5 h-5" />
                        </div>
                        Fournisseurs & Autres
                    </h1>
                    <p className="text-sm text-gray-500 mt-1 font-medium">
                        Répertoire des partenaires professionnels, distributeurs, éditeurs et prestataires avec contact WhatsApp direct.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={handleExportExcel}
                        className="inline-flex items-center gap-2 px-4 py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-2xl text-xs font-black shadow-xs transition-all cursor-pointer"
                        title="Exporter en Excel (.xls)"
                    >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        <span>Exporter Excel</span>
                    </button>
                    <button
                        onClick={handleOpenCreateModal}
                        className="inline-flex items-center gap-2 px-5 py-3 bg-black hover:bg-gray-800 text-white rounded-2xl text-xs font-black shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Nouveau Contact</span>
                    </button>
                </div>
            </div>

            {/* Toolbar / Filtres */}
            <div className="bg-white p-4 md:p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-6 relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Rechercher par nom, entreprise, téléphone, ville ou note..."
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50/70 border border-gray-200 rounded-xl text-xs md:text-sm font-medium focus:bg-white focus:border-black outline-none transition-all"
                        />
                    </div>
                    <div className="md:col-span-3">
                        <select
                            value={domainFilter}
                            onChange={(e) => setDomainFilter(e.target.value)}
                            className="w-full py-2.5 px-3 bg-gray-50/70 border border-gray-200 rounded-xl text-xs md:text-sm font-semibold focus:bg-white focus:border-black outline-none transition-all"
                        >
                            <option value="all">Tous les domaines ({contacts.length})</option>
                            {DOMAINS.map((dom) => {
                                const count = contacts.filter((c) => c.domain === dom).length
                                return (
                                    <option key={dom} value={dom}>
                                        {dom} ({count})
                                    </option>
                                )
                            })}
                        </select>
                    </div>
                    <div className="md:col-span-3">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full py-2.5 px-3 bg-gray-50/70 border border-gray-200 rounded-xl text-xs md:text-sm font-semibold focus:bg-white focus:border-black outline-none transition-all"
                        >
                            <option value="all">Tous les statuts</option>
                            <option value="active">Actifs ({contacts.filter((c) => c.isActive).length})</option>
                            <option value="inactive">Inactifs ({contacts.filter((c) => !c.isActive).length})</option>
                        </select>
                    </div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 px-1 font-medium">
                    <span>{filteredContacts.length} contact(s) trouvé(s)</span>
                    {(search || domainFilter !== 'all' || statusFilter !== 'all') && (
                        <button
                            onClick={() => {
                                setSearch('')
                                setDomainFilter('all')
                                setStatusFilter('all')
                            }}
                            className="text-emerald-700 hover:underline font-bold"
                        >
                            Réinitialiser les filtres
                        </button>
                    )}
                </div>
            </div>

            {/* Cartes des Fournisseurs / Contacts */}
            {filteredContacts.length === 0 ? (
                <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center text-gray-400">
                    <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-bold text-gray-700">Aucun contact trouvé</p>
                    <p className="text-xs text-gray-500 mt-1">Créez votre premier fournisseur ou réinitialisez les critères de recherche.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredContacts.map((contact) => {
                        const style = DOMAIN_COLORS[contact.domain] || DOMAIN_COLORS['Autre']
                        const whatsappLink = formatWhatsAppUrl(contact.phone, contact.name, contact.company)

                        return (
                            <div
                                key={contact.id}
                                className={`bg-white rounded-3xl border p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition-all ${
                                    contact.isActive ? 'border-gray-100' : 'border-gray-200 opacity-75 bg-gray-50/50'
                                }`}
                            >
                                <div>
                                    {/* Top: Domaine badge & Rating */}
                                    <div className="flex items-center justify-between gap-2 mb-3">
                                        <span
                                            className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${style.bg} ${style.text} ${style.border}`}
                                        >
                                            {contact.domain}
                                        </span>
                                        <div className="flex items-center text-amber-400 text-xs">
                                            {[...Array(contact.rating || 5)].map((_, i) => (
                                                <Star key={i} className="w-3.5 h-3.5 fill-current" />
                                            ))}
                                        </div>
                                    </div>

                                    {/* Nom & Entreprise */}
                                    <h3 className="text-lg font-black text-gray-900 tracking-tight leading-tight">
                                        {contact.name}
                                    </h3>
                                    {contact.company && (
                                        <p className="text-xs font-bold text-gray-500 flex items-center gap-1.5 mt-1">
                                            <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                            <span>{contact.company}</span>
                                        </p>
                                    )}

                                    {/* Coordonnées */}
                                    <div className="mt-4 space-y-2 text-xs text-gray-600 pt-3 border-t border-gray-100">
                                        <div className="flex items-center gap-2">
                                            <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                            <span className="font-mono font-bold text-gray-900">{contact.phone}</span>
                                        </div>
                                        {contact.email && (
                                            <div className="flex items-center gap-2 truncate">
                                                <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                <a href={`mailto:${contact.email}`} className="hover:underline truncate">
                                                    {contact.email}
                                                </a>
                                            </div>
                                        )}
                                        {contact.city && (
                                            <div className="flex items-center gap-2">
                                                <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                <span>
                                                    {contact.city}
                                                    {contact.address ? ` • ${contact.address}` : ''}
                                                </span>
                                            </div>
                                        )}
                                        {contact.website && (
                                            <div className="flex items-center gap-2 truncate">
                                                <Globe className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                                <a
                                                    href={contact.website.startsWith('http') ? contact.website : `https://${contact.website}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 hover:underline flex items-center gap-1 truncate"
                                                >
                                                    <span>{contact.website.replace(/^https?:\/\//, '')}</span>
                                                    <ExternalLink className="w-3 h-3 shrink-0" />
                                                </a>
                                            </div>
                                        )}
                                    </div>

                                    {/* Remarques */}
                                    {contact.notes && (
                                        <div className="mt-3 p-3 bg-gray-50 rounded-2xl text-[11px] text-gray-600 leading-relaxed border border-gray-100">
                                            {contact.notes}
                                        </div>
                                    )}
                                </div>

                                {/* Actions & Contact WhatsApp */}
                                <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 flex-1">
                                        {/* Bouton WhatsApp mis en avant */}
                                        <a
                                            href={whatsappLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex-1 inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs hover:shadow-sm active:scale-95 transition-all"
                                            title="Ouvrir WhatsApp avec un message pré-rempli"
                                        >
                                            <MessageCircle className="w-4 h-4 fill-current" />
                                            <span>WhatsApp</span>
                                        </a>

                                        {/* Bouton Appel Direct */}
                                        <a
                                            href={`tel:${contact.phone}`}
                                            className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors"
                                            title="Appeler"
                                        >
                                            <Phone className="w-4 h-4" />
                                        </a>
                                    </div>

                                    {/* Actions admin */}
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => handleToggleStatus(contact)}
                                            className={`p-2 rounded-xl text-xs font-bold transition-colors ${
                                                contact.isActive
                                                    ? 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                                                    : 'text-amber-600 bg-amber-50'
                                            }`}
                                            title={contact.isActive ? 'Désactiver' : 'Activer'}
                                        >
                                            {contact.isActive ? 'Actif' : 'Off'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleOpenEditModal(contact)}
                                            className="p-2 text-gray-500 hover:text-black hover:bg-gray-100 rounded-xl transition-colors"
                                            title="Modifier"
                                        >
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(contact.id, contact.name)}
                                            className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                                            title="Supprimer"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Modal Création / Modification */}
            {isModalOpen && editingContact && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
                    <div className="bg-white rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl p-6 md:p-8 relative animate-in fade-in zoom-in duration-200">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-6 right-6 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                        >
                            <X className="w-4 h-4 text-gray-500" />
                        </button>

                        <h2 className="text-xl font-black text-gray-900 mb-1">
                            {editingContact.id ? 'Modifier le contact' : 'Nouveau fournisseur / contact'}
                        </h2>
                        <p className="text-xs text-gray-500 mb-6">
                            Renseignez les détails du contact et son domaine d&apos;activité.
                        </p>

                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-700">Nom du contact *</label>
                                    <input
                                        type="text"
                                        required
                                        value={editingContact.name}
                                        onChange={(e) => setEditingContact({ ...editingContact, name: e.target.value })}
                                        placeholder="Ex: Karim Bennani"
                                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:border-black outline-none"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-700">Entreprise / Société</label>
                                    <input
                                        type="text"
                                        value={editingContact.company || ''}
                                        onChange={(e) => setEditingContact({ ...editingContact, company: e.target.value })}
                                        placeholder="Ex: Sochepress Distribution"
                                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:border-black outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-700">Domaine d&apos;activité *</label>
                                    <select
                                        required
                                        value={editingContact.domain}
                                        onChange={(e) => setEditingContact({ ...editingContact, domain: e.target.value })}
                                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:border-black outline-none"
                                    >
                                        {DOMAINS.map((dom) => (
                                            <option key={dom} value={dom}>
                                                {dom}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-700">Téléphone (WhatsApp) *</label>
                                    <input
                                        type="tel"
                                        required
                                        value={editingContact.phone}
                                        onChange={(e) => setEditingContact({ ...editingContact, phone: e.target.value })}
                                        placeholder="06 00 00 00 00"
                                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium font-mono focus:bg-white focus:border-black outline-none"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-700">Email</label>
                                    <input
                                        type="email"
                                        value={editingContact.email || ''}
                                        onChange={(e) => setEditingContact({ ...editingContact, email: e.target.value })}
                                        placeholder="contact@exemple.ma"
                                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:border-black outline-none"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-700">Ville</label>
                                    <input
                                        type="text"
                                        value={editingContact.city || ''}
                                        onChange={(e) => setEditingContact({ ...editingContact, city: e.target.value })}
                                        placeholder="Ex: Casablanca, Rabat..."
                                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:border-black outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-700">Adresse</label>
                                <input
                                    type="text"
                                    value={editingContact.address || ''}
                                    onChange={(e) => setEditingContact({ ...editingContact, address: e.target.value })}
                                    placeholder="Adresse des locaux ou entrepôt"
                                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:border-black outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-700">Site Web ou Catalogue</label>
                                    <input
                                        type="text"
                                        value={editingContact.website || ''}
                                        onChange={(e) => setEditingContact({ ...editingContact, website: e.target.value })}
                                        placeholder="https://..."
                                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:border-black outline-none"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-700">Note partenaire</label>
                                    <select
                                        value={editingContact.rating || 5}
                                        onChange={(e) => setEditingContact({ ...editingContact, rating: Number(e.target.value) })}
                                        className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:border-black outline-none"
                                    >
                                        <option value={5}>5 étoiles (Excellente réactivité)</option>
                                        <option value={4}>4 étoiles (Bon service)</option>
                                        <option value={3}>3 étoiles (Moyen)</option>
                                        <option value={2}>2 étoiles (Délais longs)</option>
                                        <option value={1}>1 étoile (À éviter)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-700">Notes & Conditions commerciales</label>
                                <textarea
                                    rows={3}
                                    value={editingContact.notes || ''}
                                    onChange={(e) => setEditingContact({ ...editingContact, notes: e.target.value })}
                                    placeholder="Délais de livraison, remises accordées, fréquence de commande..."
                                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:bg-white focus:border-black outline-none"
                                />
                            </div>

                            <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-5 py-2.5 text-xs font-bold text-gray-600 hover:text-black rounded-xl hover:bg-gray-100 transition-colors"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-6 py-2.5 bg-black hover:bg-gray-800 text-white rounded-xl text-xs font-black shadow-md transition-all disabled:opacity-50"
                                >
                                    {isSaving ? 'Enregistrement...' : 'Enregistrer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
