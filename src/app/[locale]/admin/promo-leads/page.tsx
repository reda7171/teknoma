import { getPromoLeads } from '@/lib/actions/promo-leads'
import { PromoLeadsClient } from '@/components/admin/PromoLeadsClient'

export const metadata = { title: 'Leads Paniers & Promos | Admin Tekno Store' }

export default async function PromoLeadsPage() {
  const result = await getPromoLeads({ page: 1, limit: 100 })

  return (
    <div className="space-y-10 max-w-7xl mx-auto">
      {/* En-tête */}
      <div className="pb-6 border-b border-gray-100 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl lg:text-6xl font-black text-black tracking-tighter mb-2 italic">
            Leads Panier<span className="text-emerald-500">.</span>
          </h1>
          <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px]">
            Numéros & Emails récoltés · Codes Promo · Relance WhatsApp
          </p>
        </div>
      </div>

      <PromoLeadsClient
        initialLeads={result.leads || []}
        initialStats={result.stats || { totalAll: 0, todayCount: 0, weekCount: 0, withPhoneCount: 0 }}
      />
    </div>
  )
}
