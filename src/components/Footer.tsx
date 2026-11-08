// Server Component — lit les features et les passe au Footer client
import { getSetting, isFeatureEnabled } from '@/lib/server/site-settings'
import FooterClient from './FooterClient'

export default async function Footer() {
    const [
        featureSeller,
        featureExchange,
        featureUsb,
        featureKids,
        featureReadingList,
        siteLogo,
        instagram,
        facebook,
        linkedin,
        twitter,
        youtube,
        threads,
        pinterest,
        stripe,
        paypal,
        cmi,
        cod,
        bank,
        developer_name,
        developer_link
    ] = await Promise.all([
        isFeatureEnabled('feature_seller', true),
        isFeatureEnabled('feature_exchange', true),
        isFeatureEnabled('feature_usb_key'),
        isFeatureEnabled('feature_kids'),
        isFeatureEnabled('feature_reading_list'),
        getSetting('site_logo'),
        getSetting('social_instagram'),
        getSetting('social_facebook'),
        getSetting('social_linkedin'),
        getSetting('social_twitter'),
        getSetting('social_youtube'),
        getSetting('social_threads'),
        getSetting('social_pinterest'),
        getSetting('payment_stripe_enabled'),
        getSetting('payment_paypal_enabled'),
        getSetting('payment_cmi_enabled'),
        getSetting('payment_cod_enabled'),
        getSetting('payment_bank_transfer_enabled'),
        getSetting('developer_name'),
        getSetting('developer_link')
    ])

    const features = {
        seller: featureSeller,
        exchange: featureExchange,
        usb: featureUsb,
        kids: featureKids,
        readingList: featureReadingList,
    }

    const socials = {
        instagram,
        facebook,
        linkedin,
        twitter,
        youtube,
        threads,
        pinterest,
    }

    const paymentSettings = {
        stripe: stripe === 'true',
        paypal: paypal === 'true',
        cmi: cmi === 'true',
        cod: cod === 'true' || cod === null, // Default to true if not set
        bank: bank === 'true',
    }

    const developer = {
        name: developer_name || 'itsmereda1',
        link: developer_link || 'https://instagram.com/itsmereda1',
    }

    return <FooterClient features={features} siteLogo={siteLogo} socials={socials} paymentSettings={paymentSettings} developer={developer} />
}
