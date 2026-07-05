import { getCommunityUser } from '@/lib/actions/community-auth'
import HeaderWithUser from '@/components/HeaderWithUser'
import Footer from '@/components/Footer'
import CheckoutClient from '@/components/checkout/CheckoutClient'
import { getSetting } from '@/lib/actions/site-settings'

export default async function CheckoutPage() {
    const user = await getCommunityUser()
    const minAmount = await getSetting('min_order_amount', '0')
    
    const stripeEnabled = await getSetting('payment_stripe_enabled') === 'true'
    const paypalEnabled = await getSetting('payment_paypal_enabled') === 'true'
    const cmiEnabled = await getSetting('payment_cmi_enabled') === 'true'
    const codEnabledStr = await getSetting('payment_cod_enabled')
    const codEnabled = codEnabledStr === 'true' || codEnabledStr === null // Default to true if not set

    const userProps = user ? {
        fullName: user.fullName,
        email: user.email,
        image: user.image,
    } : null

    return (
        <div className="min-h-screen bg-pixio-cream">
            <HeaderWithUser />
            <CheckoutClient 
                user={userProps} 
                minOrderAmount={Number(minAmount)} 
                paymentSettings={{ stripeEnabled, codEnabled, paypalEnabled, cmiEnabled }}
            />
            <Footer />
        </div>
    )
}
