import {PET_CONTACT_EMAIL} from '@/lib/pet-content'
import type { Metadata } from "next";
import localFont from "next/font/local";
import "../globals.css";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { isFeatureEnabled, getSetting } from '@/lib/actions/site-settings';
import dynamic from 'next/dynamic'
import Toaster from '@/components/Toaster';
import Script from 'next/script';

const WhatsAppButton = dynamic(() => import('@/components/WhatsAppButton'))
const WhatsAppChannelButton = dynamic(() => import('@/components/WhatsAppChannelButton'))
const ChatBot = dynamic(() => import('@/components/ChatBot'))
const CookieConsent = dynamic(() => import('@/components/CookieConsent'))
const CartPromoLeadPopup = dynamic(() => import('@/components/cart/CartPromoLeadPopup'))
import UtmTracker from '@/components/UtmTracker'
import DeferredMarketingScripts from '@/components/DeferredMarketingScripts'
import AuthModalLoader from '@/components/auth/AuthModalLoader'
import FacebookSDK from '@/components/FacebookSDK'
import { resolveActiveWhatsAppAgent } from '@/lib/whatsapp-presence'


const outfit = localFont({
  src: "../../fonts/Outfit-VariableFont_wght.ttf",
  variable: "--font-outfit",
  display: 'swap',
  preload: true,
});

const tajawal = localFont({
  src: [
    { path: "../../fonts/Tajawal-ExtraLight.ttf", weight: "200" },
    { path: "../../fonts/Tajawal-Light.ttf", weight: "300" },
    { path: "../../fonts/Tajawal-Regular.ttf", weight: "400" },
    { path: "../../fonts/Tajawal-Medium.ttf", weight: "500" },
    { path: "../../fonts/Tajawal-Bold.ttf", weight: "700" },
  ],
  variable: "--font-tajawal",
  display: 'swap',
  preload: false, // Chargé uniquement pour RTL — pas besoin de précharger
});

import { Cairo } from 'next/font/google';

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  variable: "--font-cairo",
  display: 'swap',
  adjustFontFallback: false,
});

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const siteUrl = await getSetting('site_url') || 'https://tekno.ma';

  // Dynamic SEO configurations from database
  const [
    seoTitle,
    seoDescription,
    seoKeywords,
    seoAuthorRaw,
    seoOgImageRaw,
    seoOgWidthRaw,
    seoOgHeightRaw,
    seoOgAlt,
    seoOgTypeRaw,
    seoTwitterHandleRaw,
    seoTwitterCardRaw,
    seoTwitterImageRaw,
    seoRobotsMetaRaw,
    seoFaviconRaw,
    googleVerification,
    bingVerification,
    yandexVerification,
    pinterestVerification,
    t
  ] = await Promise.all([
    getSetting('seo_default_title'),
    getSetting('seo_default_description'),
    getSetting('seo_default_keywords'),
    getSetting('seo_author'),
    getSetting('seo_og_image'),
    getSetting('seo_og_image_width'),
    getSetting('seo_og_image_height'),
    getSetting('seo_og_image_alt'),
    getSetting('seo_og_type'),
    getSetting('seo_twitter_handle'),
    getSetting('seo_twitter_card'),
    getSetting('seo_twitter_image'),
    getSetting('seo_robots_meta'),
    getSetting('seo_favicon_url'),
    getSetting('seo_google_verification'),
    getSetting('seo_bing_verification'),
    getSetting('seo_yandex_verification'),
    getSetting('seo_pinterest_verification'),
    getTranslations({ locale, namespace: 'HomePage.seo' })
  ]);

  const seoAuthor = seoAuthorRaw || 'Tekno Store Team';
  const seoOgImage = seoOgImageRaw || '/og-image.jpg';
  const seoOgWidth = seoOgWidthRaw || '1200';
  const seoOgHeight = seoOgHeightRaw || '630';
  const seoOgType = seoOgTypeRaw || 'website';
  const seoTwitterHandle = seoTwitterHandleRaw || undefined;
  const seoTwitterCard = seoTwitterCardRaw || 'summary_large_image';
  const seoTwitterImage = seoTwitterImageRaw || seoOgImage;
  const seoRobotsMeta = seoRobotsMetaRaw || 'index, follow';
  const seoFavicon = seoFaviconRaw || '/logo.png';

  const title = seoTitle || t('Title') || 'Tekno Store — Smartphones, PC, Mac & Accessoires au Maroc';
  const description = seoDescription || t('Description') || 'Vente de smartphones neufs, PC portables, Mac, tablettes et accessoires high-tech avec livraison rapide et paiement à la livraison au Maroc.';

  const ogLocale = locale === 'ar' ? 'ar_MA' : locale === 'en' ? 'en_MA' : 'fr_MA';

  const canIndex = seoRobotsMeta.includes('index');
  const canFollow = seoRobotsMeta.includes('follow');

  return {
    metadataBase: new URL(siteUrl),
    alternates: {
      types: {
        'application/rss+xml': `${siteUrl}/nouveautes.xml`,
        'application/atom+xml': `${siteUrl}/nouveautes.atom`,
      },
      canonical: `${siteUrl}/${locale}`,
      languages: {
        'fr': `${siteUrl}/fr`,
        'ar': `${siteUrl}/ar`,
        'en': `${siteUrl}/en`,
        'fr-MA': `${siteUrl}/fr`,
        'ar-MA': `${siteUrl}/ar`,
        'en-MA': `${siteUrl}/en`,
        'x-default': `${siteUrl}/fr`, // Le Français est la langue par défaut
      },
    },
    title: {
      template: "%s | Tekno Store",
      default: title,
    },
    description: description,
    keywords: ['Tekno Store', 'smartphone Maroc', 'iPhone Maroc', 'MacBook Maroc', 'PC portable Maroc', 'accessoires high-tech', 'Samsung Maroc'],
    authors: [{ name: seoAuthor, url: siteUrl }],
    creator: "Tekno Store",
    publisher: "Tekno Store",
    applicationName: "Tekno Store",
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    openGraph: {
      title: title,
      description: description,
      url: siteUrl,
      siteName: "Tekno Store",
      locale: ogLocale,
      alternateLocale: ["fr_MA", "ar_MA", "en_MA"].filter(l => l !== ogLocale),
      type: seoOgType as any || "website",
      images: [
        {
          url: seoOgImage,
          width: parseInt(seoOgWidth) || 1200,
          height: parseInt(seoOgHeight) || 630,
          alt: seoOgAlt || title,
        },
      ],
    },
    twitter: {
      card: seoTwitterCard as any || "summary_large_image",
      title: title,
      description: description,
      creator: seoTwitterHandle,
      images: [seoTwitterImage],
    },
    robots: {
      index: canIndex,
      follow: canFollow,
      googleBot: {
        index: canIndex,
        follow: canFollow,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    icons: {
      icon: seoFavicon,
      shortcut: '/favicon-16x16.png',
      apple: '/apple-touch-icon.png',
    },
    manifest: '/site.webmanifest',
    category: 'books',
    verification: {
      google: googleVerification || undefined,
      yandex: yandexVerification || undefined,
      yahoo: undefined,
      other: {
        ...(bingVerification ? { "msvalidate.01": bingVerification } : {}),
        ...(pinterestVerification ? { "p:domain_verify": pinterestVerification } : {}),
      },
    },
  };
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#000000',
};

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const localeConfig: Record<string, { lang: string, dir: string }> = {
    ar: { lang: 'ar', dir: 'rtl' },
    fr: { lang: 'fr', dir: 'ltr' },
    en: { lang: 'en', dir: 'ltr' },
  };

  const { lang, dir } = localeConfig[locale] ?? localeConfig.fr;

  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  const [
    messages,
    isChatBotEnabled,
    isWhatsAppEnabled,
    whatsappPhone,
    instagram,
    facebook,
    twitter,
    linkedin,
    tiktok,
    youtube,
    siteUrlRaw,
    whatsappChannelUrl,
    injectedHeadTags,
    fbPixelIdRaw,
    googleSearchConsoleIdRaw,
    googleSearchConsoleIdFallback,
    googleAnalyticsId,
    adsenseId,
    adsenseEnabled,
    activeWhatsAppAgent
  ] = await Promise.all([
    getMessages(),
    isFeatureEnabled('feature_chatbot', false),
    isFeatureEnabled('feature_whatsapp'),
    getSetting('contact_whatsapp'),
    getSetting('contact_instagram'),
    getSetting('contact_facebook'),
    getSetting('contact_twitter'),
    getSetting('contact_linkedin'),
    getSetting('contact_tiktok'),
    getSetting('contact_youtube'),
    getSetting('site_url'),
    getSetting('social_whatsapp_channel'),
    getSetting('seo_injected_head_tags'),
    getSetting('facebook_pixel_id'),
    getSetting('google_search_console_id'),
    getSetting('seo_google_verification'),
    getSetting('google_analytics_id'),
    getSetting('adsense_publisher_id'),
    getSetting('adsense_enabled'),
    resolveActiveWhatsAppAgent()
  ]);

  const siteUrl = siteUrlRaw || 'https://tekno.ma';
  const fbPixelId = fbPixelIdRaw || process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID;
  const googleSearchConsoleId = googleSearchConsoleIdRaw || googleSearchConsoleIdFallback;

  return (
    <html lang={lang} dir={dir} suppressHydrationWarning={true} translate="no" data-scroll-behavior="smooth">
      <head>

        {/* Google Tag Manager - Chargé après délai pour préserver la performance Lighthouse */}
        {googleSearchConsoleId && (
          <meta name="google-site-verification" content={googleSearchConsoleId} />
        )}
        {injectedHeadTags && (
          <Script
            id="injected-head-tags"
            strategy="beforeInteractive"
            dangerouslySetInnerHTML={{ __html: injectedHeadTags }}
          />
        )}
      </head>
      <body
        className={`${outfit.variable} ${tajawal.variable} ${cairo.variable} ${locale === 'ar' ? 'font-cairo-var' : 'font-sans'} antialiased bg-white`}
        suppressHydrationWarning={true}
      >
        <noscript>
          <style>{`.reveal-hidden { opacity: 1 !important; transform: none !important; }`}</style>
        </noscript>
        {/* Google Tag Manager (noscript) */}
        {/* End Google Tag Manager (noscript) */}
        <UtmTracker />
        <script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify({'@context':'https://schema.org','@type':'ElectronicsStore',name:'Tekno Store',url:siteUrl,description:'Boutique high-tech au Maroc : smartphones neufs, PC portables, Mac et accessoires avec paiement à la livraison COD.',logo:siteUrl+'/logo.png',email:PET_CONTACT_EMAIL}).replace(/</g,'\\u003c')}} />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <div id="site-shell">
            {children}
          </div>
          <Toaster />
          <CookieConsent />
          {isWhatsAppEnabled && (
            <WhatsAppButton
              phone={activeWhatsAppAgent?.phone || whatsappPhone || undefined}
              agentName={activeWhatsAppAgent?.name}
            />
          )}

          {isChatBotEnabled && <ChatBot />}
          <AuthModalLoader />
          <CartPromoLeadPopup />
          <FacebookSDK />
          <DeferredMarketingScripts
            adsenseId={adsenseId || ''}
            adsenseEnabled={adsenseEnabled === 'true'}
            facebookPixelId={fbPixelId}
            googleAnalyticsId={googleAnalyticsId || ''}
          />
        </NextIntlClientProvider>


      </body>
    </html>
  );
}
