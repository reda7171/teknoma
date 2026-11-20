import { getSetting } from '@/lib/actions/site-settings'
import PaymentMethodsForm from './PaymentMethodsForm'

export const metadata = {
  title: 'Modes de Paiement | Admin PetsUnivers',
}

export default async function PaymentMethodsPage() {
  const codEnabled = await getSetting('payment_cod_enabled') === 'true'

  const paypalEnabled = await getSetting('payment_paypal_enabled') === 'true'
  const paypalClientId = await getSetting('payment_paypal_client_id') || ''
  const paypalClientSecret = await getSetting('payment_paypal_client_secret') || ''
  const paypalMode = await getSetting('payment_paypal_mode') || 'sandbox'

  const stripeEnabled = await getSetting('payment_stripe_enabled') === 'true'
  const stripePublicKey = await getSetting('payment_stripe_public_key') || ''
  const stripeSecretKey = await getSetting('payment_stripe_secret_key') || ''

  const cmiEnabled = await getSetting('payment_cmi_enabled') === 'true'
  const cmiClientId = await getSetting('payment_cmi_client_id') || ''
  const cmiStoreKey = await getSetting('payment_cmi_store_key') || ''
  const cmiMode = await getSetting('payment_cmi_mode') || 'test'

  const bankTransferEnabled = await getSetting('payment_bank_transfer_enabled') === 'true'
  const bankTransferAccounts = await getSetting('payment_bank_transfer_accounts') || '[]'

  const initialSettings = {
      codEnabled,
      paypalEnabled,
      paypalClientId,
      paypalClientSecret,
      paypalMode,
      stripeEnabled,
      stripePublicKey,
      stripeSecretKey,
      cmiEnabled,
      cmiClientId,
      cmiStoreKey,
      cmiMode,
      bankTransferEnabled,
      bankTransferAccounts
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-100">
        <div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-black tracking-tighter mb-2 italic">
            Paiements<span className="text-amber-500">.</span>
          </h1>
          <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[9px] md:text-[10px]">
            Configuration des modes de paiement disponibles
          </p>
        </div>
      </div>

      <PaymentMethodsForm initialSettings={initialSettings} />
    </div>
  );
}
