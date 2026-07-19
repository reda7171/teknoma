import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "../globals.css";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { isFeatureEnabled, getSetting } from '@/lib/actions/site-settings';
import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import Toaster from '@/components/Toaster';
import Script from 'next/script';

const WhatsAppButton = dynamic(() => import('@/components/WhatsAppButton'))
const WhatsAppChannelButton = dynamic(() => import('@/components/WhatsAppChannelButton'))
const ChatBot = dynamic(() => import('@/components/ChatBot'))
const PixelTracker = dynamic(() => import('@/components/PixelTracker'))
const FacebookPixel = dynamic(() => import('@/components/FacebookPixel'))
const GoogleAnalytics = dynamic(() => import('@/components/GoogleAnalytics'))
const AdSense = dynamic(() => import('@/components/AdSense'))
const CookieConsent = dynamic(() => import('@/components/CookieConsent'))
const UtmTracker = dynamic(() => import('@/components/UtmTracker'))
import DelayedScripts from '@/components/DelayedScripts'


const outfit = Outfit({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-outfit",
});

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const siteUrl = await getSetting('site_url') || 'https://riwaya.store';
  
  // Dynamic SEO configurations from database
  const seoTitle = await getSetting('seo_default_title');
  const seoDescription = await getSetting('seo_default_description');
  const seoKeywords = await getSetting('seo_default_keywords');
  const seoAuthor = await getSetting('seo_author') || 'Riwaya Team';
  const seoOgImage = await getSetting('seo_og_image') || '/og-image.jpg';
  const seoOgWidth = await getSetting('seo_og_image_width') || '1200';
  const seoOgHeight = await getSetting('seo_og_image_height') || '630';
  const seoOgAlt = await getSetting('seo_og_image_alt');
  const seoOgType = await getSetting('seo_og_type') || 'website';
  const seoTwitterHandle = await getSetting('seo_twitter_handle') || '@riwaya_ma';
  const seoTwitterCard = await getSetting('seo_twitter_card') || 'summary_large_image';
  const seoTwitterImage = await getSetting('seo_twitter_image') || seoOgImage;
  const seoRobotsMeta = await getSetting('seo_robots_meta') || 'index, follow';
  const seoFavicon = await getSetting('seo_favicon_url') || '/favicon.ico';
  const googleVerification = await getSetting('seo_google_verification');
  const bingVerification = await getSetting('seo_bing_verification');
  const yandexVerification = await getSetting('seo_yandex_verification');
  const pinterestVerification = await getSetting('seo_pinterest_verification');

  const t = await getTranslations({ locale, namespace: 'HomePage.seo' });

  const title = seoTitle || t('Title') || "Riwaya: 1ère Librairie en ligne à Casablanca, Rabat & au Maroc";
  const description = seoDescription || t('Description') || "Votre librairie en ligne n°1 au Maroc ! Livraison rapide à Casablanca, Rabat & partout au Maroc. Commandez vos livres au meilleur prix : romans, English books, mangas, scolaire et fournitures.";

  const keywordsFr = [
    "meilleure librairie en ligne au maroc", "meilleure librairie", "a7san librairie en ligne f maghrib", "a7san maktaba",
    "livres maroc", "librairie en ligne maroc", "achat livres maroc", "riwaya",
    "librairie casablanca", "librairie rabat", "librairie marrakech", "librairie tanger", "librairie agadir", "librairie fès", "librairie meknes",
    "développement personnel maroc", "livres business maroc", "philosophie maroc",
    "romans maroc", "packs de livres", "échange de livres maroc", "livraison livres maroc",
    "paiement à la livraison", "COD maroc", "livraison gratuite livres",
    "fournitures scolaires", "cartables", "beaux-arts", "english books in morocco", 
    "booktok maroc", "mangaka", "bd maroc", "nouveautés livres maroc", 
    "rentrée scolaire maroc", "livres pour enfant",
    "trousses", "cahiers", "fournitures de bureau", "littérature française", "littérature arabe",
    "psychologie", "livres islamiques", "coran", "livres de cuisine", "thriller", "polar",
    "acheter des livres pas cher maroc", "meilleur site pour acheter des livres maroc", "librairie papeterie maroc",
    "promotion livres maroc", "livres originaux maroc", "livres en anglais casablanca",
    "riwaya", "books", "library", "libriry", "livre", "kotob", "ktoba", "ktoba darija", "chri ktoba maroc", "ktoba rkhas",
    "riwaya.store", "riwaya store", "ktouba", "ktouba darija", "chri ktouba", "livres en darija", "koutoub", 
    "mktaba", "mktaba online", "maktaba en ligne", "ktabi", "chri ktabi", "qra ktab", "qra ktoba", 
    "book store maroc", "librairie en ligne darija", "livres occasion maroc", "echange ktoba"
  ];

  const keywordsAr = [
    "أحسن مكتبة إلكترونية في المغرب", "أفضل مكتبة أونلاين في المغرب", "أحسن مكتبة في المغرب", "مكتبة رواية",
    "a7san librairie en ligne f maghrib", "a7san maktaba", "meilleure librairie en ligne au maroc",
    "كتب المغرب", "مكتبة على الانترنت المغرب", "شراء كتب المغرب", "رواية",
    "مكتبة الدار البيضاء", "مكتبة الرباط", "مكتبة مراكش", "مكتبة طنجة", "مكتبة أكادير", "مكتبة فاس", "مكتبة مكناس",
    "تطوير الذات", "كتب أعمال", "فلسفة", "روايات", "باقات كتب",
    "تبادل الكتب المغرب", "توصيل الكتب", "الدفع عند الاستلام", "توصيل مجاني",
    "أدوات مدرسية", "كتب إنجليزية", "كتب أطفال", "مانغا", "أفضل الكتب العربية", 
    "الدخول المدرسي", "محافظ مدرسية", "روايات عربية",
    "مقلمات", "أقلام", "دفاتر", "أدوات مكتبية", "أدب عربي", "علم النفس",
    "كتب إسلامية", "قرآن كريم", "كتب الطبخ", "روايات بوليسية",
    "شراء كتب رخيصة في المغرب", "أفضل موقع لشراء الكتب في المغرب", "مكتبة قرطاسية المغرب",
    "تخفيضات الكتب المغرب", "كتب أصلية المغرب", "كتب بالإنجليزية الدار البيضاء",
    "riwaya", "books", "library", "libriry", "livre", "kotob", "ktoba", "ktoba darija", "كتب دارجة", "شري كتوبا", "رواية ستور",
    "كتوبا", "كتوبا دارجة", "شري كتوبا", "كتب بالدارجة", "مكتبة أونلاين", "مكتبتي", "شري كتابي", 
    "قرا كتاب", "قرا كتوبا", "تبادل الكتوبا", "كتب مستعملة المغرب", "كتوبا رخاص", "مكتبة دارجة"
  ];

  const keywordsEn = [
    "best online bookstore in morocco", "bookstore morocco", "buy books online morocco", "riwaya store",
    "english books in morocco", "bookstore casablanca", "bookstore rabat", "bookstore marrakech",
    "bookstore tangier", "bookstore agadir", "bookstore fes", "bookstore meknes", "online bookshop morocco",
    "buy english books casablanca", "novels morocco", "self development books morocco", "self help books morocco",
    "business books morocco", "booktok morocco", "manga morocco", "buy manga online morocco", "children books morocco",
    "school supplies morocco", "backpacks morocco", "buy cheap books morocco", "cheap english books morocco",
    "cash on delivery books morocco", "free delivery books morocco", "discount books morocco", "original books morocco",
    "islamic books english morocco", "quran english translation morocco", "islamic literature in english",
    "cookbooks", "thriller", "psychology books", "fantasy books morocco", "sci-fi books morocco", "classic literature morocco",
    "stationery morocco", "office supplies morocco", "notebooks morocco", "calculators morocco", "pens and pencils morocco", 
    "back to school morocco", "bestselling books morocco",
    "riwaya", "books", "library", "libriry", "livre", "kotob", "ktoba", "ktoba darija",
    "ktoba morocco", "moroccan bookstore", "buy ktoba online", "riwaya books", "darija books", 
    "books in darija", "moroccan literature", "morocco library", "ktouba shop"
  ];

  const baseKeywords = locale === 'ar' ? keywordsAr : (locale === 'en' ? keywordsEn : keywordsFr);
  const keywords = seoKeywords ? seoKeywords.split(',').map(k => k.trim()) : baseKeywords;
  const ogLocale = locale === 'ar' ? 'ar_MA' : locale === 'en' ? 'en_MA' : 'fr_MA';

  const canIndex = seoRobotsMeta.includes('index');
  const canFollow = seoRobotsMeta.includes('follow');

  return {
    metadataBase: new URL(siteUrl),
    title: {
      template: "%s | Riwaya",
      default: title,
    },
    description: description,
    keywords: keywords,
    authors: [{ name: seoAuthor, url: siteUrl }],
    creator: "Riwaya",
    publisher: "Riwaya",
    applicationName: "Riwaya",
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    openGraph: {
      title: title,
      description: description,
      url: siteUrl,
      siteName: "Riwaya",
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
    },
  };
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
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

  const { lang, dir } = localeConfig[locale] ?? localeConfig.ar;

  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  const messages = await getMessages();
  const isChatBotEnabled = await isFeatureEnabled('feature_chatbot');
  const isWhatsAppEnabled = await isFeatureEnabled('feature_whatsapp');
  const whatsappPhone = await getSetting('contact_whatsapp');
  const instagram = await getSetting('contact_instagram');
  const facebook = await getSetting('contact_facebook');
  const twitter = await getSetting('contact_twitter');
  const linkedin = await getSetting('contact_linkedin');
  const tiktok = await getSetting('contact_tiktok');
  const youtube = await getSetting('contact_youtube');
  const siteUrl = await getSetting('site_url') || 'https://riwaya.store';
  const whatsappChannelUrl = await getSetting('social_whatsapp_channel');
  const injectedHeadTags = await getSetting('seo_injected_head_tags');
  const fbPixelId = await getSetting('facebook_pixel_id') || process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID;
  const googleSearchConsoleId = await getSetting('google_search_console_id') || await getSetting('seo_google_verification');
  const googleAnalyticsId = await getSetting('google_analytics_id');
  const adsenseId = await getSetting('adsense_publisher_id');
  const adsenseEnabled = await getSetting('adsense_enabled');

  return (
    <html lang={lang} dir={dir} suppressHydrationWarning>
      <head>
        {/* Google Tag Manager - Chargé après délai pour préserver la performance Lighthouse */}
        <Script
          id="gtm-script"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `setTimeout(function(){
(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-MSD75KHT');
}, 3500);`
          }}
        />
        {/* End Google Tag Manager */}
        <AdSense publisherId={adsenseId || ''} isEnabled={adsenseEnabled === 'true'} />
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
        className={`${outfit.className} font-sans antialiased bg-white`}
        suppressHydrationWarning
      >
        {/* Google Tag Manager (noscript) */}
        <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-MSD75KHT"
          height="0" width="0" style={{ display: 'none', visibility: 'hidden' }}></iframe></noscript>
        {/* End Google Tag Manager (noscript) */}
        <UtmTracker />
        <script
          id="schema-website"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              url: siteUrl,
              name: 'Riwaya',
              description: 'Riwaya est la meilleure librairie en ligne au Maroc (a7san librairie en ligne f maghrib). Nous offrons la plus grande sélection de romans, de livres de développement personnel, et d\'affaires avec livraison (COD) partout au Maroc comme Casablanca et Rabat. مكتبة رواية هي أحسن وأفضل مكتبة إلكترونية في المغرب.',
              potentialAction: {
                '@type': 'SearchAction',
                target: {
                  '@type': 'EntryPoint',
                  urlTemplate: `${siteUrl}/fr/books?search={search_term_string}`
                },
                'query-input': 'required name=search_term_string'
              },
              hasPart: [
                { '@type': 'SiteNavigationElement', name: 'Livres', url: `${siteUrl}/${locale}/books` },
                { '@type': 'SiteNavigationElement', name: 'Packs de Livres', url: `${siteUrl}/${locale}/packs` },
                { '@type': 'SiteNavigationElement', name: 'Blog', url: `${siteUrl}/${locale}/blog` },
                { '@type': 'SiteNavigationElement', name: 'Contact', url: `${siteUrl}/${locale}/contact` },
                { '@type': 'SiteNavigationElement', name: 'FAQ', url: `${siteUrl}/${locale}/faq` }
              ]
            })
          }}
        ></script>
        <script
          id="schema-org"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'BookStore',
              name: 'Librairie Riwaya',
              alternateName: ['Riwaya', 'رواية', 'مكتبة رواية'],
              image: `${siteUrl}/og-image.jpg`,
              telephone: whatsappPhone || '+212 702-220575',
              priceRange: '50 MAD - 500 MAD',
              description: 'Riwaya est la meilleure librairie en ligne au Maroc (a7san librairie en ligne f maghrib). Nous offrons la plus grande sélection de romans, de livres de développement personnel, et d\'affaires avec livraison (COD) partout au Maroc comme Casablanca et Rabat. مكتبة رواية هي أحسن وأفضل مكتبة إلكترونية في المغرب.',
              url: siteUrl,
              logo: { '@type': 'ImageObject', url: `${siteUrl}/logo.png`, width: 200, height: 60 },
              // knowsAbout : signale les sujets que les moteurs de réponse doivent associer à Riwaya
              knowsAbout: [
                'Livres', 'Librairie en ligne', 'Développement personnel', 'Romans', 'Business',
                'Philosophie', 'Livraison au Maroc', 'Cash on Delivery', 'Échange de livres',
                'كتب', 'مكتبة إلكترونية', 'تطوير الذات', 'روايات', 'المغرب'
              ],
              // Catalogue de produits
              hasOfferCatalog: {
                '@type': 'OfferCatalog',
                name: 'Catalogue Riwaya',
                itemListElement: [
                  { '@type': 'Offer', itemOffered: { '@type': 'Book', name: 'Livres individuels' } },
                  { '@type': 'Offer', itemOffered: { '@type': 'Product', name: 'Packs de livres' } }
                ]
              },
              paymentAccepted: 'Cash',
              currenciesAccepted: 'MAD',
              openingHours: 'Mo-Su 08:00-22:00',
              sameAs: [
                facebook || 'https://facebook.com/riwaya.book',
                instagram || 'https://instagram.com/riwaya.book',
                twitter || 'https://twitter.com/riwaya',
                linkedin || 'https://linkedin.com/company/riwaya',
                tiktok || 'https://tiktok.com/@riwaya',
                youtube || 'https://youtube.com/@riwaya'
              ].filter(Boolean),
              contactPoint: {
                '@type': 'ContactPoint',
                telephone: whatsappPhone || '+212 702-220575',
                contactType: 'customer service',
                areaServed: 'MA',
                availableLanguage: ['en', 'fr', 'ar']
              },
              address: {
                '@type': 'PostalAddress',
                streetAddress: 'Rabat',
                addressLocality: 'Rabat',
                addressRegion: 'Rabat-Salé-Kénitra',
                postalCode: '10000',
                addressCountry: 'MA'
              },
              geo: {
                '@type': 'GeoCoordinates',
                latitude: 34.0151156,
                longitude: -6.8506771
              },
              hasMap: 'https://www.google.com/maps/place/Riwaya/@34.0151156,-6.8506771,17z/data=!3m1!4b1!4m6!3m5!1s0xda76d9be04b2cdb:0xb283e75db60f9d37!8m2!3d34.0151156!4d-6.8506771!16s%2Fg%2F11ywgnhfxt'
            })
          }}
        ></script>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
          <Toaster />
          <CookieConsent />
          {isWhatsAppEnabled && <WhatsAppButton phone={whatsappPhone || undefined} />}
          <WhatsAppChannelButton url={whatsappChannelUrl || undefined} />
          {isChatBotEnabled && <ChatBot />}
          <DelayedScripts>
            <Suspense fallback={null}>
              <PixelTracker />
              <FacebookPixel pixelId={fbPixelId} />
              <GoogleAnalytics gaId={googleAnalyticsId || ''} />
            </Suspense>
          </DelayedScripts>
        </NextIntlClientProvider>
        
        {/* Google Customer Reviews Badge */}
        <Script id="merchant-widget-script" src="https://www.gstatic.com/shopping/merchant/merchantwidget.js" strategy="lazyOnload" />
        <Script id="merchant-widget-init" strategy="lazyOnload">
          {`
            function initMerchantWidget() {
              if (typeof merchantwidget !== 'undefined') {
                merchantwidget.start({
                  merchant_id: 5826844744,
                  position: 'BOTTOM_RIGHT',
                  region: 'MA'
                });
              } else {
                setTimeout(initMerchantWidget, 500);
              }
            }
            initMerchantWidget();
          `}
        </Script>
      </body>
    </html>
  );
}
