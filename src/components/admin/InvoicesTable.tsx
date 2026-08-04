'use client'

import { useState } from 'react'
import { FileText, ChevronDown, ChevronUp, Package } from 'lucide-react'

interface Order {
    id: string
    trackingID: string | null
    fullName: string
    total: number
    shippingCompany: string | null
}

interface Invoice {
    id: string
    title: string
    amount: number
    category: string
    date: Date
    description: string | null
    orders: Order[]
}

export default function InvoicesTable({ invoices }: { invoices: Invoice[] }) {
    const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null)
    const [isCollapsed, setIsCollapsed] = useState(true)

    if (invoices.length === 0) {
        return null;
    }

    return (
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-xl shadow-black/5 overflow-hidden mt-12">
            <div 
                className="px-10 py-8 border-b border-gray-50 flex flex-col md:flex-row items-center justify-between gap-4 bg-gray-50/50 cursor-pointer select-none"
                onClick={() => setIsCollapsed(!isCollapsed)}
            >
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                        <FileText className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-black tracking-tight">Factures Saisies</h2>
                        <p className="text-xs text-gray-500 font-medium">Consultez les factures de livraison et virements Jumia</p>
                    </div>
                </div>
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                    {isCollapsed ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronUp className="w-5 h-5 text-gray-400" />}
                </div>
            </div>

            {!isCollapsed && (
                <div className="p-10 space-y-4">
                    {invoices.map(invoice => (
                    <div key={invoice.id} className="border border-gray-100 rounded-2xl overflow-hidden transition-all hover:border-blue-200">
                        <div 
                            className="bg-white p-6 flex flex-col md:flex-row items-center justify-between cursor-pointer select-none"
                            onClick={() => setExpandedInvoice(expandedInvoice === invoice.id ? null : invoice.id)}
                        >
                            <div className="flex items-center gap-4 w-full md:w-auto mb-4 md:mb-0">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${invoice.category === 'INCOME_JUMIA' ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                    <FileText className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">{invoice.title}</h3>
                                    <div className="flex gap-3 text-xs font-bold uppercase tracking-widest text-gray-400 mt-1">
                                        <span>{new Date(invoice.date).toLocaleDateString('fr-FR')}</span>
                                        <span>•</span>
                                        <span className={invoice.category === 'INCOME_JUMIA' ? 'text-orange-500' : 'text-emerald-500'}>
                                            {invoice.category === 'INCOME_JUMIA' ? 'Jumia' : 'Livraison'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-8">
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Montant</p>
                                    <p className="font-black text-xl text-black">{invoice.amount.toFixed(2)} MAD</p>
                                </div>
                                
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Commandes</p>
                                    <p className="font-black text-lg text-gray-700">{invoice.orders.length}</p>
                                </div>

                                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center shrink-0">
                                    {expandedInvoice === invoice.id ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                                </div>
                            </div>
                        </div>

                        {expandedInvoice === invoice.id && invoice.orders.length > 0 && (
                            <div className="bg-gray-50 p-6 border-t border-gray-100">
                                <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                                    <Package className="w-4 h-4" /> 
                                    Commandes liées à cette facture
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {invoice.orders.map(order => (
                                        <div key={order.id} className="bg-white p-4 border border-gray-200 rounded-xl">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-bold text-sm text-gray-900 truncate pr-2" title={order.fullName}>{order.fullName}</span>
                                                <span className="font-black text-emerald-600 shrink-0">{order.total.toFixed(2)} MAD</span>
                                            </div>
                                            <p className="text-xs text-gray-500">
                                                {order.trackingID || 'Sans numéro'} • {order.shippingCompany || 'Standard'}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {expandedInvoice === invoice.id && invoice.orders.length === 0 && (
                            <div className="bg-gray-50 p-6 border-t border-gray-100 text-center text-gray-500 text-sm font-medium">
                                Aucune commande spécifique liée à cette facture.
                            </div>
                        )}
                    </div>
                ))}
            </div>
            )}
        </div>
    )
}
