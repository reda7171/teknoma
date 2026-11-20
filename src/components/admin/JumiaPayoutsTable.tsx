'use client'

import { useState, useEffect } from 'react'
import { ShoppingBag, ChevronDown, ChevronUp, RefreshCw, AlertCircle } from 'lucide-react'
import { fetchPaidPayoutStatements } from '@/lib/actions/jumia'

interface JumiaStatement {
    statementNumber: string
    createdAt: string
    payout: {
        amount: number
        currency: string
    }
    paid: boolean
    paymentReference: string | null
    itemRevenue: number
    feesTotal: number
}

export default function JumiaPayoutsTable() {
    const [statements, setStatements] = useState<JumiaStatement[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [expandedStatement, setExpandedStatement] = useState<string | null>(null)
    const [isCollapsed, setIsCollapsed] = useState(true)

    useEffect(() => {
        loadStatements()
    }, [])

    const loadStatements = async () => {
        setLoading(true)
        setError(null)
        try {
            const result = await fetchPaidPayoutStatements()
            if (result.success) {
                setStatements(result.statements || [])
            } else {
                setError(result.message || "Erreur de chargement")
            }
        } catch (err) {
            setError("Impossible de contacter le serveur")
        } finally {
            setLoading(false)
        }
    }


    return (
        <div className="bg-white rounded-[3rem] border border-gray-100 shadow-xl shadow-black/5 overflow-hidden mt-8">
            <div 
                className="px-10 py-8 border-b border-gray-50 flex flex-col md:flex-row items-center justify-between gap-4 bg-orange-50/50 cursor-pointer select-none"
                onClick={() => setIsCollapsed(!isCollapsed)}
            >
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600">
                        <ShoppingBag className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-black tracking-tight">Factures Jumia Payées</h2>
                        <p className="text-xs text-gray-500 font-medium">Historique des virements Jumia reçus via API</p>
                    </div>
                </div>
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                    {isCollapsed ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronUp className="w-5 h-5 text-gray-400" />}
                </div>
            </div>

            {!isCollapsed && (
                <div className="p-10 space-y-4">
                    {loading && (
                        <div className="flex items-center justify-center py-10">
                            <RefreshCw className="w-6 h-6 animate-spin text-orange-500" />
                            <span className="ml-3 font-bold text-gray-500">Chargement des factures Jumia...</span>
                        </div>
                    )}
                    
                    {!loading && error && (
                        <div className="flex items-center gap-4 text-red-500 p-6 bg-red-50 rounded-2xl">
                            <AlertCircle className="w-6 h-6" />
                            <span className="font-bold">{error}</span>
                        </div>
                    )}

                    {!loading && !error && statements.length === 0 && (
                        <div className="text-center text-gray-500 py-10 font-bold">
                            Aucune facture trouvée.
                        </div>
                    )}

                    {!loading && !error && statements.map(statement => (
                    <div key={statement.statementNumber} className="border border-gray-100 rounded-2xl overflow-hidden transition-all hover:border-orange-200">
                        <div 
                            className="bg-white p-6 flex flex-col md:flex-row items-center justify-between cursor-pointer select-none"
                            onClick={() => setExpandedStatement(expandedStatement === statement.statementNumber ? null : statement.statementNumber)}
                        >
                            <div className="flex items-center gap-4 w-full md:w-auto mb-4 md:mb-0">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-orange-50 text-orange-600">
                                    <ShoppingBag className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">{statement.statementNumber}</h3>
                                    <div className="flex gap-3 text-xs font-bold uppercase tracking-widest text-gray-400 mt-1">
                                        <span>{new Date(statement.createdAt).toLocaleDateString('fr-FR')}</span>
                                        <span>•</span>
                                        <span className="text-emerald-500 flex items-center gap-1">
                                            Payée
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-8">
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Montant Virement</p>
                                    <p className="font-black text-xl text-black">
                                        {statement.payout?.amount?.toFixed(2)} {statement.payout?.currency}
                                    </p>
                                </div>

                                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center shrink-0">
                                    {expandedStatement === statement.statementNumber ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                                </div>
                            </div>
                        </div>

                        {expandedStatement === statement.statementNumber && (
                            <div className="bg-gray-50 p-6 border-t border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-white p-4 rounded-xl border border-gray-200">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Revenus Bruts</p>
                                    <p className="font-bold text-lg">{statement.itemRevenue?.toFixed(2)} {statement.payout?.currency}</p>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-gray-200">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Frais Jumia (Commissions)</p>
                                    <p className="font-bold text-lg text-red-500">{statement.feesTotal?.toFixed(2)} {statement.payout?.currency}</p>
                                </div>
                                <div className="bg-white p-4 rounded-xl border border-gray-200">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Référence Paiement</p>
                                    <p className="font-bold text-sm text-gray-800 break-all">{statement.paymentReference || 'N/A'}</p>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            )}
        </div>
    )
}
