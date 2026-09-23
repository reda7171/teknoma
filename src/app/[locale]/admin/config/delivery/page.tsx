import { verifyAdmin } from '@/lib/actions/auth'
import { getSetting } from '@/lib/actions/site-settings'
import { getShippingCompanies } from '@/lib/actions/shipping-companies'
import { redirect } from 'next/navigation'
import DeliveryConfigForm from './DeliveryConfigForm'
import ShippingCompaniesClient from './ShippingCompaniesClient'
import { Truck, Package } from 'lucide-react'
import TestWithYouConnectionButton from '@/components/admin/TestWithYouConnectionButton'

export const metadata = {
    title: 'Logistique & Livraison | Admin Riwaya',
}

export default async function DeliveryConfigPage() {
    try {
        await verifyAdmin()
    } catch {
        redirect('/login')
    }


    const announcementEnabled = await getSetting('announcement_bar_enabled') || 'false'
    const announcementMessage = await getSetting('announcement_bar_message') || 'Livraison Gratuite partout au Maroc dès 300 درهم d\'achat !'
    const announcementBgColor = await getSetting('announcement_bar_bg_color') || '#000000'
    const announcementTextColor = await getSetting('announcement_bar_text_color') || '#FFFFFF'
    const companies = await getShippingCompanies()
    const defaultCompanyId = await getSetting('DEFAULT_SHIPPING_COMPANY_ID')

    return (
        <div className="space-y-12">
            {/* Header section style Riwaya */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-100">
                <div>
                    <h1 className="text-5xl lg:text-6xl font-black text-black tracking-tighter mb-2 italic">
                        Logistique<span className="text-blue-600">.</span>
                    </h1>
                    <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px]">
                        Configuration de la livraison et des transporteurs
                    </p>
                </div>
                <div>
                    <TestWithYouConnectionButton />
                </div>
            </div>

            <div className="bg-white rounded-[3rem] border border-gray-100 shadow-xl shadow-black/5 p-12">
                <div className="max-w-3xl mx-auto">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-white">
                            <Truck className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-black tracking-tight uppercase">Marketing & Annonces</h2>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 italic">Personnalisation de la bande d'annonce de livraison</p>
                        </div>
                    </div>
                    <DeliveryConfigForm 
                        initialAnnouncementEnabled={announcementEnabled === 'true'}
                        initialAnnouncementMessage={announcementMessage}
                        initialAnnouncementBgColor={announcementBgColor}
                        initialAnnouncementTextColor={announcementTextColor}
                    />
                </div>
            </div>

            <ShippingCompaniesClient initialCompanies={companies} initialDefaultId={defaultCompanyId} />
        </div>
    )
}
