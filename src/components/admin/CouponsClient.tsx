'use client'

import { useState } from 'react'
import { Plus, Trash2, Tag, Percent, ToggleLeft, ToggleRight, X, Clock } from 'lucide-react'
import { createCoupon, deleteCoupon, toggleCouponStatus, type CouponInput } from '@/lib/actions/coupons'
import { useUIStore } from '@/store/ui'

export function CouponsClient({ initialData, stats }: { initialData: any[], stats: any }) {
  const [coupons, setCoupons] = useState(initialData)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { showNotification } = useUIStore()
  
  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce code promo ?')) return
    const res = await deleteCoupon(id)
    if (res.success) {
      setCoupons(c => c.filter(x => x.id !== id))
      showNotification('Code supprimé', 'success')
    } else {
      showNotification(res.error || 'Erreur', 'error')
    }
  }

  const handleToggle = async (id: string, currentState: boolean) => {
    // Optimistic UI update
    setCoupons(c => c.map(x => x.id === id ? { ...x, isActive: !currentState } : x))
    const res = await toggleCouponStatus(id, !currentState)
    if (!res.success) {
      showNotification(res.error || 'Erreur', 'error')
      setCoupons(c => c.map(x => x.id === id ? { ...x, isActive: currentState } : x))
    }
  }

  return (
    <div className="space-y-8">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-[2rem] p-6 border shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Total Codes</p>
          <p className="text-4xl font-black text-black">{stats.total}</p>
        </div>
        <div className="bg-white rounded-[2rem] p-6 border shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-2">Actifs</p>
          <p className="text-4xl font-black text-emerald-500">{stats.active}</p>
        </div>
        <div className="bg-white rounded-[2rem] p-6 border shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-2">Affiliations</p>
          <p className="text-4xl font-black text-blue-500">{stats.affiliate}</p>
        </div>
      </div>

      {/* Header & Bouton Ajouter */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black">Liste des Coupons</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-900 transition-all active:scale-95 shadow-xl"
        >
          <Plus className="w-4 h-4" /> Ajouter
        </button>
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-[2.5rem] border shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50/50 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
              <tr>
                <th className="px-6 py-5">Code Promo</th>
                <th className="px-6 py-5 text-center">Réduction</th>
                <th className="px-6 py-5 text-center">Minimum</th>
                <th className="px-6 py-5 text-center">Expiration</th>
                <th className="px-6 py-5 text-center">Statut</th>
                <th className="px-6 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {coupons.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-bold text-sm">
                    Aucun code promo créé.
                  </td>
                </tr>
              ) : coupons.map((c) => {
                const isExpired = c.expiresAt && new Date(c.expiresAt) < new Date()
                const isActive = c.isActive && !isExpired
                
                return (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-gray-400" />
                        <span className="font-mono font-black text-lg text-black">{c.code}</span>
                      </div>
                      {c.isAffiliate && <span className="text-[8px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase mt-1 inline-block">Affilié: {c.affiliateName}</span>}
                    </td>
                    <td className="px-6 py-4 text-center font-black text-emerald-600">
                      {c.type === 'PERCENTAGE' ? `-${c.discount}%` : `-${c.discount} درهم`}
                    </td>
                    <td className="px-6 py-4 text-center text-gray-500 font-bold">
                      {c.minAmount ? `${c.minAmount} درهم` : '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {c.expiresAt ? (
                        <span className={`inline-flex items-center gap-1 text-xs font-bold ${isExpired ? 'text-red-500' : 'text-gray-500'}`}>
                          <Clock className="w-3 h-3" />
                          {new Date(c.expiresAt).toLocaleDateString('fr-FR')}
                        </span>
                      ) : <span className="text-gray-400 italic text-xs">Illimité</span>}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => handleToggle(c.id, c.isActive)} className={`transition-colors ${c.isActive ? 'text-emerald-500' : 'text-gray-300'}`}>
                        {c.isActive ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <CreateCouponModal
          onClose={() => setIsModalOpen(false)}
          onSuccess={(newCoupon) => {
            setCoupons([newCoupon, ...coupons])
            setIsModalOpen(false)
            showNotification('Code promo créé !', 'success')
          }}
        />
      )}
    </div>
  )
}

function CreateCouponModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: (c: any) => void }) {
  const { showNotification } = useUIStore()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<CouponInput>({
    code: '',
    type: 'PERCENTAGE',
    discount: 10,
    minAmount: undefined,
    expiresAt: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const res = await createCoupon(form)
    if (res.success) {
      onSuccess({ ...form, id: Math.random().toString(), isActive: true, createdAt: new Date() })
    } else {
      showNotification(res.error || 'Erreur', 'error')
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-[3rem] p-8 w-full max-w-md shadow-2xl relative animate-in fade-in zoom-in duration-200">
        <button aria-label="Fermer" onClick={onClose} className="absolute top-6 right-6 p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors text-gray-500">
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-2xl font-black mb-6 flex items-center gap-2">
          <Percent className="w-6 h-6 text-black" /> Nouveau Coupon
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Code Promo</label>
            <input
              type="text"
              required
              placeholder="ex: SUMMER2026"
              className="w-full mt-1 px-4 py-3 bg-gray-50 border-none rounded-2xl font-black font-mono text-lg uppercase focus:ring-2 focus:ring-black transition-all"
              value={form.code}
              onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Type</label>
              <select aria-label="Champ de sélection"
                className="w-full mt-1 px-4 py-3 bg-gray-50 border-none rounded-2xl font-bold text-sm focus:ring-2 focus:ring-black transition-all"
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value as any })}
              >
                <option value="PERCENTAGE">Pourcentage (%)</option>
                <option value="FIXED_AMOUNT">Montant fixe (درهم)</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Réduction</label>
              <input
                type="number"
                required
                min="1"
                className="w-full mt-1 px-4 py-3 bg-gray-50 border-none rounded-2xl font-bold text-sm focus:ring-2 focus:ring-black transition-all"
                value={form.discount}
                onChange={e => setForm({ ...form, discount: parseFloat(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Minimum d'achat (Optionnel)</label>
            <input
              type="number"
              placeholder="0 درهم"
              className="w-full mt-1 px-4 py-3 bg-gray-50 border-none rounded-2xl font-bold text-sm focus:ring-2 focus:ring-black transition-all"
              value={form.minAmount || ''}
              onChange={e => setForm({ ...form, minAmount: e.target.value ? parseFloat(e.target.value) : undefined })}
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Date d'expiration (Optionnelle)</label>
            <input
              type="date"
              className="w-full mt-1 px-4 py-3 bg-gray-50 border-none rounded-2xl font-bold text-sm focus:ring-2 focus:ring-black transition-all"
              value={form.expiresAt || ''}
              onChange={e => setForm({ ...form, expiresAt: e.target.value })}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !form.code}
            className="w-full mt-6 py-4 bg-black text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-900 transition-all disabled:opacity-50 disabled:active:scale-100 active:scale-95 shadow-xl"
          >
            {loading ? 'Création...' : 'Créer le code promo'}
          </button>
        </form>
      </div>
    </div>
  )
}
