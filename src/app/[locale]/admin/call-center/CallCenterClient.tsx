'use client'

import { useState } from 'react'
import { PhoneCall, Clock, Truck, FileText, Search } from 'lucide-react'
import { useUIStore } from '@/store/ui'
import { incrementFollowUp } from '@/lib/actions/followUp'
import AdminFollowUpChart from '@/components/admin/AdminFollowUpChart'

type OrderType = {
    id: string
    fullName: string
    phone: string
    city: string
    total: number
    status: string
    createdAt: Date
    followUpCount?: number
    lastFollowUp?: Date
}

export default function CallCenterClient({ initialOrders }: { initialOrders: OrderType[] }) {
    const [orders, setOrders] = useState<OrderType[]>(initialOrders)
    const [loadingId, setLoadingId] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())
    const { showNotification } = useUIStore()

    const [bulkQueue, setBulkQueue] = useState<OrderType[]>([])

    const [activeMenuId, setActiveMenuId] = useState<string | null>(null)

    const formatWhatsAppNumber = (phone: string) => {
        let cleaned = phone.replace(/\D/g, '')
        if (cleaned.startsWith('212')) return cleaned
        if (cleaned.startsWith('00212')) return cleaned.substring(2)
        if (cleaned.startsWith('0')) return '212' + cleaned.substring(1)
        return '212' + cleaned
    }

    type TemplateType = 'confirm' | 'review' | 'repurchase' | 'delay' | 'no_answer' | 'shipped' | 'encourage_read' | 'encourage_gift' | 'encourage_promo'

    const getWhatsAppLink = (order: OrderType, template: TemplateType = 'confirm') => {
        const number = formatWhatsAppNumber(order.phone)
        const name = order.fullName.split(' ')[0]
        let text = ''
        
        if (template === 'confirm') {
            text = `Salam ${name}, m3ak Riwaya 👋. Twaselna b l'commande dyalk #${order.id.slice(0, 8)}. Wach n'confirmew m3ak l'adresse bach nsiftoha lik ?`
        } else if (template === 'review') {
            text = `Salam ${name}, m3ak Riwaya 👋. Kif jatak l'commande dyalk ? Ntmna tkon 3jbatk! ila 3jbatk l'khedma dyalna, mkrehnach tkhli lina wahed l'avis sghir. Shokran bzaf!`
        } else if (template === 'repurchase') {
            text = `Salam ${name}, twahachnak f Riwaya! Jbnalkom koutoub jdad o promotions mzyanin. Dkhol l site dyalna riwaya.store tktachef jdid, marhba bik f ay waqt!`
        } else if (template === 'delay') {
            text = `Salam ${name}, m3ak Riwaya 👋. Kants2asfo bzaf 3la t2akhir lli w9a3 f l'commande dyalk. 9rib insha'Allah tkoun 3ndk. Shokran 3la tfahom dyalk!`
        } else if (template === 'no_answer') {
            text = `Salam ${name}, m3ak Riwaya 👋. 3ytna lik 9bila bach n'confirmew l'commande dyalk sa3a majawbtinach. Mli tkoun msali(a) jawbna hna bach nsiftoha lik f a9rab wa9t.`
        } else if (template === 'shipped') {
            text = `Salam ${name}, m3ak Riwaya 👋. L'commande dyalk khrjat lyouma! L'livreur ghadi itassel bik 9rib bach iwselha lik. B saha w raha!`
        } else if (template === 'encourage_read') {
            text = `Salam ${name} 👋, l'9raya hia l'ghida2 dyal l'39al 🧠. Riwaya katmna lik 9raya momti3a! Dima m3ak bach nwfro lik ahsan l'kotob.`
        } else if (template === 'encourage_gift') {
            text = `Salam ${name} 👋! L'ktab howa ahsan cadeau t9dr thdi l chi wahed 3ziz 🎁. Dkhol l riwaya.store o khtar ahsan l'kotob.`
        } else if (template === 'encourage_promo') {
            text = `Salam ${name} 🎉! Riwaya jabt likoum promo zwina! Dkhol l site dyalna bach tstafd mn l'3orod jdida 9bl matsali.`
        }
        
        return `https://wa.me/${number}?text=${encodeURIComponent(text)}`
    }

    const openWhatsApp = async (order: OrderType, template: TemplateType = 'confirm') => {
        window.open(getWhatsAppLink(order, template), '_blank')
        setActiveMenuId(null)
        // Increment counter in DB
        await incrementFollowUp(order.id)
        // Update local state to reflect UI change instantly
        setOrders(prev => prev.map(o => o.id === order.id ? {
            ...o, 
            followUpCount: (o.followUpCount || 0) + 1,
            lastFollowUp: new Date()
        } : o))
    }

    // Close menu when clicking outside
    if (typeof window !== 'undefined') {
        window.onclick = (e: any) => {
            if (!e.target.closest('.wa-menu-container')) {
                setActiveMenuId(null)
            }
        }
    }

    const handleCopyBulkNumbers = () => {
        if (selectedOrders.size === 0) return
        const numbers = Array.from(selectedOrders)
            .map(id => orders.find(o => o.id === id))
            .filter(Boolean)
            .map(o => formatWhatsAppNumber(o!.phone))
            .join(', ')
        
        navigator.clipboard.writeText(numbers)
        showNotification(`${selectedOrders.size} numéros copiés !`, 'success')
    }

    const handleStartBulkWhatsApp = () => {
        if (selectedOrders.size === 0) return
        const selected = Array.from(selectedOrders)
            .map(id => orders.find(o => o.id === id))
            .filter(Boolean) as OrderType[]
        setBulkQueue(selected)
    }

    const sendNextBulkMessage = () => {
        if (bulkQueue.length === 0) return
        window.open(getWhatsAppLink(bulkQueue[0]), '_blank')
        setBulkQueue(prev => prev.slice(1))
    }

    const cancelBulkMessage = () => {
        setBulkQueue([])
    }

    const toggleSelection = (orderId: string) => {
        const newSet = new Set(selectedOrders)
        if (newSet.has(orderId)) newSet.delete(orderId)
        else newSet.add(orderId)
        setSelectedOrders(newSet)
    }

    const toggleAll = () => {
        if (selectedOrders.size === filteredOrders.length) {
            setSelectedOrders(new Set())
        } else {
            setSelectedOrders(new Set(filteredOrders.map(o => o.id)))
        }
    }

    const filteredOrders = orders.filter(o => 
        o.fullName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        o.phone.includes(searchTerm) ||
        o.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.id.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-100">
                <div>
                    <h1 className="text-4xl lg:text-5xl font-black text-black tracking-tighter mb-2 italic flex items-center gap-4">
                        <PhoneCall className="w-10 h-10 text-emerald-500" />
                        Call Center
                    </h1>
                    <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px]">
                        Relance WhatsApp & Confirmation COD
                    </p>
                </div>

                <div className="relative w-full md:w-64">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Rechercher (Nom, Téléphone...)"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-[12px] font-bold focus:outline-none focus:ring-2 focus:ring-black transition-all"
                    />
                </div>
            </div>

            <AdminFollowUpChart orders={orders} />

            {selectedOrders.size > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in">
                    <span className="font-black text-emerald-800 text-sm">
                        {selectedOrders.size} client(s) sélectionné(s)
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                        {bulkQueue.length > 0 ? (
                            <div className="flex items-center gap-2 bg-white/50 p-1 rounded-xl">
                                <span className="text-xs font-bold px-2">{bulkQueue.length} restants</span>
                                <button onClick={sendNextBulkMessage} className="px-4 py-2 bg-[#25D366] text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-[#1DA851] transition-all flex items-center gap-2">
                                    <PhoneCall className="w-3 h-3" /> Envoyer suivant
                                </button>
                                <button onClick={cancelBulkMessage} className="px-4 py-2 bg-red-100 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-red-200 transition-all">
                                    Annuler
                                </button>
                            </div>
                        ) : (
                            <>
                                <button onClick={handleCopyBulkNumbers} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-emerald-700 transition-all">
                                    Copier Contacts (Bulk)
                                </button>
                                <button onClick={handleStartBulkWhatsApp} className="px-4 py-2 bg-[#25D366] text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-[#1DA851] transition-all flex items-center gap-2">
                                    <PhoneCall className="w-3 h-3" /> WhatsApp Bulk
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            <div className="grid gap-4">
                {filteredOrders.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-3xl border border-gray-100">
                        <FileText className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-bold text-sm">Aucune commande en attente.</p>
                    </div>
                ) : (
                    <>
                    <div className="flex items-center px-4 mb-2">
                        <input type="checkbox" checked={selectedOrders.size === filteredOrders.length && filteredOrders.length > 0} onChange={toggleAll} className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer" />
                        <span className="ml-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">Tout sélectionner</span>
                    </div>
                    {filteredOrders.map(order => (
                        <div key={order.id} className={`bg-white p-6 rounded-3xl border ${selectedOrders.has(order.id) ? 'border-emerald-500 shadow-md ring-1 ring-emerald-500' : 'border-gray-100 shadow-sm hover:shadow-md'} flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all`}>
                            <div className="flex items-start gap-4 flex-1">
                                <input type="checkbox" checked={selectedOrders.has(order.id)} onChange={() => toggleSelection(order.id)} className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer mt-1" />
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase ${
                                        order.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'
                                    }`}>
                                        {order.status}
                                    </span>
                                    <span className="text-gray-400 text-xs font-bold font-mono">#{order.id.slice(0, 8)}</span>
                                </div>
                                <h3 className="text-lg font-black text-black">{order.fullName}</h3>
                                <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500 font-medium">
                                    <span className="flex items-center gap-1"><PhoneCall className="w-3 h-3" /> {order.phone}</span>
                                    <span className="flex items-center gap-1"><Truck className="w-3 h-3" /> {order.city}</span>
                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(order.createdAt).toLocaleDateString('fr-FR')}</span>
                                    {order.followUpCount ? (
                                        <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider">
                                            Relancé {order.followUpCount}x
                                        </span>
                                    ) : null}
                                </div>
                                </div>
                            </div>

                            <div className="text-left md:text-right">
                                <p className="text-2xl font-black text-emerald-500 mb-4">{order.total} درهم</p>
                                <div className="flex flex-wrap items-center gap-2 relative wa-menu-container">
                                    <button
                                        onClick={() => setActiveMenuId(activeMenuId === order.id ? null : order.id)}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-[#25D366] text-white rounded-xl hover:bg-[#1DA851] transition-all font-black text-[11px] uppercase tracking-wider"
                                    >
                                        <PhoneCall className="w-4 h-4" /> WhatsApp
                                    </button>

                                    {activeMenuId === order.id && (
                                        <div className="absolute top-full right-0 mt-2 w-64 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden text-left">
                                            <div className="p-2 border-b border-gray-50 bg-gray-50">
                                                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Templates Darija</p>
                                            </div>
                                            <div className="max-h-64 overflow-y-auto">
                                                <button onClick={() => openWhatsApp(order, 'confirm')} className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 flex flex-col gap-1">
                                                    <span className="text-xs font-bold text-gray-900">1. Confirmation</span>
                                                    <span className="text-[10px] text-gray-500 line-clamp-1">Salam {order.fullName.split(' ')[0]}, Wach n'confirmew...</span>
                                                </button>
                                                <button onClick={() => openWhatsApp(order, 'no_answer')} className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 flex flex-col gap-1">
                                                    <span className="text-xs font-bold text-gray-900">2. Pas de réponse</span>
                                                    <span className="text-[10px] text-gray-500 line-clamp-1">3ytna lik 9bila bach n'confirmew...</span>
                                                </button>
                                                <button onClick={() => openWhatsApp(order, 'shipped')} className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 flex flex-col gap-1">
                                                    <span className="text-xs font-bold text-gray-900">3. Expédiée (Livreur)</span>
                                                    <span className="text-[10px] text-gray-500 line-clamp-1">L'commande dyalk khrjat lyouma...</span>
                                                </button>
                                                <button onClick={() => openWhatsApp(order, 'delay')} className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 flex flex-col gap-1">
                                                    <span className="text-xs font-bold text-gray-900">4. Retard d'expédition</span>
                                                    <span className="text-[10px] text-gray-500 line-clamp-1">Kants2asfo bzaf 3la t2akhir...</span>
                                                </button>
                                                <button onClick={() => openWhatsApp(order, 'review')} className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 flex flex-col gap-1">
                                                    <span className="text-xs font-bold text-gray-900">5. Demande d'avis</span>
                                                    <span className="text-[10px] text-gray-500 line-clamp-1">Kif jatak l'commande dyalk...</span>
                                                </button>
                                                <button onClick={() => openWhatsApp(order, 'repurchase')} className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 flex flex-col gap-1">
                                                    <span className="text-xs font-bold text-gray-900">6. Encouragement rachat</span>
                                                    <span className="text-[10px] text-gray-500 line-clamp-1">Jbnalkom koutoub jdad o promos...</span>
                                                </button>
                                                <button onClick={() => openWhatsApp(order, 'encourage_read')} className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 flex flex-col gap-1">
                                                    <span className="text-xs font-bold text-gray-900">7. Motivation Lecture</span>
                                                    <span className="text-[10px] text-gray-500 line-clamp-1">L'9raya hia l'ghida2 dyal l'39al 🧠...</span>
                                                </button>
                                                <button onClick={() => openWhatsApp(order, 'encourage_gift')} className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 flex flex-col gap-1">
                                                    <span className="text-xs font-bold text-gray-900">8. Idée Cadeau</span>
                                                    <span className="text-[10px] text-gray-500 line-clamp-1">L'ktab howa ahsan cadeau 🎁...</span>
                                                </button>
                                                <button onClick={() => openWhatsApp(order, 'encourage_promo')} className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex flex-col gap-1">
                                                    <span className="text-xs font-bold text-gray-900">9. Offre Spéciale</span>
                                                    <span className="text-[10px] text-gray-500 line-clamp-1">Riwaya jabt likoum promo zwina 🎉...</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    </>
                )}
            </div>
        </div>
    )
}
