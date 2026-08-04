import { getSetting } from '@/lib/actions/site-settings'
import AdsenseConfigForm from './AdSenseConfigForm'

export const metadata = {
    title: 'Configuration Google AdSense | Admin',
}

export default async function AdsenseConfigPage() {
    // Récupérer les paramètres actuels
    const enabledStr = await getSetting('adsense_enabled')
    const enabled = enabledStr === 'true'
    
    const publisherId = await getSetting('adsense_publisher_id') || ''
    const adsTxtContent = await getSetting('adsense_ads_txt') || ''
    const autoAdsEnabledStr = await getSetting('adsense_auto_ads_enabled')
    const autoAdsEnabled = autoAdsEnabledStr === 'true'

    const slotArticleTop = await getSetting('adsense_slot_article_top') || ''
    const slotArticleBottom = await getSetting('adsense_slot_article_bottom') || ''
    const slotSidebar = await getSetting('adsense_slot_sidebar') || ''
    const slotBetweenBooks = await getSetting('adsense_slot_between_books') || ''
    const slotHeader = await getSetting('adsense_slot_header') || ''
    const slotFooter = await getSetting('adsense_slot_footer') || ''
    const slotInFeed = await getSetting('adsense_slot_in_feed') || ''
    const slotMultiplex = await getSetting('adsense_slot_multiplex') || ''

    const initialSettings = {
        enabled,
        publisherId,
        adsTxtContent,
        autoAdsEnabled,
        slotArticleTop,
        slotArticleBottom,
        slotSidebar,
        slotBetweenBooks,
        slotHeader,
        slotFooter,
        slotInFeed,
        slotMultiplex
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Google AdSense</h1>
                    <p className="text-slate-500 mt-1">Configurez l'affichage des bannières publicitaires sur votre plateforme.</p>
                </div>
            </div>

            <AdsenseConfigForm initialSettings={initialSettings} />
        </div>
    )
}
