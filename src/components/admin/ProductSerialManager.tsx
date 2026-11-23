'use client'

import { useState, useEffect, useTransition } from 'react'
import { 
    Shield, 
    Plus, 
    Trash2, 
    CheckCircle2, 
    AlertCircle, 
    Smartphone, 
    Laptop, 
    Loader2, 
    Barcode, 
    RotateCcw
} from 'lucide-react'
import { 
    getProductSerials, 
    addProductSerials, 
    deleteProductSerial, 
    updateProductSerialStatus 
} from '@/lib/actions/product-serials'

interface ProductSerialManagerProps {
    productId: string
    productTitle: string
    currentStock: number
}

export default function ProductSerialManager({
    productId,
    productTitle,
    currentStock
}: ProductSerialManagerProps) {
    const [serials, setSerials] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [rawInput, setRawInput] = useState('')
    const [isSubmitting, startSubmit] = useTransition()
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

    const loadSerials = async () => {
        try {
            setLoading(true)
            const list = await getProductSerials(productId)
            setSerials(list || [])
        } catch (e) {
            console.error('Erreur chargement numéros de série:', e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadSerials()
    }, [productId])

    const handleAdd = () => {
        if (!rawInput.trim()) return
        setMessage(null)
        startSubmit(async () => {
            const res = await addProductSerials(productId, rawInput)
            if (res.success) {
                setMessage({
                    text: `${res.addedCount} numéro(s) de série / IMEI ajouté(s) avec succès.`,
                    type: 'success'
                })
                setRawInput('')
                await loadSerials()
            } else {
                setMessage({
                    text: res.error || 'Erreur lors de l\'ajout.',
                    type: 'error'
                })
            }
        })
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Supprimer ce numéro de série / IMEI ?')) return
        try {
            await deleteProductSerial(id, productId)
            setSerials(prev => prev.filter(s => s.id !== id))
        } catch (e) {
            console.error('Erreur suppression:', e)
        }
    }

    const handleStatusChange = async (id: string, newStatus: string) => {
        try {
            await updateProductSerialStatus(id, newStatus, undefined, productId)
            setSerials(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s))
        } catch (e) {
            console.error('Erreur statut:', e)
        }
    }

    const availableCount = serials.filter(s => s.status === 'AVAILABLE').length
    const soldCount = serials.filter(s => s.status === 'SOLD').length

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                        <Shield className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                            Suivi Unitaire des Numéros de Série & IMEI
                            <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                                Garantie 12M
                            </span>
                        </h2>
                        <p className="text-xs text-gray-500">
                            Enregistrez les numéros IMEI (smartphones) ou S/N (PC portables/Mac) pour lier chaque unité livrée au bon de garantie.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 text-xs font-bold">
                    <span className="px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg">
                        Disponibles : {availableCount} / {currentStock} en stock
                    </span>
                    <span className="px-3 py-1.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg">
                        Vendus : {soldCount}
                    </span>
                </div>
            </div>

            {/* Saisie rapide */}
            <div className="mt-5 bg-gray-50/70 border border-gray-200 rounded-xl p-4">
                <label className="block text-xs font-black uppercase tracking-wider text-gray-700 mb-2">
                    Ajouter des numéros IMEI ou Série (un par ligne ou séparés par virgule)
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                    <textarea
                        rows={2}
                        value={rawInput}
                        onChange={(e) => setRawInput(e.target.value)}
                        placeholder="Ex: 356938114526841&#10;356938114526842&#10;F2LW80XYZ"
                        className="flex-1 px-4 py-2 text-xs font-mono border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                    />
                    <button
                        type="button"
                        onClick={handleAdd}
                        disabled={isSubmitting || !rawInput.trim()}
                        className="px-5 py-2.5 bg-gray-900 hover:bg-black text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-50 shrink-0"
                    >
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Enregistrer IMEI
                    </button>
                </div>
                {message && (
                    <div className={`mt-3 p-3 rounded-lg text-xs font-bold flex items-center gap-2 ${
                        message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                        {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
                        {message.text}
                    </div>
                )}
            </div>

            {/* Liste des numéros */}
            <div className="mt-5">
                {loading ? (
                    <div className="flex items-center justify-center py-6 text-gray-400 gap-2 text-xs">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Chargement des numéros de série...
                    </div>
                ) : serials.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-gray-200 rounded-xl text-xs text-gray-500">
                        Aucun numéro de série / IMEI individuel enregistré pour ce modèle.
                        <p className="text-[11px] text-gray-400 mt-1">Vous pouvez renseigner un code-barres / IMEI global ci-dessous ou ajouter les exemplaires ci-dessus.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto max-h-72 overflow-y-auto border border-gray-200 rounded-xl">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-black uppercase text-[10px] tracking-wider sticky top-0">
                                <tr>
                                    <th className="py-2.5 px-4">Numéro IMEI / Série</th>
                                    <th className="py-2.5 px-4">Statut</th>
                                    <th className="py-2.5 px-4">Commande</th>
                                    <th className="py-2.5 px-4">Date d'ajout</th>
                                    <th className="py-2.5 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 font-medium">
                                {serials.map((s) => (
                                    <tr key={s.id} className="hover:bg-gray-50/80 transition">
                                        <td className="py-2.5 px-4 font-mono font-bold text-gray-900 flex items-center gap-2">
                                            <Barcode className="w-4 h-4 text-gray-400" />
                                            {s.serialNumber}
                                        </td>
                                        <td className="py-2.5 px-4">
                                            <select
                                                aria-label="Statut du numéro de série"
                                                value={s.status}
                                                onChange={(e) => handleStatusChange(s.id, e.target.value)}
                                                className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border focus:outline-none cursor-pointer ${
                                                    s.status === 'AVAILABLE'
                                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                                        : s.status === 'SOLD'
                                                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                                                            : 'bg-red-50 text-red-800 border-red-200'
                                                }`}
                                            >
                                                <option value="AVAILABLE">En stock (Disponible)</option>
                                                <option value="SOLD">Vendu / Attribué</option>
                                                <option value="DEFECTIVE">Défectueux / SAV</option>
                                            </select>
                                        </td>
                                        <td className="py-2.5 px-4 text-gray-500 font-mono">
                                            {s.orderId ? (
                                                <span className="text-blue-600 font-bold">
                                                    #{s.orderId.slice(0, 8)}
                                                </span>
                                            ) : (
                                                '—'
                                            )}
                                        </td>
                                        <td className="py-2.5 px-4 text-gray-400">
                                            {new Date(s.createdAt).toLocaleDateString('fr-FR')}
                                        </td>
                                        <td className="py-2.5 px-4 text-right">
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(s.id)}
                                                className="p-1 text-gray-400 hover:text-red-600 transition"
                                                title="Supprimer"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
