import { getActiveMenuBySlug } from '@/lib/actions/menus'
import { getSettingsByCategory } from '@/lib/server/site-settings'
import BlogHeader from './BlogHeader'

export default async function BlogHeaderWithUser() {
    const [menu, featureSettings, generalSettings] = await Promise.all([
        getActiveMenuBySlug('header'),
        getSettingsByCategory('features'),
        getSettingsByCategory('general')
    ])

    const features = {
        seller: featureSettings['feature_seller'] !== 'false',
        exchange: featureSettings['feature_exchange'] !== 'false',
        usb: featureSettings['feature_usb'] !== 'false',
        kids: featureSettings['feature_kids'] !== 'false',
        readingList: featureSettings['feature_reading_list'] !== 'false',
        digital: featureSettings['feature_digital_books'] !== 'false',
        packs: featureSettings['feature_packs'] !== 'false',
        deposerListe: featureSettings['feature_deposer_liste'] !== 'false',
    }

    return (
        <BlogHeader
            navigation={menu?.items}
            features={features}
            siteLogo={generalSettings['site_logo'] || null}
        />
    )
}
