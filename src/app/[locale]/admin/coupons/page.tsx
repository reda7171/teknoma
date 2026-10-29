import { getCoupons } from '@/lib/actions/coupons'
import { CouponsClient } from '@/components/admin/CouponsClient'

export const metadata = { title: 'Codes Promo | Admin PetsUnivers' }

export default async function CouponsPage() {
  const result = await getCoupons()

  if (!result.success) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-red-500 font-bold">
        Erreur : {result.error}
      </div>
    )
  }

  return (
    <div className="space-y-10 max-w-6xl mx-auto">
      {/* En-tête */}
      <div className="pb-6 border-b border-gray-100">
        <h1 className="text-5xl lg:text-7xl font-black text-black tracking-tighter mb-2 italic">
          Coupons<span className="text-emerald-500">.</span>
        </h1>
        <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px]">
          Codes promotionnels · Marketing · Affiliation
        </p>
      </div>

      <CouponsClient initialData={result.data || []} stats={result.stats} />
    </div>
  )
}
