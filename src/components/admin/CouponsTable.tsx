'use client'

import { deleteCoupon, updateCoupon } from '@/lib/actions/coupons'
import { Trash2, CheckCircle2, XCircle, Pencil, Save, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function CouponsTable({ coupons }: { coupons: any[] }) {
    const router = useRouter()
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editData, setEditData] = useState<any>({})

    const handleDelete = async (id: string) => {
        if (!confirm('Voulez-vous vraiment supprimer ce coupon ?')) return
        const res = await deleteCoupon(id)
        if (res.success) router.refresh()
    }

    const startEdit = (coupon: any) => {
        setEditingId(coupon.id)
        setEditData({ ...coupon })
    }

    const handleSave = async (id: string) => {
        const res = await updateCoupon(id, {
            code: editData.code,
            discount: parseFloat(editData.discount),
            type: editData.type,
            minAmount: editData.minAmount ? parseFloat(editData.minAmount) : null,
            isActive: editData.isActive,
            expiresAt: editData.expiresAt ? new Date(editData.expiresAt).toISOString() : null,
        })
        if (res.success) {
            setEditingId(null)
            router.refresh()
        } else {
            alert(res.error)
        }
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-gray-50/50">
                        <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Code</th>
                        <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Réduction</th>
                        <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Min. Achat</th>
                        <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Statut</th>
                        <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {coupons.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="px-8 py-20 text-center">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center">
                                        <Trash2 className="w-8 h-8 text-gray-200" />
                                    </div>
                                    <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Aucun coupon actif</p>
                                </div>
                            </td>
                        </tr>
                    ) : (
                        coupons.map((coupon) => (
                            <tr key={coupon.id} className="group hover:bg-gray-50/30 transition-colors">
                                {editingId === coupon.id ? (
                                    <>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <input 
                                                value={editData.code} 
                                                onChange={e => setEditData({...editData, code: e.target.value.toUpperCase()})}
                                                className="w-full px-4 py-2 border rounded-xl text-xs font-black uppercase outline-none focus:border-black"
                                            />
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap flex gap-2">
                                            <input 
                                                type="number"
                                                value={editData.discount} 
                                                onChange={e => setEditData({...editData, discount: e.target.value})}
                                                className="w-20 px-4 py-2 border rounded-xl text-xs font-black outline-none focus:border-black"
                                            />
                                            <select aria-label="Champ de sélection" 
                                                value={editData.type}
                                                onChange={e => setEditData({...editData, type: e.target.value})}
                                                className="px-4 py-2 border rounded-xl text-xs font-black outline-none focus:border-black"
                                            >
                                                <option value="PERCENTAGE">%</option>
                                                <option value="FIXED_AMOUNT">درهم</option>
                                            </select>
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <input 
                                                type="number"
                                                value={editData.minAmount || ''} 
                                                onChange={e => setEditData({...editData, minAmount: e.target.value})}
                                                placeholder="Sans min"
                                                className="w-24 px-4 py-2 border rounded-xl text-xs font-black outline-none focus:border-black"
                                            />
                                        </td>
                                        <td className="px-4 py-4 whitespace-nowrap">
                                            <select aria-label="Champ de sélection" 
                                                value={editData.isActive ? '1' : '0'}
                                                onChange={e => setEditData({...editData, isActive: e.target.value === '1'})}
                                                className="px-4 py-2 border rounded-xl text-xs font-black outline-none focus:border-black"
                                            >
                                                <option value="1">Actif</option>
                                                <option value="0">Inactif</option>
                                            </select>
                                        </td>
                                        <td className="px-8 py-4 whitespace-nowrap text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleSave(coupon.id)} className="p-3 bg-green-50 text-green-600 rounded-2xl hover:bg-green-500 hover:text-white transition-all">
                                                    <Save className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => setEditingId(null)} className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:bg-gray-500 hover:text-white transition-all">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </>
                                ) : (
                                    <>
                                        <td className="px-8 py-7 whitespace-nowrap">
                                            <span className="bg-blue-600 text-white px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-100">
                                                {coupon.code}
                                            </span>
                                        </td>
                                        <td className="px-8 py-7 whitespace-nowrap">
                                            <p className="text-lg font-black text-black tracking-tighter">
                                                {coupon.type === 'PERCENTAGE' ? `${coupon.discount}%` : `${coupon.discount} درهم`}
                                            </p>
                                        </td>
                                        <td className="px-8 py-7 whitespace-nowrap">
                                            <p className="text-xs font-bold text-gray-500 uppercase">
                                                {coupon.minAmount ? `${coupon.minAmount} درهم` : 'Sans minimum'}
                                            </p>
                                        </td>
                                        <td className="px-8 py-7 whitespace-nowrap">
                                            {coupon.isActive ? (
                                                <span className="inline-flex items-center gap-2 text-green-600 bg-green-50 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                    <CheckCircle2 className="w-3 h-3" /> Actif
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-2 text-red-600 bg-red-50 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                    <XCircle className="w-3 h-3" /> Inactif
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-8 py-7 whitespace-nowrap text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => startEdit(coupon)}
                                                    className="p-3 bg-blue-50 text-blue-500 rounded-2xl hover:bg-blue-500 hover:text-white transition-all active:scale-90"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(coupon.id)}
                                                    className="p-3 bg-red-50 text-red-400 rounded-2xl hover:bg-red-500 hover:text-white transition-all active:scale-90"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </>
                                )}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    )
}
