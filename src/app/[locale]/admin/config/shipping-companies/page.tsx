import { verifyAdmin } from '@/lib/actions/auth'
import { getShippingCompanies } from '@/lib/actions/shipping-companies'
import { getSetting } from '@/lib/actions/site-settings'
import { redirect } from 'next/navigation'
import ShippingCompaniesClient from './ShippingCompaniesClient'
import { Truck } from 'lucide-react'

export const metadata = {
    title: 'Sociétés de livraison | Admin Riwaya',
}

export default async function ShippingCompaniesConfigPage() {
    try {
        await verifyAdmin()
    } catch {
        redirect('/login')
    }

    const companies = await getShippingCompanies()
    const defaultCompanyId = await getSetting('DEFAULT_SHIPPING_COMPANY_ID')

    return (
        <div className="space-y-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-100">
                <div>
                    <h1 className="text-5xl lg:text-6xl font-black text-black tracking-tighter mb-2 italic">
                        Livreurs<span className="text-blue-600">.</span>
                    </h1>
                    <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px]">
                        Configuration des sociétés de livraison
                    </p>
                </div>
            </div>

            <ShippingCompaniesClient initialCompanies={companies} initialDefaultId={defaultCompanyId} />
        </div>
    )
}
