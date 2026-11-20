'use client'

import { useState } from 'react'
import { archiveCurrentPeriod } from '@/lib/actions/finance'
import { Archive, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ArchivePeriodButton({ 
    stats 
}: { 
    stats: { netProfit: number, revenue: number, expenses: number, shareReda: number, shareAmine: number, ordersCount: number } 
}) {
    const [isOpen, setIsOpen] = useState(false)
    const [periodName, setPeriodName] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const handleArchive = async () => {
        if (!periodName.trim()) return alert("Veuillez donner un nom à la période (ex: Août 2026)")
        
        setIsLoading(true)
        const res = await archiveCurrentPeriod({
            name: periodName,
            ...stats
        })
        
        if (res.success) {
            setIsOpen(false)
            setPeriodName('')
            router.refresh()
        } else {
            alert("Erreur lors de l'archivage")
        }
        setIsLoading(false)
    }

    return (
        <>
            <button 
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
            >
                <Archive className="w-4 h-4" />
                Clôturer la Période
            </button>

            {isOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
                        <h3 className="text-2xl font-black mb-2 text-black">Clôturer le calcul</h3>
                        <p className="text-gray-500 text-sm mb-6">
                            Cette action figera {stats.ordersCount} commandes livrées actuelles et toutes les dépenses en cours. Le compteur repartira à zéro.
                        </p>
                        
                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                    Nom de la période
                                </label>
                                <input 
                                    type="text" 
                                    value={periodName}
                                    onChange={(e) => setPeriodName(e.target.value)}
                                    placeholder="Ex: Semaine 1 Août, ou Juillet 2026..."
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-black font-medium focus:outline-none focus:ring-2 focus:ring-black"
                                />
                            </div>
                            
                            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                                <p className="text-emerald-800 text-sm font-medium">Bénéfice Net : <span className="font-black">{stats.netProfit.toFixed(2)} درهم</span></p>
                                <p className="text-emerald-800 text-sm font-medium">Part chacun : <span className="font-black">{stats.shareReda.toFixed(2)} درهم</span></p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button 
                                onClick={() => setIsOpen(false)}
                                disabled={isLoading}
                                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-black rounded-xl font-bold transition-all disabled:opacity-50"
                            >
                                Annuler
                            </button>
                            <button 
                                onClick={handleArchive}
                                disabled={isLoading}
                                className="flex-1 px-4 py-3 bg-black hover:bg-gray-900 text-white rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Archiver'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
