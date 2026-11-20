import {getLocale} from 'next-intl/server'
import PetHelpBanner from '@/components/pets/PetHelpBanner'
import Header from '@/components/HeaderWithUser'
import Footer from '@/components/Footer'
import CartClient from '@/components/cart/CartClient'
import { getSetting } from '@/lib/actions/site-settings'


import { Metadata } from 'next'

export const metadata: Metadata = {
    robots: {
        index: false,
        follow: false,
    },
}

export default async function CartPage() {
    const locale = await getLocale()
    const minAmount = await getSetting('min_order_amount', '0')
    const feature3For4 = await getSetting('feature_3_for_4', 'false')


    return (
        <div className="min-h-screen bg-[#fffdf8] text-[#17351d]">
            <Header />

            <main id="main-content" className="pets-store"><CartClient
                minOrderAmount={Number(minAmount)}

                is3For4Active={feature3For4 === 'true'}
            />

            </main><PetHelpBanner locale={locale}/><Footer />
        </div>
    )
}
