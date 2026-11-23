'use client'

import React, { useState } from 'react'
import {
    Phone,
    Mail,
    Search,
    Download,
    MessageCircle,
    CheckCircle2,
    Clock,
    Trash2,
    Calendar,
    Users,
    TrendingUp,
    Sparkles,
    Check
} from 'lucide-react'
import { togglePromoLeadContacted, deletePromoLead } from '@/lib/actions/promo-leads'

interface Lead {
    id: string
    phone: string | null
    email: string | null
    promoCode: string | null
    source: string | null
    contacted: boolean
    notes: string | null
    createdAt: Date | string
}

interface Stats {
    totalAll: number
    todayCount: number
    weekCount: number
    withPhoneCount: number
}

interface Props {
    initialLeads: Lead[]
    initialStats: Stats
}

export function PromoLeadsClient({ initialLeads, initialStats }: Props) {
    const [leads, setLeads] = useState<Lead[]>(initialLeads)
    const [search, setSearch] = useState('')
    const [filterStatus, setFilterStatus] = useState<'all' | 'uncontacted' | 'contacted'>('all')
    const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState<string | null>(null)

    const showFeedback = (msg: string) => {
        setFeedbackMessage(msg)
        setTimeout(() => setFeedbackMessage(null), 3000)
    }

    const filteredLeads = leads.filter((l) => {
        const matchesSearch =
            !search ||
            (l.phone && l.phone.toLowerCase().includes(search.toLowerCase())) ||
            (l.email && l.email.toLowerCase().includes(search.toLowerCase())) ||
            (l.promoCode && l.promoCode.toLowerCase().includes(search.toLowerCase()))

        if (!matchesSearch) return false

        if (filterStatus === 'contacted') return l.contacted
        if (filterStatus === 'uncontacted') return !l.contacted
        return true
    })

    const handleToggleContacted = async (id: string, current: boolean) => {
        const next = !current
        setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, contacted: next } : l)))
        const res = await togglePromoLeadContacted(id, next)
        if (res.success) {
            showFeedback(next ? 'Lead marqué comme contacté' : 'Lead remis en attente')
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Supprimer ce contact définitivement ?')) return
        setIsDeleting(id)
        const res = await deletePromoLead(id)
        if (res.success) {
            setLeads((prev) => prev.filter((l) => l.id !== id))
            showFeedback('Contact supprimé')
        }
        setIsDeleting(null)
    }

    const exportToExcel = () => {
        if (!leads.length) return

        const headers = ['ID', 'Téléphone', 'Email', 'Code Promo', 'Source', 'Statut Relance', 'Date Récolte']
        const tableRows = leads.map((l) => `
            <tr>
                <td style="mso-number-format:'\\@'; text-align: center;">#${l.id.slice(0, 8)}</td>
                <td style="mso-number-format:'\\@'; font-weight: bold;">${l.phone || '-'}</td>
                <td>${l.email || '-'}</td>
                <td style="text-align: center; font-weight: bold;">${l.promoCode || 'TEKNO10'}</td>
                <td style="text-align: center;">${l.source || 'cart_popup'}</td>
                <td style="text-align: center;">${l.contacted ? 'Contacté' : 'Non contacté'}</td>
                <td style="text-align: center;">${new Date(l.createdAt).toLocaleDateString('fr-FR')}</td>
            </tr>
        `).join('')

        const excelTemplate = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
                table { border-collapse: collapse; width: 100%; }
                th { background-color: #059669; color: #ffffff; font-weight: bold; padding: 10px 8px; border: 1px solid #047857; text-align: center; }
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
        link.setAttribute('href', url)
        link.setAttribute('download', `leads_panier_tekno_${new Date().toISOString().split('T')[0]}.xls`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        showFeedback('Fichier Excel exporté avec succès')
    }

    const formatWhatsAppUrl = (rawPhone: string) => {
        let clean = rawPhone.replace(/[^0-9]/g, '')
        if (clean.startsWith('0')) {
            clean = '212' + clean.substring(1)
        } else if (!clean.startsWith('212') && clean.length === 9) {
            clean = '212' + clean
        }
        const text = encodeURIComponent(
            'Bonjour ! Nous avons remarqué que vous vous intéressez à nos livres sur Tekno Store. Voici votre code promo de -10% : TEKNO10. Avez-vous besoin d\'aide pour finaliser votre commande ?'
        )
        return `https://wa.me/${clean}?text=${text}`
    }

    return (
        <div className="space-y-8">
            {/* Notification flottante */}
            {feedbackMessage && (
                <div className="fixed top-6 right-6 z-50 flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl text-sm font-bold border border-slate-700 animate-fade-in">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>{feedbackMessage}</span>
                </div>
            )}

            {/* Statistiques Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-wider text-gray-400">Total Récoltés</p>
                        <h4 className="text-3xl font-black text-black mt-1">{initialStats.totalAll}</h4>
                    </div>
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-black">
                        <Users className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-wider text-gray-400">Aujourd&apos;hui</p>
                        <h4 className="text-3xl font-black text-emerald-600 mt-1">+{initialStats.todayCount}</h4>
                    </div>
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-black">
                        <Sparkles className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-wider text-gray-400">7 Derniers Jours</p>
                        <h4 className="text-3xl font-black text-blue-600 mt-1">{initialStats.weekCount}</h4>
                    </div>
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-wider text-gray-400">Avec Téléphone</p>
                        <h4 className="text-3xl font-black text-amber-600 mt-1">{initialStats.withPhoneCount}</h4>
                    </div>
                    <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center font-black">
                        <Phone className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Barre de contrôle : Recherche, Filtres & Export */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
                <div className="flex-1 relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Rechercher par numéro, email ou code..."
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 hover:bg-gray-100/70 focus:bg-white rounded-2xl border-none text-sm font-semibold text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500 transition-all"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <div className="inline-flex bg-gray-100 p-1 rounded-2xl text-xs font-black">
                        <button
                            onClick={() => setFilterStatus('all')}
                            className={`px-3 py-2 rounded-xl transition-all ${
                                filterStatus === 'all' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-black'
                            }`}
                        >
                            Tous ({leads.length})
                        </button>
                        <button
                            onClick={() => setFilterStatus('uncontacted')}
                            className={`px-3 py-2 rounded-xl transition-all ${
                                filterStatus === 'uncontacted' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-black'
                            }`}
                        >
                            À relancer ({leads.filter((l) => !l.contacted).length})
                        </button>
                        <button
                            onClick={() => setFilterStatus('contacted')}
                            className={`px-3 py-2 rounded-xl transition-all ${
                                filterStatus === 'contacted' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-black'
                            }`}
                        >
                            Contactés ({leads.filter((l) => l.contacted).length})
                        </button>
                    </div>

                    <button
                        onClick={exportToExcel}
                        className="inline-flex items-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black shadow-sm transition-all shrink-0 cursor-pointer"
                    >
                        <Download className="w-4 h-4" />
                        <span>Exporter Excel</span>
                    </button>
                </div>
            </div>

            {/* Tableau des contacts */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-100 text-[10px] font-black uppercase tracking-wider text-gray-400 bg-gray-50/50">
                                <th className="px-6 py-4">Téléphone</th>
                                <th className="px-6 py-4">Email</th>
                                <th className="px-6 py-4">Code Attribué</th>
                                <th className="px-6 py-4">Date Récolte</th>
                                <th className="px-6 py-4">Statut Relance</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {filteredLeads.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-bold">
                                        Aucun numéro récolté pour le moment
                                    </td>
                                </tr>
                            ) : (
                                filteredLeads.map((lead) => (
                                    <tr key={lead.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            {lead.phone ? (
                                                <div className="flex items-center gap-2 font-black text-gray-900">
                                                    <Phone className="w-4 h-4 text-emerald-600" />
                                                    <span>{lead.phone}</span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-300 font-medium italic">Non renseigné</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {lead.email ? (
                                                <div className="flex items-center gap-2 font-semibold text-gray-700">
                                                    <Mail className="w-4 h-4 text-gray-400" />
                                                    <span>{lead.email}</span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-300 font-medium italic">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono font-black bg-emerald-50 text-emerald-800 border border-emerald-100">
                                                {lead.promoCode || 'TEKNO10'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-bold text-gray-500">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                <span>
                                                    {new Date(lead.createdAt).toLocaleDateString('fr-FR', {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => handleToggleContacted(lead.id, lead.contacted)}
                                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black transition-all ${
                                                    lead.contacted
                                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                                                }`}
                                            >
                                                {lead.contacted ? (
                                                    <>
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                        <span>Contacté</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Clock className="w-3.5 h-3.5" />
                                                        <span>À relancer</span>
                                                    </>
                                                )}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="inline-flex items-center gap-2">
                                                {lead.phone && (
                                                    <a
                                                        href={formatWhatsAppUrl(lead.phone)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] hover:bg-[#20BD5A] text-white rounded-xl text-xs font-black shadow-sm transition-all"
                                                        title="Envoyer un message WhatsApp"
                                                    >
                                                        <MessageCircle className="w-3.5 h-3.5" />
                                                        <span>WhatsApp</span>
                                                    </a>
                                                )}

                                                <button
                                                    onClick={() => handleDelete(lead.id)}
                                                    disabled={isDeleting === lead.id}
                                                    className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                                    title="Supprimer"
                                                >
                                                    <Trash2 className="w-4 h-4" />
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
        </div>
    )
}
