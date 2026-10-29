import { verifyAdmin } from '@/lib/actions/auth'
import { getSetting } from '@/lib/actions/site-settings'
import { redirect } from 'next/navigation'
import POSConfigForm from './POSConfigForm'
import { Monitor } from 'lucide-react'

export const metadata = {
    title: 'Configuration POS | Admin PetsUnivers',
}

export const dynamic = 'force-dynamic'

export default async function POSConfigPage() {
    try {
        await verifyAdmin()
    } catch {
        redirect('/login')
    }

    const posStoreName = await getSetting('pos_store_name') || 'PetsUnivers Store'
    const posStoreAddress = await getSetting('pos_store_address') || ''
    const posStorePhone = await getSetting('pos_store_phone') || ''
    const posReceiptMessage = await getSetting('pos_receipt_message') || 'Merci pour votre visite !'
    const posTaxRate = await getSetting('pos_tax_rate') || '0'
    const posCurrency = await getSetting('pos_currency') || 'درهم'
    const posEnablePrint = await getSetting('pos_enable_print') || 'true'
    const posPrinterType = await getSetting('pos_printer_type') || 'bluetooth'
    const posDefaultDiscount = await getSetting('pos_default_discount') || '0'
    const posMaxDiscount = await getSetting('pos_max_discount') || '100'
    const posFavoriteCategories = await getSetting('pos_favorite_categories') || ''
    const posShowCategories = await getSetting('pos_show_categories') || 'true'
    const posShowSearch = await getSetting('pos_show_search') || 'true'
    const posDefaultGridCols = await getSetting('pos_default_grid_cols') || '8'
    const posDefaultTab = await getSetting('pos_default_tab') || 'ALL'
    const posAllowOutOfStock = await getSetting('pos_allow_out_of_stock') || 'false'
    const posRequireCustomer = await getSetting('pos_require_customer') || 'true'
    const posEnableSessions = await getSetting('pos_enable_sessions') || 'false'

    return (
        <div className="space-y-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-100">
                <div>
                    <h1 className="text-5xl lg:text-6xl font-black text-black tracking-tighter mb-2 italic">
                        Point de Vente<span className="text-blue-600">.</span>
                    </h1>
                    <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-[10px]">
                        Configuration du POS & Tickets de caisse
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-[3rem] border border-gray-100 shadow-xl shadow-black/5 p-12">
                <div className="max-w-3xl mx-auto">
                    <div className="flex items-center gap-4 mb-10">
                        <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-white">
                            <Monitor className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-black tracking-tight uppercase">Paramètres POS</h2>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 italic">Informations de la boutique pour les reçus</p>
                        </div>
                    </div>
                    <POSConfigForm
                        initialStoreName={posStoreName}
                        initialStoreAddress={posStoreAddress}
                        initialStorePhone={posStorePhone}
                        initialReceiptMessage={posReceiptMessage}
                        initialTaxRate={posTaxRate}
                        initialCurrency={posCurrency}
                        initialEnablePrint={posEnablePrint}
                        initialPrinterType={posPrinterType}
                        initialDefaultDiscount={posDefaultDiscount}
                        initialMaxDiscount={posMaxDiscount}
                        initialFavoriteCategories={posFavoriteCategories}
                        initialShowCategories={posShowCategories}
                        initialShowSearch={posShowSearch}
                        initialDefaultGridCols={posDefaultGridCols}
                        initialDefaultTab={posDefaultTab}
                        initialAllowOutOfStock={posAllowOutOfStock}
                        initialRequireCustomer={posRequireCustomer}
                        initialEnableSessions={posEnableSessions}
                    />
                </div>
            </div>
        </div>
    )
}
