import { getCommunityUser } from '@/lib/actions/community-auth'
import HeaderWithUser from '@/components/HeaderWithUser'
import Footer from '@/components/Footer'
import CheckoutClient from '@/components/checkout/CheckoutClient'
import { getSetting } from '@/lib/actions/site-settings'

export default async function CheckoutPage() {
    const user = await getCommunityUser()
    const minAmount = await getSetting('min_order_amount', '0')
    const feature3For4 = await getSetting('feature_3_for_4', 'false')
    
    const stripeEnabled = await getSetting('payment_stripe_enabled') === 'true'
    const paypalEnabled = await getSetting('payment_paypal_enabled') === 'true'
    const cmiEnabled = await getSetting('payment_cmi_enabled') === 'true'
    const codEnabledStr = await getSetting('payment_cod_enabled')
    const codEnabled = codEnabledStr === 'true' || codEnabledStr === null // Default to true if not set
    const bankTransferEnabled = await getSetting('payment_bank_transfer_enabled') === 'true'
    const bankTransferAccountsRaw = await getSetting('payment_bank_transfer_accounts') || '[]'
    let bankTransferAccounts: { bankName: string; accountName: string; rib: string; logo?: string; qrCode?: string }[] = []
    try { bankTransferAccounts = JSON.parse(bankTransferAccountsRaw) } catch {}

    const userProps = user ? {
        fullName: user.fullName,
        email: user.email,
        image: user.image,
        credits: user.credits,
    } : null

    return (
        <div className="min-h-screen bg-pixio-cream">
            <HeaderWithUser />
            <CheckoutClient 
                user={userProps} 
                minOrderAmount={Number(minAmount)} 
                paymentSettings={{ stripeEnabled, codEnabled, paypalEnabled, cmiEnabled, bankTransferEnabled, bankTransferAccounts }}
                is3For4Active={feature3For4 === 'true'}
            />
            <Footer />
        </div>
    )
}
