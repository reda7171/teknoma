import { getSetting } from '@/lib/actions/site-settings'
import { checkAdSenseEligibility } from '@/lib/actions/adsense-checker'
import AdsenseConfigForm from './AdSenseConfigForm'
import AdSenseEligibilityTester from './AdSenseEligibilityTester'

export const metadata = {
    title: 'Configuration Google AdSense | Admin',
}

export default async function AdsenseConfigPage() {
    // Récupérer les paramètres actuels
    const enabledStr = await getSetting('adsense_enabled')
    const enabled = enabledStr === 'true'
    
    const publisherId = await getSetting('adsense_publisher_id') || 'pub-6513929866629555'
    const adsTxtContent = await getSetting('adsense_ads_txt') || 'google.com, pub-6513929866629555, DIRECT, f08c47fec0942fa0'
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

    // Pré-calculer le rapport d'éligibilité pour un affichage SSR instantané
    const initialReport = await checkAdSenseEligibility().catch(() => null)

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
                    <p className="text-slate-500 mt-1">Configurez l'affichage des bannières publicitaires et vérifiez l'éligibilité du site.</p>
                </div>
            </div>

            {/* Testeur d'éligibilité et de conformité AdSense */}
            <AdSenseEligibilityTester initialReport={initialReport} />

            <AdsenseConfigForm initialSettings={initialSettings} />
        </div>
    )
}
