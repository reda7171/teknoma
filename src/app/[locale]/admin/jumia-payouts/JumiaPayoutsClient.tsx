"use client"

import { useState, useEffect } from 'react'
import { AlertCircle, RefreshCw, DollarSign, Calendar, ChevronLeft, ChevronRight, CheckCircle2, XCircle } from 'lucide-react'
import { getJumiaPayoutStatements } from '../jumia-orders/actions'

export default function JumiaPayoutsClient() {
    const [statements, setStatements] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    const [page, setPage] = useState(1)
    const size = 50

    const fetchStatements = async (currentPage: number) => {
        setLoading(true)
        setErrorMsg(null)
        try {
            const data = await getJumiaPayoutStatements({ page: currentPage, size })
            if (data && data.statements) {
                setStatements(data.statements)
            } else if (data && Array.isArray(data)) {
                setStatements(data)
            } else {
                setStatements([])
            }
        } catch (e: any) {
            setErrorMsg("Impossible de charger les relevés Jumia")
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchStatements(page)
    }, [page])

    const handleNextPage = () => {
        setPage(p => p + 1)
    }

    const handlePrevPage = () => {
        if (page > 1) setPage(p => p - 1)
    }

    return (
        <div className="space-y-6">
            {errorMsg && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3">
                    <AlertCircle className="w-5 h-5" />
                    {errorMsg}
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date / Période</th>
                                <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Référence</th>
                                <th className="text-center p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                                <th className="text-right p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Montant</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-gray-400">
                                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                                        Chargement des relevés...
                                    </td>
                                </tr>
                            ) : statements.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-gray-500">
                                        Aucun relevé de paiement trouvé.
                                    </td>
                                </tr>
                            ) : (
                                statements.map((stmt: any, i: number) => (
                                    <tr key={stmt.id || stmt.StatementId || stmt.reference || i} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                                                    <Calendar className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900">
                                                        {stmt.createdAt ? new Date(stmt.createdAt).toLocaleDateString('fr-FR') : 'Date Inconnue'}
                                                    </div>
                                                    {stmt.periodStart && stmt.periodEnd && (
                                                        <div className="text-xs text-gray-500 mt-1">
                                                            {new Date(stmt.periodStart).toLocaleDateString('fr-FR')} - {new Date(stmt.periodEnd).toLocaleDateString('fr-FR')}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm text-gray-600 font-medium">
                                            {stmt.reference || stmt.id || stmt.StatementId || 'N/A'}
                                        </td>
                                        <td className="p-4 text-center">
                                            {stmt.paid || stmt.status === 'paid' ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    Payé
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                                                    <RefreshCw className="w-3.5 h-3.5" />
                                                    En attente
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="font-bold text-gray-900 flex items-center justify-end gap-1">
                                                {stmt.payout?.amount ?? stmt.closingBalance ?? stmt.amount ?? '0'} {stmt.payout?.currency ?? stmt.currency ?? 'MAD'}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50">
                    <span className="text-sm text-gray-500">
                        Page {page}
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={handlePrevPage}
                            disabled={page === 1 || loading}
                            className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleNextPage}
                            disabled={statements.length < size || loading}
                            className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
