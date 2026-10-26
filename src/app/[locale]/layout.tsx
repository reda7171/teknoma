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
  const siteUrl = await getSetting('site_url') || 'https://riwaya.store';

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

  const seoAuthor = seoAuthorRaw || 'Riwaya Team';
  const seoOgImage = seoOgImageRaw || '/og-image.jpg';
  const seoOgWidth = seoOgWidthRaw || '1200';
  const seoOgHeight = seoOgHeightRaw || '630';
  const seoOgType = seoOgTypeRaw || 'website';
  const seoTwitterHandle = seoTwitterHandleRaw || '@riwaya_ma';
  const seoTwitterCard = seoTwitterCardRaw || 'summary_large_image';
  const seoTwitterImage = seoTwitterImageRaw || seoOgImage;
  const seoRobotsMeta = seoRobotsMetaRaw || 'index, follow';
  const seoFavicon = seoFaviconRaw || '/favicon.ico';

  // On injecte "Riwayat" dans le titre par défaut pour un max d'impact SEO
  const title = seoTitle || t('Title') || "Riwaya (Riwayat): 1ère Librairie en ligne au Maroc";
  const description = seoDescription || t('Description') || "Votre librairie en ligne n°1 au Maroc ! Livraison rapide à Casablanca, Rabat & partout au Maroc. Commandez vos livres et riwayat au meilleur prix : romans, mangas, scolaire et fournitures.";

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
    "book store maroc", "librairie en ligne darija", "livres occasion maroc", "echange ktoba",
    "Commandez vos livres en ligne parmi plus de 2 millions de références : romans, jeunesses, BDs, mangas, mangas casablanca, scolaires, fournitures",
    "Réservez votre livre parmi plus de 3 millions de titres : romans, jeunesse, BD, manga, scolaire, bestseller, polars beaux-arts, sciences humaines",
    " Chez mon libraire réunit une association professionnelle et un portail grand public au service des librairies indépendantes d'Auvergne-Rhône-Alpes",
    "C'est un lieu où les parents trouvent les premières histoires pour leurs bambins ; où les enfants rencontrent leurs premières héroïnes/héros et coups de cœur",
    "Réservez votre livre parmi plus d'1 million de titres : romans, jeunesse, BD, manga, scolaire, bestseller, polars beaux-arts, sciences humaines",
    "riwayat", "tiwayat fantasia", "mktaba f rabat", "biblio rabat",
    "maktaba f casablanca",
    "livres casablanca",
    "livres rabat",
    "livres marrakech",
    "livres tanger",
    "livres agadir",
    "livres fes",
    "livres meknes",
    "livres essaouira",
    "livres tetouan",
    "livres kenitra",
    "livres casablanca",
    "livres rabat",
    "livres marrakech",
    "livres tanger",
    "livres agadir",
    "livres fes",
    "livres meknes",
    "livres essaouira",
    "livres tetouan",
    "livres kenitra",
    "livres casablanca",
    "livres rabat",
    "livres marrakech",
    "livres tanger",
    "livres agadir",
    "livres fes",
    "livres meknes",
    "livres essaouira",
    "livres tetouan",
    "livres kenitra",
    "livres casablanca",
    "livres rabat",
    "livres marrakech",
    "livres tanger",
    "livres agadir",
    "livres fes",
    "livres meknes",
    "livres essaouira",
    "livres tetouan",
    "livres kenitra",
    "atomic habits",
    "the mountain is you",
    "the power of now",
    "rich dad poor dad",
    "the 48 laws of power",
    "think and grow rich",
    "the intelligent investor",
    "the psychology of money",
    "the lean startup",
    "zero to one",
    "the 12 rules for life",
    "the 7 habits of highly effective people",
    "how to win friends and influence people",
    "the subtle art of not giving a fuck",
    "the alchemist",
    "the midnight library",
    "the silent patient",
    "the girl with the dragon tattoo",
    "the da vinci code",
    "the hunger games",
    "the fault in our stars",
    "the chronicles of narnia",
    "the lord of the rings",
    "the hobbit",
    "the great gatsby",
    "the catcher in the rye",
    "the odyssey",
    "the iliad",
    "the bible",
    "the quran",
    "the torah",
    "the tao te ching",
    "the art of war",
    "the prince",
    "the republic",
    "the wealth of nations",
    "the communist manifesto",
    "the origin of species",
    "the self-made billionaire",
    "the self-made millionaire",
    "the self-made trillionaire",
  ];

  const keywordsAr = [
    // A — Money Keywords : Librairie / Achat
    "أحسن مكتبة إلكترونية في المغرب", "أفضل مكتبة أونلاين في المغرب", "مكتبة رواية",
    "a7san librairie en ligne f maghrib", "a7san maktaba", "meilleure librairie en ligne au maroc",
    "كتب المغرب", "مكتبة على الانترنت المغرب", "شراء كتب المغرب", "رواية",
    "مكتبة الدار البيضاء", "مكتبة الرباط", "مكتبة مراكش", "مكتبة طنجة", "مكتبة أكادير", "مكتبة فاس", "مكتبة مكناس",
    "شراء كتب رخيصة في المغرب", "أفضل موقع لشراء الكتب في المغرب",
    "تخفيضات الكتب المغرب", "كتب أصلية المغرب",
    "riwaya", "books", "library", "livre", "kotob", "ktoba", "kotobarabia", "ktoba tn", "ktobati",
    "كتب دارجة", "شري كتوبا", "رواية ستور",
    "كتوبا", "كتوبا دارجة", "كتب بالدارجة", "مكتبة أونلاين",
    "قرا كتاب", "قرا كتوبا", "تبادل الكتوبا", "كتب مستعملة المغرب", "كتوبا رخاص",
    "a7san maktaba f marrakech",
    "مكتبة في الدار البيضاء توصيل مجاني",
    "أحسن روايات مغربية",
    "مكتبة في فاس", "مكتبة في طنجة", "مكتبة في أكادير", "مكتبة في مكناس",
    "مكتبة كتب فرنسية في المغرب", "مكتبة كتب إنجليزية في المغرب", "مكتبة كتب عربية في المغرب",
    "أفضل مكتبة كتب في المغرب",
    "مكتبة رواية كازا", "مكتبة رواية الرباط", "مكتبة رواية مراكش", "مكتبة رواية طنجة",
    "مكتبة رواية أكادير", "مكتبة رواية فاس", "مكتبة رواية مكناس", "مكتبة رواية الدار البيضاء",
    "مكتبة رواية المغرب", "مكتبة رواية أونلاين", "مكتبة رواية أونلاين المغرب",
    "مكتبة رواية أونلاين الدار البيضاء", "مكتبة رواية أونلاين الرباط",
    "مكتبة رواية أونلاين مراكش", "مكتبة رواية أونلاين طنجة",
    "مكتبة رواية أونلاين أكادير", "مكتبة رواية أونلاين فاس", "مكتبة رواية أونلاين مكناس",

    // B — Category Keywords : Traffic Pages
    "كتب تطوير الذات", "كتب تطوير الذات والثقة بالنفس", "كتب علم النفس", "كتب الثقة بالنفس",
    "كتب النجاح", "كتب المال والأعمال", "كتب الأعمال", "كتب الإنتاجية", "كتب القيادة",
    "كتب العلاقات", "كتب الفلسفة", "كتب إسلامية", "كتب الروايات", "كتب الأدب",
    "كتب التسويق", "كتب أطفال", "روايات عربية", "روايات بوليسية",
    "تطوير الذات", "كتب أعمال", "فلسفة", "روايات", "باقات كتب",
    "تبادل الكتب المغرب", "توصيل الكتب", "الدفع عند الاستلام", "توصيل مجاني",
    "أدوات مدرسية", "كتب إنجليزية", "مانغا", "أفضل الكتب العربية",
    "الدخول المدرسي", "محافظ مدرسية",
    "مقلمات", "أقلام", "دفاتر", "أدوات مكتبية", "أدب عربي",
    "قرآن كريم",

    // C — Product Intent : Meilleurs livres
    "كتاب العادات الذرية", "كتاب سيكولوجية المال", "كتاب فكر وازدد ثراء",
    "كتاب فن اللامبالاة", "كتاب 48 قانون للقوة", "كتاب قوة عقلك الباطن",
    "كتاب لماذا ننام", "كتاب كيف تكسب الأصدقاء وتؤثر في الناس",
    "كتاب الأب الغني والأب الفقير", "كتاب نظرية الفستق",
    "كتاب الإنسان يبحث عن المعنى", "كتاب مزرعة الحيوان", "كتاب 1984",
    "كتاب الأمير", "كتاب قواعد العشق الأربعون", "كتاب جلسات نفسية",
    "كتاب عقدك النفسية سجنك الأبدي", "كتاب رسائل من القرآن",
    "كتاب زاد المعاد", "كتاب الداء والدواء", "كتاب رياض الصالحين",
    "كتاب لا تحزن", "كتاب معجزة الصباح", "كتاب هكذا تكلم زرادشت",
    "كتاب العادات السبع للناس الأكثر فعالية", "كتاب جسمك يتذكر كل شيء",
    "كتاب شجاعة أن تكون غير محبوب", "كتاب سيكولوجية الجماهير",
    "كتاب قوة الآن", "كتاب قوانين الطبيعة البشرية",
    "كتاب ذكاء العاطفي", "كتاب دع القلق وابدأ الحياة",
    "كتاب طوق الحمامة", "كتاب ثلاثية غرناطة",
    "كتاب ثم لم يبق أحد", "كتاب ماجدولين",
    "كتاب 12 قاعدة للحياة", "كتاب 21 درسا للقرن 21",
    "كتاب نظرية التغافل", "كتاب ورط نفسك",
    "كتاب ربما عليك أن تكلم أحدا", "كتاب لن تهزمني بعد اليوم",
    "كتاب لغات الحب الخمس", "كتاب لا تكن لطيفا أكثر من اللازم",
    "كتاب حصن المسلم", "كتاب صيد الخاطر",
    "كتاب صحيح البخاري", "كتاب رياض الصالحين",

    // D — Author Keywords : Authority Pages
    "كتب ابن القيم", "كتب مصطفى محمود", "كتب فريد الأنصاري",
    "كتب دوستويفسكي", "كتب ديل كارنيجي",
    "كتب جورج أورويل", "كتب جوزيف ميرفي", "كتب نابليون هيل",
    "كتب عن الزواج في الإسلام",

    // E — PDF Keywords : Blog / Articles Only
    "كتاب العادات الذرية pdf", "كتاب سيكولوجية المال pdf",
    "كتاب فن اللامبالاة pdf", "كتاب 1984 pdf",
    "كتاب نظرية الفستق pdf", "كتاب قوة عقلك الباطن pdf",
    "كتاب زاد المعاد pdf", "كتاب لا تحزن pdf",
    "كتاب كيف تكسب الأصدقاء pdf", "كتاب الأب الغني والأب الفقير pdf",
    "كتاب الإنسان يبحث عن المعنى pdf",
    "كتاب رياض الصالحين pdf", "كتاب زاد المعاد في هدي خير العباد pdf",
    "كتاب داء ودواء pdf", "كتاب دع القلق وابدأ الحياة pdf",
    "كتاب ثلاثة الأصول pdf", "كتاب نهج البلاغة",
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
    "books in darija", "moroccan literature", "morocco library", "ktouba shop", "best productivity books", "best self improvement books",
    "best productivity books morocco", "best self improvement books morocco", "best business books morocco", "buy books casablanca", "buy books rabat", "buy books marrakech", "buy books fes", "buy books meknes", "buy books tangier", "buy books agadir", "buy books fes", "buy books meknes",

    "maktaba f rabat",
    "maktaba online maghrib",
    "riwayat", "riwayat morocco", "buy riwayat online", "riwayat in english"
  ];

  const baseKeywords = locale === 'ar' ? keywordsAr : (locale === 'en' ? keywordsEn : keywordsFr);
  const keywords = seoKeywords ? seoKeywords.split(',').map(k => k.trim()) : baseKeywords;
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
        'x-default': `${siteUrl}/ar`, // L'Arabe est la langue par défaut comme défini dans le middleware
      },
    },
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

  const { lang, dir } = localeConfig[locale] ?? localeConfig.ar;

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
    isFeatureEnabled('feature_chatbot'),
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

  const siteUrl = siteUrlRaw || 'https://riwaya.store';
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
        <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-MSD75KHT"
          height="0" width="0" style={{ display: 'none', visibility: 'hidden' }} title="Google Tag Manager"></iframe></noscript>
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
                  urlTemplate: `${siteUrl}/${locale}/books?search={search_term_string}`
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
              priceRange: '50 درهم - 500 درهم',
              description: 'Riwaya est la meilleure librairie en ligne au Maroc (a7san librairie en ligne f maghrib). Nous offrons la plus grande sélection de romans, de livres de développement personnel, et d\'affaires avec livraison (COD) partout au Maroc comme Casablanca et Rabat. مكتبة رواية هي أحسن وأفضل مكتبة إلكترونية في المغرب.',
              url: siteUrl,
              logo: { '@type': 'ImageObject', url: `${siteUrl}/logo.png`, width: 200, height: 60 },
              // knowsAbout : signale les sujets que les moteurs de réponse doivent associer à Riwaya
              knowsAbout: [
                'Livres', 'Librairie en ligne', 'Développement personnel', 'Romans', 'Business',
                'Philosophie', 'Livraison au Maroc', 'Cash on Delivery', 'Échange de livres',
                'كتب', 'مكتبة إلكترونية', 'تطوير الذات', 'روايات', 'المغرب'
              ],
              paymentAccepted: 'Cash',
              currenciesAccepted: 'درهم',
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
              hasMap: 'https://www.google.com/maps/place/Riwaya/@34.0151156,-6.8506771,17z/data=!3m1!4b1!4m6!3m5!1s0xda76d9be04b2cdb:0xb283e75db60f9d37!8m2!3d34.0151156!4d-6.8506771!16s%2Fg%2F11ywgnhfxt',
              hasMerchantReturnPolicy: {
                '@type': 'MerchantReturnPolicy',
                applicableCountry: 'MA',
                returnPolicyCountry: 'MA',
                returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
                merchantReturnDays: 3,
                returnMethod: 'https://schema.org/ReturnByMail',
                returnFees: 'https://schema.org/FreeReturn',
                refundType: 'https://schema.org/FullRefund',
                merchantReturnLink: `${siteUrl}/${locale}/returns`
              }
            })
          }}
        ></script>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <main id="main-content">
            {children}
          </main>
          <Toaster />
          <CookieConsent />
          {isWhatsAppEnabled && (
            <WhatsAppButton
              phone={activeWhatsAppAgent?.phone || whatsappPhone || undefined}
              agentName={activeWhatsAppAgent?.name}
            />
          )}
          <WhatsAppChannelButton url={whatsappChannelUrl || undefined} />
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
