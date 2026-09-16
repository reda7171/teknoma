import { getPopularBooks, getBestSellerBooks, getBestAuthors, getUsedBooks } from '@/lib/db/books'
import { getPopularPacks } from '@/lib/db/packs'
import { isFeatureEnabled } from '@/lib/actions/site-settings'
import { getAllCategoryQuotes } from '@/lib/actions/categories'
import { getRecentExchangeBooks } from '@/lib/actions/community-market'
import { getApprovedAudioTestimonials } from '@/lib/actions/audio-testimonials'
import { getApprovedImageTestimonials } from '@/lib/actions/image-testimonials'
import AudioTestimonial from '@/components/AudioTestimonial'
import TestimonialsTabs from '@/components/home/TestimonialsTabs'
import SonicDeliveryBanner from '@/components/home/SonicDeliveryBanner'
import InstagramFeed from '@/components/home/InstagramFeed'
import { getRecentPosts } from '@/lib/actions/blog'
import HeaderWithUser from '@/components/HeaderWithUser'
import BookCard from '@/components/BookCard'
import PackCard from '@/components/PackCard'
import TrustSection from '@/components/TrustSection'
import ScrollReveal from '@/components/ScrollReveal'
import Footer from '@/components/Footer'
import TypewriterText from '@/components/TypewriterText'
import { Link, redirect } from '@/i18n/routing'
import { normalizeImage } from '@/lib/utils'
import { Suspense } from 'react'
import { ArrowRight, BookOpen, Package, Truck, Shield, Sparkles, Quote, TrendingUp, Users, RefreshCw, FileText, Zap, Download , Headphones } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import ImageWithFallback from '@/components/ImageWithFallback'
import AuthorsCarousel from '@/components/AuthorsCarousel'
import CosmosBooks from '@/components/CosmosBooks'
import CatalogDownload from '@/components/home/CatalogDownload'
import CatalogPublicWrapper from '@/components/home/CatalogPublicWrapper'
import { getPrimaryImage } from '@/lib/utils/image'
import { getCommunityUser, getTopReaders } from '@/lib/actions/community-auth'
import GoogleOneTap from '@/components/auth/GoogleOneTap'
import SeoCategoriesSection from '@/components/SeoCategoriesSection'
import HomeLeaderboard from '@/components/home/HomeLeaderboard'

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations('HomePage.seo');

  const title = t('Title');
  const description = t('Description');

  const baseKeywords = [
    "رواية", "riwaya", "book", "الكاتب", "authors", "كتب",
    "أحسن مكتبة إلكترونية في المغرب", "أفضل مكتبة أونلاين في المغرب", "أحسن مكتبة في المغرب",
    "a7san librairie en ligne f maghrib", "meilleure librairie en ligne au maroc",
    "Livres numériques", "Édition marocaine", "Papeterie", "Scolaire et Pédagogie",
    "Coffrets", "Abonnements", "Meilleures ventes", "Dernières parutions", 
    "Idées de cadeaux", "Emmanuel Todd", "One Piece", "Sarah Rivens", "Andre Aciman"
  ];

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://riwaya.store';

  return {
    title: title,
    description: description,
    keywords: baseKeywords,

    alternates: {
      canonical: `${baseUrl}/${locale}`,
      languages: {
        'ar': `${baseUrl}/ar`,
        'fr': `${baseUrl}/fr`,
        'en': `${baseUrl}/en`,
        'x-default': `${baseUrl}/ar`,
      },
    },
    openGraph: {
      title: title,
      description: description,
      type: 'website',
      locale: locale === 'ar' ? 'ar_MA' : locale === 'en' ? 'en_MA' : 'fr_MA',
      url: `https://riwaya.store/${locale}`,
      siteName: 'Riwaya',
      images: [
        {
          url: 'https://riwaya.store/og-image.jpg',
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
  }
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  const t = await getTranslations('HomePage');
  const tDigital = await getTranslations('DigitalBooks');

  // Optimisation: Regrouper les queries similaires et utiliser le cache
    const [
    popularBooks,
    popularPacks,
    bestSellerBooks,
    bestAuthors,
    exchangeBooks,
    allQuotes,
    stats,
    featureDigitalBooks,
    featureExchange,
    recentPosts,
    homeSettings,
    homepageContent,
    audioTestimonialsResult,
    imageTestimonialsResult,
    usedBooks,
    topReaders
  ] = await Promise.all([
    getPopularBooks(8),
    getPopularPacks(3),
    getBestSellerBooks(4),
    getBestAuthors(8),
    getRecentExchangeBooks(6),
    getAllCategoryQuotes(),
    import('@/lib/db/books').then(m => m.getHomepageStats()),
    isFeatureEnabled('feature_digital_books'),
    isFeatureEnabled('feature_exchange'),
    getRecentPosts(3, locale),
    import('@/lib/actions/site-settings').then(m => m.getSettingsByCategory('homepage_sections')),
    import('@/lib/actions/site-settings').then(m => m.getSettingsByCategory('homepage_content')),
    getApprovedAudioTestimonials(),
    getApprovedImageTestimonials(),
    getUsedBooks(8),
    getTopReaders(10)
  ])

  const [totalBooks, totalUsers, totalExchanges] = stats
  const audioTestimonials = audioTestimonialsResult?.testimonials || []
  const imageTestimonials = imageTestimonialsResult?.testimonials || []
  const newBooks = popularBooks.slice(0, 8)
  const showSection = (key: string) => homeSettings[key] !== 'false'

  // Lire le contenu depuis DB avec fallback sur la valeur i18n
  const c = (key: string, fallback: string): string => {
    const dbValue = (homepageContent as Record<string, string>)[key]
    // Les textes personnalisés via l'admin sont sauvegardés en une seule langue (généralement FR).
    // On ne les utilise que si la locale correspond au français pour ne pas casser les traductions AR et EN.
    if (locale === 'fr' && dbValue) return dbValue
    return fallback
  }

  const getSectionProps = (key: string, defaultBg: string) => {
    const bg = homeSettings[`bg_${key}`] || defaultBg
    if (bg.startsWith('#') || bg.startsWith('rgb')) {
      return { style: { backgroundColor: bg } }
    }
    return { className: bg }
  }

  // Alerte Telegram Visite Accueil
  try {
    const { getSetting } = await import('@/lib/actions/site-settings')
    const shouldNotify = await getSetting('telegram_notify_home_visit') === 'true'

    if (shouldNotify) {
      const { sendTelegramMessage } = await import('@/lib/telegram')
      await sendTelegramMessage(`🏠 <b>Visite Accueil</b> (${locale.toUpperCase()})\n📅 ${new Date().toLocaleString('fr-FR')}`)
    }
  } catch (e) {
    // Ignorer les erreurs de notification
  }

  // AEO Settings
  let parsedAeoFaqs: any[] = []
  try {
    const { getSetting } = await import('@/lib/actions/site-settings')
    const aeoFaqJson = await getSetting('aeo_faq_json')
    if (aeoFaqJson) {
      parsedAeoFaqs = JSON.parse(aeoFaqJson)
    }
  } catch (e) {}

  let dbAeoSnippetQ = await import('@/lib/actions/site-settings').then(m => m.getSetting('aeo_short_answer_question'))
  let dbAeoSnippetA = await import('@/lib/actions/site-settings').then(m => m.getSetting('aeo_short_answer_text'))

  const defaultQ = t('AEOSnippet.Question')
  const defaultA = t('AEOSnippet.Answer')

  let aeoSnippetQ = defaultQ
  let aeoSnippetA = defaultA

  // Si l'admin a modifié le texte en BD (différent de notre fallback FR) et on est en FR,
  // ou s'il a mis un texte générique, on peut l'utiliser, mais pour éviter de montrer
  // du français sur la page arabe, on privilégie le texte de la base UNIQUEMENT pour la locale 'fr'
  // OU si le texte ne correspond pas au défaut français.
  // Note: On suppose ici que le texte par défaut FR est connu ou qu'on le vérifie
  const frDefaultQ = 'Où acheter des livres en ligne au Maroc ?'
  const frDefaultA = 'Riwaya est une librairie en ligne marocaine permettant de commander des livres et romans avec livraison au Maroc.'

  if (dbAeoSnippetQ && dbAeoSnippetQ.trim() !== '' && dbAeoSnippetQ !== frDefaultQ && locale === 'fr') {
      aeoSnippetQ = dbAeoSnippetQ;
  }
  if (dbAeoSnippetA && dbAeoSnippetA.trim() !== '' && dbAeoSnippetA !== frDefaultA && locale === 'fr') {
      aeoSnippetA = dbAeoSnippetA;
  }


  // Choisir une citation de manière déterministe (fix hydration error by not relying on Date.now() in SSR)
  let randomQuote = null;
  if (allQuotes.length > 0) {
    // on utilise la date "fixée" par SSR + calculs, ou on la fixe côté serveur sans changer côté client.
    // L'idéal: prendre un mod basé sur la longueur totale des stats (une valeur db fixe plutôt que l'heure)
    const seed = totalExchanges + totalBooks;
    randomQuote = allQuotes[seed % allQuotes.length];
  }

  // Structured Data pour SEO
  const jsonLd: { '@context': string; '@graph': any[] } = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': 'https://riwaya.store/#organization',
        name: 'Librairie Riwaya',
        url: 'https://riwaya.store',
        logo: {
          '@type': 'ImageObject',
          url: 'https://riwaya.store/logo.png',
          width: 512,
          height: 512,
        },
        sameAs: [
          'https://instagram.com/riwaya.book',
          'https://facebook.com/riwaya.book',
          'https://twitter.com/riwaya_ma',
          'https://linkedin.com/company/riwaya',
          'https://tiktok.com/@riwaya.book',
          'https://youtube.com/@riwaya.book'
        ],
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'Customer Service',
          telephone: '+212 702-220575',
          areaServed: 'MA',
          availableLanguage: ['French', 'Arabic', 'English'],
        },
      },
      {
        '@type': 'BookStore',
        '@id': 'https://riwaya.store/#localbusiness',
        name: 'Librairie Riwaya',
        image: 'https://riwaya.store/og-image.jpg',
        url: 'https://riwaya.store',
        telephone: '+212 702-220575',
        priceRange: '50 درهم - 500 درهم',
        address: {
          '@type': 'PostalAddress',
          streetAddress: 'Rabat',
          addressLocality: 'Rabat',
          addressRegion: 'Rabat-Salé-Kénitra',
          postalCode: '10000',
          addressCountry: 'MA',
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: 34.0151156,
          longitude: -6.8506771
        },
        hasMap: 'https://www.google.com/maps/place/Riwaya/@34.0151156,-6.8506771,17z/data=!3m1!4b1!4m6!3m5!1s0xda76d9be04b2cdb:0xb283e75db60f9d37!8m2!3d34.0151156!4d-6.8506771!16s%2Fg%2F11ywgnhfxt',
        openingHoursSpecification: {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
          opens: '09:00',
          closes: '22:00',
        },
        paymentAccepted: 'Cash on Delivery',
        currenciesAccepted: 'درهم',
      },
      {
        '@type': 'WebSite',
        '@id': 'https://riwaya.store/#website',
        url: 'https://riwaya.store',
        name: 'Riwaya',
        description: 'Librairie en ligne au Maroc - Achetez et échangez des livres',
        publisher: {
          '@id': 'https://riwaya.store/#organization',
        },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: 'https://riwaya.store/books?search={search_term_string}',
          },
          'query-input': 'required name=search_term_string',
        },
        inLanguage: ['fr-MA', 'ar-MA', 'en-MA'],
      },
      {
        '@type': 'SiteNavigationElement',
        '@id': 'https://riwaya.store/#navigation',
        name: [
          'Boutique',
          'Packs Spéciaux',
          'Meilleures Ventes',
          'Blog',
          'Contact',
          'Connexion',
          'Inscription'
        ],
        url: [
          'https://riwaya.store/books',
          'https://riwaya.store/packs',
          'https://riwaya.store/books?sort=popular',
          'https://riwaya.store/blog',
          'https://riwaya.store/contact',
          'https://riwaya.store/login',
          'https://riwaya.store/register'
        ]
      },
      {
        '@type': 'ItemList',
        '@id': 'https://riwaya.store/#products',
        name: 'Livres disponibles',
        numberOfItems: totalBooks,
        itemListElement: popularBooks.slice(0, 5).map((book, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          item: {
            '@type': 'Book',
            '@id': `https://riwaya.store/books/${book.id}`,
            name: book.title,
            author: {
              '@type': 'Person',
              name: book.author,
            },
            image: book.image,
            offers: {
              '@type': 'Offer',
              price: book.price,
              priceCurrency: 'MAD',
              availability: book.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
              seller: {
                '@id': 'https://riwaya.store/#organization',
              },
            },
          },
        })),
      },
    ],
  };

  let faqSchema: any = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: []
  }

  if (parsedAeoFaqs && parsedAeoFaqs.length > 0) {
    faqSchema.mainEntity = parsedAeoFaqs.map((faq: any) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.a,
      },
    }))
  } else {
    faqSchema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: locale === 'ar' ? 'ما هي أفضل وأحسن مكتبة إلكترونية في المغرب؟' : locale === 'en' ? 'What is the best online bookstore in Morocco?' : 'Quelle est la meilleure librairie en ligne au Maroc ?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: locale === 'ar' ? 'تعتبر مكتبة رواية (Riwaya) أحسن وأفضل مكتبة إلكترونية في المغرب. توفر مجموعة ضخمة من الروايات، كتب تطوير الذات، والأعمال مع خدمة الدفع عند الاستلام (COD) والتوصيل السريع لجميع المدن مثل الدار البيضاء والرباط.' : locale === 'en' ? 'Riwaya is considered the best online bookstore in Morocco. It offers a massive collection of novels, self-development, and business books with Cash on Delivery (COD) and fast shipping to all cities like Casablanca and Rabat.' : 'Riwaya est considérée comme la meilleure librairie en ligne au Maroc. Elle propose une vaste collection de romans, livres de développement personnel et business avec paiement à la livraison (COD) et livraison rapide dans toutes les villes comme Casablanca et Rabat.',
          },
        },
      {
        '@type': 'Question',
        name: locale === 'ar' ? 'هل تقومون بالتوصيل لجميع أنحاء المغرب؟' : locale === 'en' ? 'Do you deliver anywhere in Morocco?' : 'Livrez-vous partout au Maroc ?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: locale === 'ar' ? 'نعم، نقوم بتوصيل الكتب إلى جميع المدن والمناطق في المغرب مع شركاء لوجستيين سريعين وموثوقين.' : locale === 'en' ? 'Yes, we deliver books to all cities and regions in Morocco with fast and reliable logistics partners.' : 'Oui, nous livrons nos livres dans toutes les villes et régions du Maroc avec des partenaires logistiques rapides et fiables.',
        },
      },
      {
        '@type': 'Question',
        name: locale === 'ar' ? 'ما هي طرق الدفع المتاحة؟' : locale === 'en' ? 'What payment methods do you accept?' : 'Quels moyens de paiement acceptez-vous ?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: locale === 'ar' ? 'نحن نعطي الأولوية لسلامتك من خلال تقديم الدفع عند الاستلام (COD). تدفع فقط عندما تتسلم كتبك بيدك.' : locale === 'en' ? 'We prioritize your safety by offering Cash on Delivery (COD). You only pay when you receive your books in hand.' : 'Nous privilégions votre sécurité en proposant le paiement à la livraison (Cash on Delivery). Vous ne payez que lorsque vous recevez vos livres en main propre.',
        },
      },
      {
        '@type': 'Question',
        name: locale === 'ar' ? 'كم يستغرق التوصيل؟' : locale === 'en' ? 'How long does delivery take?' : 'Combien dure la livraison ?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: locale === 'ar' ? 'يستغرق التوصيل عادةً بين 24 و 48 ساعة عمل، اعتمادًا على عنوانك الدقيق في المغرب.' : locale === 'en' ? 'Delivery usually takes between 24h and 48h working days, depending on your exact address in Morocco.' : 'La livraison prend généralement entre 24h et 48h ouvrables, selon votre adresse exacte au Maroc.',
        },
      },
      // Questions AEO supplémentaires sur les best-sellers et packs
      {
        '@type': 'Question',
        name: locale === 'ar' ? 'ما هي أكثر الكتب مبيعًا في مكتبة رواية؟' : locale === 'en' ? 'What are the best-selling books at Riwaya?' : 'Quels sont les livres les plus vendus chez Riwaya ?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: bestSellerBooks.length > 0
            ? (locale === 'ar'
              ? `أكثر الكتب مبيعًا لدينا: ${bestSellerBooks.slice(0, 3).map(b => `"${b.title}" لـ ${b.author}`).join('، ')}. اكتشف كامل الكتالوج على riwaya.store.`
              : locale === 'en'
                ? `Our best-selling books include: ${bestSellerBooks.slice(0, 3).map(b => `"${b.title}" by ${b.author}`).join(', ')}. Discover the full catalog on riwaya.store.`
                : `Nos livres les plus vendus incluent : ${bestSellerBooks.slice(0, 3).map(b => `"${b.title}" de ${b.author}`).join(', ')}. Découvrez le catalogue complet sur riwaya.store.`)
            : (locale === 'ar' ? 'اكتشف قائمة أكثر الكتب مبيعًا على riwaya.store.' : locale === 'en' ? 'Discover the best-seller list on riwaya.store.' : 'Découvrez la liste des best-sellers sur riwaya.store.')
        },
      },
      {
        '@type': 'Question',
        name: locale === 'ar' ? 'هل يمكنني تبادل الكتب مع مكتبة رواية؟' : locale === 'en' ? 'Can I exchange books with Riwaya?' : 'Puis-je échanger des livres avec Riwaya ?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: locale === 'ar'
            ? 'نعم، تتيح مكتبة رواية خدمة تبادل الكتب بين القراء. يمكنك نشر كتبك وإيجاد قراء آخرين لتبادل الكتب معهم.'
            : locale === 'en'
              ? 'Yes, Riwaya offers a book exchange service between readers. You can list your books and find other readers to exchange with.'
              : "Oui, Riwaya propose un service d'échange de livres entre lecteurs. Vous pouvez lister vos livres et trouver d'autres lecteurs pour échanger."
        },
      },
      {
        '@type': 'Question',
        name: locale === 'ar' ? 'ما هو الفرق بين الكتب المفردة والباقات في رواية؟' : locale === 'en' ? 'What is the difference between individual books and packs on Riwaya?' : 'Quelle est la différence entre les livres individuels et les packs sur Riwaya ?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: locale === 'ar'
            ? 'يمكنك شراء الكتب منفردة أو ضمن باقات مختارة بعناية حول موضوع معين (التطوير الذاتي، الأعمال...) بسعر مخفض يصل إلى 30% مقارنة بالشراء المنفرد.'
            : locale === 'en'
              ? 'You can buy books individually or in carefully curated packs around a specific theme (personal development, business...) at a reduced price of up to 30% compared to individual purchases.'
              : "Vous pouvez acheter des livres à l'unité ou en packs soigneusement sélectionnés autour d'une thématique (développement personnel, business...) à un prix réduit jusqu'à 30% par rapport à l'achat individuel."
        },
      },
    ],
  };
  }

  jsonLd['@graph'].push(faqSchema);



  const defaultOrder = [
    'home_section_hero',
    'home_section_sonic_delivery',
    'home_section_custom_html',
    'home_section_features',
    'home_section_leaderboard',
    'home_section_best_sellers',
    'home_section_quote',
    'home_section_packs',
    'home_section_authors',
    'home_section_trust',
    'home_section_new_arrivals',
    'home_section_used_books',
    'home_section_audio_testimonials',
    'home_section_instagram',
    'home_section_exchange',
    'home_section_digital',
    'home_section_blog'
  ]
  const sectionsOrder = homeSettings['home_sections_order']
    ? homeSettings['home_sections_order'].split(',').filter(k => defaultOrder.includes(k) || k.startsWith('home_section_custom_html_'))
    : defaultOrder

  // Ensure missing sections are added at the end
  const finalOrder = [...sectionsOrder, ...defaultOrder.filter(k => !sectionsOrder.includes(k))]

  const renderSection = (key: string) => {
    if (!showSection(key)) return null

    if (key.startsWith('home_section_custom_html_')) {
      const customId = key.replace('home_section_custom_html_', '')
      const content = homeSettings[`home_custom_html_content_${customId}`]
      if (!content) return null
      return (
        <section
          key={key}
          {...getSectionProps(key, 'bg-white')}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      )
    }

    switch (key) {
      case 'home_section_hero':
        const heroProps = getSectionProps('home_section_hero', 'bg-pixio-cream');
        return (
          <section key={key} {...heroProps} className={`relative overflow-hidden py-1 ${heroProps.className || ''}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col lg:flex-row items-center gap-8">
                <div className="flex-1">
                  <ScrollReveal animation="animate-reveal-up" delay={200} className="space-y-8 text-center lg:text-start">
                    <div className={`inline-flex items-center gap-2 px-6 py-2 bg-white rounded-full text-black text-xs font-black uppercase tracking-widest shadow-sm border border-gray-100 pulse-yellow-glow mx-auto lg:mx-0 ${locale === 'ar' ? 'font-[family-name:var(--font-cairo)]' : ''}`}>
                      <Truck className="w-4 h-4 text-green-500" />
                      <span>{c('hero_badge', t('hero.Badge'))}</span>
                    </div>
                    <h1 className={`text-4xl md:text-6xl lg:text-7xl font-black text-black leading-[1.1] tracking-tighter ${locale === 'ar' ? 'font-[family-name:var(--font-cairo)]' : ''}`}>
                      {c('hero_title_part1', t('hero.TitlePart1'))}
                      <br />
                      <span className={`text-gray-500 text-3xl md:text-5xl lg:text-6xl ${locale === 'ar' ? 'font-[family-name:var(--font-cairo)]' : ''}`}>
                        {c('hero_title_part2', t('hero.TitlePart2'))}
                      </span>
                    </h1>
                    <p className={`text-lg md:text-xl text-gray-500 max-w-xl font-medium tracking-tight mx-auto lg:mx-0 ${locale === 'ar' ? 'font-[family-name:var(--font-cairo)]' : ''}`}>
                      {c('hero_description', t('hero.Description'))}
                    </p>

                  </ScrollReveal>
                </div>
                <div className="flex-1 relative w-full lg:w-auto flex flex-col items-center justify-center overflow-hidden gap-6">
                  {(() => {
                    const cosmosValidBooks = popularBooks.filter(book => {
                      const img = book.image ? book.image.trim() : '';
                      if (!img || img.includes('book-placeholder.png') || img === '/book-placeholder.png') return false;
                      const normalized = img.startsWith('http') || img.startsWith('data:') || img.startsWith('/') ? img : `data:image/jpeg;base64,${img}`;
                      return normalized && !normalized.includes('book-placeholder.png');
                    });
                    if (cosmosValidBooks.length === 0) return null;
                    return (
                      <CosmosBooks
                        centerBook={cosmosValidBooks[0]}
                        books={cosmosValidBooks}
                        locale={locale}
                        autoRotateCenter={true}
                        autoRotateInterval={7000}
                      />
                    );
                  })()}
                  {/* Boutons sous le cosmos — toutes tailles d'écran */}
                  <div className="flex flex-col sm:flex-row gap-4 justify-center w-full z-10 px-4">
                    <Link href="/packs" className="group inline-flex items-center justify-center gap-3 px-8 py-4 bg-black text-white font-black text-sm md:text-base uppercase tracking-widest rounded-full hover:bg-gray-800 transition-all shadow-xl hover:shadow-black/40 hover:-translate-y-1">
                      <span>{c('hero_btn_packs', t('hero.OurBundles'))}</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform rtl:rotate-180" />
                    </Link>
                    <Link href="/packs/create" className="group inline-flex items-center justify-center gap-3 px-8 py-4 bg-white text-black font-black text-sm md:text-base uppercase tracking-widest rounded-full border-2 border-gray-100 hover:border-black transition-all hover:-translate-y-1">
                      <span>{c('hero_btn_custom_pack', t('hero.CustomBundle'))}</span>
                    </Link>
                  </div>
                  
                  {/* PREUVE SOCIALE */}
                  <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-2 text-sm text-gray-500 font-bold z-10">
                    <div className="flex items-center gap-1">
                      {[1,2,3,4,5].map((i) => <svg key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>)}
                    </div>
                    <p>{c('hero_social_proof', t('hero.SocialProof'))}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )

            case 'home_section_sonic_delivery':
        return (
          <SonicDeliveryBanner 
            key={key} 
            locale={locale} 
            title={c('sonic_title', locale === 'ar' ? 'توصيل سونيك في الرباط، تمارة وسلا' : locale === 'en' ? 'Sonic Delivery in Rabat, Temara & Sale' : 'Livraison Sonic sur Rabat, Témara et Salé')}
            subtitle={c('sonic_subtitle', locale === 'ar' ? 'في أقل من ساعة!' : locale === 'en' ? 'in under an hour!' : "en moins d'une heure !")}
            description={c('sonic_description', locale === 'ar' ? 'اطلب الآن وتوصل بطلبك في الرباط، تمارة أو سلا بسرعة البرق. لا مزيد من الانتظار، نحن نضمن لك أسرع خدمة توصيل.' : locale === 'en' ? 'Order now and receive your package in Rabat, Temara, or Sale with lightning speed. No more waiting, we guarantee the fastest delivery service.' : "Commandez maintenant et recevez votre colis à Rabat, Témara ou Salé à la vitesse de l'éclair. Fini l'attente, nous garantissons la livraison la plus rapide.")}
            badge1={c('sonic_badge1', '1 ' + (locale === 'ar' ? 'ساعة كحد أقصى' : locale === 'en' ? 'Hour Max' : 'Heure Max'))}
            badge2={c('sonic_badge2', locale === 'ar' ? 'الرباط، تمارة وسلا' : locale === 'en' ? 'Rabat, Temara, Sale' : 'Rabat, Témara, Salé')}
            buttonText={c('sonic_btn_text', locale === 'ar' ? 'تحدانا الآن!' : locale === 'en' ? 'Challenge us now!' : 'Mettez-nous au défi !')}
          />
        )

      case 'home_section_custom_html':
        if (!homeSettings['home_custom_html_content']) return null
        return (
          <section
            key={key}
            {...getSectionProps('home_section_custom_html', 'bg-white')}
            dangerouslySetInnerHTML={{ __html: homeSettings['home_custom_html_content'] }}
          />
        )

      case 'home_section_features':
        return (
          <section key={key} {...getSectionProps('home_section_features', 'bg-white')} className={`py-12 ${getSectionProps('home_section_features', 'bg-white').className || ''}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                {[
                  { icon: Truck, title: c('features_1_title', t('Features.ShippingTitle')), desc: c('features_1_desc', t('Features.ShippingDesc')), color: 'bg-pixio-cream' },
                  { icon: Shield, title: c('features_2_title', t('Features.PaymentTitle')), desc: c('features_2_desc', t('Features.PaymentDesc')), color: 'bg-pixio-yellow' },
                  { icon: Package, title: c('features_3_title', t('Features.PacksTitle')), desc: c('features_3_desc', t('Features.PacksDesc')), color: 'bg-pixio-beige' }
                ].map((feature, idx) => (
                  <ScrollReveal key={idx} delay={idx * 150} className="flex flex-col items-center text-center space-y-4">
                    <div className={`w-20 h-20 ${feature.color} rounded-[2rem] flex items-center justify-center group hover:rotate-6 transition-transform shadow-sm hover:shadow-xl`}>
                      <feature.icon className="w-8 h-8 text-black" />
                    </div>
                    <h2 className="text-lg font-black text-black tracking-tight">{feature.title}</h2>
                    <p className="text-sm text-gray-500 font-medium">{feature.desc}</p>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </section>
        )

      case 'home_section_leaderboard':
        return <HomeLeaderboard key={key} topReaders={topReaders} />

      case 'home_section_best_sellers':
        return (
          <section key={key} {...getSectionProps('home_section_best_sellers', 'bg-white')} className={`py-12 ${getSectionProps('home_section_best_sellers', 'bg-white').className || ''}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <ScrollReveal delay={100} className="flex flex-col items-center text-center mb-16 space-y-6" dir="ltr">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-full">
                    <TrendingUp className="w-4 h-4 text-orange-600" />
                    <span className="text-xs md:text-sm font-black uppercase text-orange-600 tracking-[0.3em]">
                      {c('bestsellers_subtitle', t('BestSellers.Subtitle'))}
                    </span>
                  </div>
                  <h2 className="text-4xl md:text-6xl font-black text-black tracking-tight">
                    {c('bestsellers_title', t('BestSellers.Title'))}<span className="text-orange-500">.</span>
                  </h2>
                  <p className="text-lg md:text-xl text-gray-500 font-medium max-w-2xl mx-auto">
                    {c('bestsellers_description', t('BestSellers.Description'))}
                  </p>
                </div>
                <Link href="/books" className="group flex items-center gap-4 bg-pixio-cream px-8 py-3 rounded-full border border-gray-100 hover:border-black transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-xl">
                  <span className="text-xs font-black uppercase tracking-widest text-black">{c('bestsellers_view_all', t('BestSellers.ViewAll'))}</span>
                  <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center text-white group-hover:translate-x-1 transition-transform">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </Link>
              </ScrollReveal>
              {bestSellerBooks.length === 0 ? (
                <ScrollReveal delay={300} className="text-center py-16 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                  <TrendingUp className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-500 font-bold text-sm uppercase tracking-wider">{c('bestsellers_soon', t('BestSellers.Soon'))}</p>
                </ScrollReveal>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                  {bestSellerBooks.map((book: any, idx: number) => (
                    <ScrollReveal key={book.id} delay={idx * 100} animation="animate-reveal-up">
                      <BookCard {...book} priority={idx < 4} />
                    </ScrollReveal>
                  ))}
                </div>
              )}
            </div>
          </section>
        )

      case 'home_section_quote':
        if (!randomQuote) return null
        return (
          <section key={key} {...getSectionProps('home_section_quote', 'bg-pixio-yellow')} className={`py-12 relative overflow-hidden ${getSectionProps('home_section_quote', 'bg-pixio-yellow').className || ''}`}>
            <ScrollReveal animation="animate-reveal-up" delay={100} className="relative z-10">
              <Quote className="absolute -top-10 -right-10 w-64 h-64 text-white opacity-50 -rotate-12" />
              <Quote className="absolute -bottom-10 -left-10 w-64 h-64 text-white opacity-50 rotate-12" />
              <div className="max-w-4xl mx-auto px-4 text-center">
                <div className="inline-flex items-center gap-3 px-6 py-2 bg-black text-white rounded-full text-[10px] font-black uppercase tracking-[0.3em] mb-12">
                  <Sparkles className="w-4 h-4 text-pixio-yellow" />
                  {c('quotes_wisdom_label', t('Quotes.WisdomOfTheDay'))}
                </div>
                <p className="text-3xl md:text-5xl font-black text-black leading-tight tracking-tighter mb-10 italic">
                  "{randomQuote.quote}"
                </p>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-1 bg-black rounded-full mb-4"></div>
                  <p className="text-sm font-black uppercase tracking-[0.4em] text-gray-500">— {randomQuote.quoteSource}</p>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 mt-2">
                    {c('quotes_featured_in', t('Quotes.FeaturedIn'))} <span className="text-black">{randomQuote.name}</span>
                  </p>
                </div>
              </div>
            </ScrollReveal>
          </section>
        )

      case 'home_section_packs':
        return (
          <section key={key} {...getSectionProps('home_section_packs', 'bg-pixio-cream')} className={`py-12 overflow-hidden ${getSectionProps('home_section_packs', 'bg-pixio-cream').className || ''}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <ScrollReveal delay={100} className="flex flex-col items-start text-start mb-16 space-y-4">
                <span className="text-xs md:text-sm font-black uppercase text-gray-500 tracking-[0.3em] rtl:tracking-normal">{c('collections_subtitle', t('Collections.Subtitle'))}</span>
                <h2 className="text-4xl md:text-6xl font-black text-black tracking-tight rtl:tracking-normal">
                  {c('collections_title', t('Collections.Title'))}<span className="text-pixio-pink">.</span>
                </h2>
              </ScrollReveal>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {popularPacks.map((pack: any, idx: number) => (
                  <ScrollReveal key={pack.id} delay={idx * 150} animation="animate-reveal-up">
                    <PackCard {...pack} />
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </section>
        )

      case 'home_section_authors':
        return (
          <section key={key} {...getSectionProps('home_section_authors', 'bg-white')} className={`py-8 relative overflow-hidden ${getSectionProps('home_section_authors', 'bg-white').className || ''}`}>
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-pixio-yellow/30 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 -z-10 animate-float"></div>
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-amber-100/20 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2 -z-10 animate-float-slow"></div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col lg:flex-row items-center lg:items-end justify-between mb-0 gap-4">
                <ScrollReveal className="space-y-6 text-center lg:text-left rtl:lg:text-right max-w-2xl">
                  <div className="inline-flex items-center gap-3 px-6 py-2 bg-black text-white rounded-full">
                    <Users className="w-4 h-4 text-pixio-yellow" />
                    <span className="text-[10px] rtl:text-sm rtl:tracking-normal font-black uppercase tracking-[0.4em]">{c('authors_subtitle', t('BestAuthors.Subtitle'))}</span>
                  </div>
                  <h2 className="text-6xl md:text-8xl rtl:tracking-normal font-black text-black tracking-tighter leading-[0.8] mb-4">
                    {c('authors_title', t('BestAuthors.Title'))}<span className="text-pixio-yellow">.</span>
                  </h2>
                  <p className="text-xl text-gray-500 font-medium tracking-tight">{c('authors_description', t('BestAuthors.Description'))}</p>
                </ScrollReveal>
                <ScrollReveal animation="animate-reveal-right" delay={300}>
                  <Link href="/books" className="group flex items-center gap-4 bg-pixio-cream px-8 py-4 rounded-full border border-gray-100 hover:border-black transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-xl">
                    <span className="text-xs rtl:text-sm rtl:tracking-normal font-black uppercase tracking-widest text-black">{c('authors_view_books', t('BestAuthors.BooksPlural'))}</span>
                    <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center text-white group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform">
                      <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                    </div>
                  </Link>
                </ScrollReveal>
              </div>
              {bestAuthors.length === 0 ? (
                <div className="text-center py-32 bg-pixio-cream rounded-[4rem] border-2 border-dashed border-gray-100">
                  <Users className="w-20 h-20 text-gray-200 mx-auto mb-6" />
                  <p className="text-gray-500 font-black text-xs rtl:text-sm rtl:tracking-normal uppercase tracking-[0.3em]">{c('authors_no_data', t('BestAuthors.NoData'))}</p>
                </div>
              ) : (
                <AuthorsCarousel authors={bestAuthors} />
              )}
            </div>
          </section>
        )

      case 'home_section_trust':
        return (
          <TrustSection
            key={key}
            {...getSectionProps('home_section_trust', 'bg-white')}
            stats={{
              books: totalBooks + 500,
              readers: totalUsers + 1000,
              exchanges: totalExchanges + 200
            }}
          />
        )

      case 'home_section_new_arrivals':
        return (
          <section key={key} {...getSectionProps('home_section_new_arrivals', 'bg-white')} className={`py-12 overflow-hidden ${getSectionProps('home_section_new_arrivals', 'bg-white').className || ''}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <ScrollReveal delay={100} className="flex items-end justify-between mb-16 gap-8">
                <div className="space-y-4">
                  <span className="text-xs md:text-sm rtl:text-sm rtl:tracking-normal font-black uppercase text-gray-500 tracking-[0.3em]">{c('new_arrivals_subtitle', t('NewArrivals.Subtitle'))}</span>
                  <h2 className="text-4xl md:text-6xl rtl:tracking-normal font-black text-black tracking-tight">{c('new_arrivals_title', t('NewArrivals.Title'))}</h2>
                </div>
                <Link href="/books" className="group flex items-center gap-4 bg-pixio-cream px-6 py-3 rounded-full border border-gray-100 hover:border-black transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-xl">
                  <span className="text-xs font-black uppercase tracking-widest text-black">{c('new_arrivals_view_all', t('NewArrivals.ViewAll'))}</span>
                  <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center text-white group-hover:translate-x-1 transition-transform">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </Link>
              </ScrollReveal>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-16">
                {newBooks.map((book: any, idx: number) => (
                  <ScrollReveal key={book.id} delay={idx * 100} animation="animate-reveal-up">
                    <BookCard {...book} variant={idx === 0 ? 'featured' : 'default'} priority={true} />
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </section>
        )

      case 'home_section_instagram':
        return <InstagramFeed key={key} />

      case 'home_section_used_books':
        if (!usedBooks || usedBooks.length === 0) return null
        return (
          <section key={key} {...getSectionProps('home_section_used_books', 'bg-pixio-cream')} className={`py-12 overflow-hidden ${getSectionProps('home_section_used_books', 'bg-pixio-cream').className || ''}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <ScrollReveal delay={100} className="flex items-end justify-between mb-16 gap-8">
                <div className="space-y-4">
                  <span className="text-xs md:text-sm rtl:text-sm rtl:tracking-normal font-black uppercase text-gray-500 tracking-[0.3em]">
                    {locale === 'ar' ? 'اكتشف' : locale === 'en' ? 'Discover' : 'Découvrez'}
                  </span>
                  <h2 className="text-4xl md:text-6xl rtl:tracking-normal font-black text-black tracking-tight">
                    {locale === 'ar' ? 'كتب مستعملة' : locale === 'en' ? 'Used Books' : 'Livres d\'occasion'}
                  </h2>
                </div>
                <Link href="/books?condition=USED,GOOD" className="group flex items-center gap-4 bg-white px-6 py-3 rounded-full border border-gray-100 hover:border-black transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-xl">
                  <span className="text-xs font-black uppercase tracking-widest text-black">
                    {locale === 'ar' ? 'عرض الكل' : locale === 'en' ? 'View all' : 'Voir tout'}
                  </span>
                  <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center text-white group-hover:translate-x-1 transition-transform">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </Link>
              </ScrollReveal>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-16">
                {usedBooks.map((book: any, idx: number) => (
                  <ScrollReveal key={book.id} delay={idx * 100} animation="animate-reveal-up">
                    <BookCard {...book} variant="default" priority={false} />
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </section>
        )

      case 'home_section_exchange':
        if (!featureExchange) return null
        return (
          <section key={key} {...getSectionProps('home_section_exchange', 'bg-gradient-to-br from-green-50 to-teal-50')} className={`py-12 overflow-hidden ${getSectionProps('home_section_exchange', 'bg-gradient-to-br from-green-50 to-teal-50').className || ''}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <ScrollReveal className="flex flex-col md:flex-row items-end justify-between mb-16 gap-8">
                <div className="space-y-4 flex-1">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-100 to-teal-100 rounded-full">
                    <RefreshCw className="w-4 h-4 text-green-600" />
                    <span className="text-xs md:text-sm rtl:text-sm rtl:tracking-normal font-black uppercase text-green-600 tracking-[0.3em]">{c('exchange_subtitle', t('ExchangeBooks.Subtitle'))}</span>
                  </div>
                  <h2 className="text-4xl md:text-6xl font-black text-black tracking-tight">
                    {c('exchange_title', t('ExchangeBooks.Title'))}<span className="text-green-500">.</span>
                  </h2>
                  <p className="text-lg text-gray-500 font-medium max-w-2xl">{c('exchange_description', t('ExchangeBooks.Description'))}</p>
                </div>
                <Link href="/community/market" className="group flex items-center gap-4 bg-white px-6 py-3 rounded-full border border-green-100 hover:border-green-600 transition-all duration-300 hover:-translate-y-1 shadow-xl hover:shadow-2xl">
                  <span className="text-xs font-black uppercase tracking-widest text-green-600">{c('exchange_view_all', t('ExchangeBooks.ViewAll'))}</span>
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white group-hover:translate-x-1 transition-transform">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </Link>
              </ScrollReveal>

              {exchangeBooks.length === 0 ? (
                <ScrollReveal delay={300} className="text-center py-16 bg-white/50 rounded-3xl border-2 border-dashed border-green-200">
                  <RefreshCw className="w-16 h-16 text-green-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-black text-lg md:text-2xl uppercase tracking-wider mb-8">{c('exchange_no_data', t('ExchangeBooks.NoData'))}</p>
                  <Link href="/community/login" className="inline-flex items-center gap-3 px-8 py-4 bg-green-600 text-white font-black text-sm md:text-base uppercase tracking-widest rounded-full hover:bg-green-700 transition-all shadow-lg hover:shadow-green-600/30 hover:-translate-y-1">
                    <span>{c('exchange_join', t('ExchangeBooks.JoinCommunity'))}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </ScrollReveal>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {exchangeBooks.map((book: any, idx: number) => (
                      <ScrollReveal key={book.id} delay={idx * 150} animation="animate-reveal-up">
                        <Link href={`/community/market/${book.id}`} className="group h-full relative bg-white rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-500 border-2 border-green-100 hover:border-green-500 flex flex-col">
                          <div className="relative aspect-[3/4] bg-gray-100 overflow-hidden">
                            {book.image && getPrimaryImage(book.image) ? <ImageWithFallback src={getPrimaryImage(book.image)} alt={book.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" /> : <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-100 to-teal-100"><BookOpen className="w-20 h-20 text-green-300" /></div>}
                            <div className="absolute top-4 right-4 px-3 py-1.5 bg-white/95 backdrop-blur-sm rounded-full text-[9px] font-black uppercase tracking-wider text-green-600 border border-green-200">{book.condition}</div>
                          </div>
                          <div className="p-6 flex-grow flex flex-col">
                            <h3 className="text-lg font-black text-black mb-1 line-clamp-2 group-hover:text-green-600 transition-colors">{book.title}</h3>
                            <p className="text-sm text-gray-500 font-bold italic mb-4">{book.author}</p>
                            <div className="mt-auto flex items-center gap-3 pt-4 border-t border-gray-100">
                              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center overflow-hidden">
                                {book.owner?.image ? <ImageWithFallback src={book.owner.image} alt={book.owner.fullName} className="w-full h-full object-cover" /> : <span className="text-green-600 font-black text-xs">{book.owner?.fullName?.[0]}</span>}
                              </div>
                              <div className="flex-grow">
                                <p className="text-xs font-bold text-gray-600 truncate">{book.owner?.fullName}</p>
                                <p className="text-[10px] text-gray-500 font-bold">{book.owner?.city}</p>
                              </div>
                              {book.owner?.rating > 0 && <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-full"><Sparkles className="w-3 h-3 text-yellow-600 fill-yellow-600" /><span className="text-xs font-black text-yellow-600">{book.owner.rating.toFixed(1)}</span></div>}
                            </div>
                            <div className="mt-4 flex items-center gap-2"><RefreshCw className="w-4 h-4 text-green-600" /><span className="text-xs font-black text-green-600 uppercase tracking-wider">{book.exchangeType}</span></div>
                          </div>
                        </Link>
                      </ScrollReveal>
                    ))}
                  </div>
                  <ScrollReveal delay={500} className="flex justify-center mt-12">
                    <Link href="/community/market" className="group inline-flex items-center gap-4 px-12 py-6 bg-green-600 text-white font-black text-xs uppercase tracking-widest rounded-full hover:bg-green-700 transition-all shadow-2xl hover:scale-105 hover:-translate-y-1">
                      <span>{c('exchange_view_more', t('ExchangeBooks.ViewMore'))}</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </ScrollReveal>
                </>
              )}
            </div>
          </section>
        )

            case 'home_section_audio_testimonials':
        if (!audioTestimonials?.length && !imageTestimonials?.length) return null
        return (
          <section key={key} {...getSectionProps('home_section_audio_testimonials', 'bg-pixio-cream')} className={`py-16 overflow-hidden ${getSectionProps('home_section_audio_testimonials', 'bg-pixio-cream').className || ''}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <ScrollReveal delay={100} className="flex flex-col items-center text-center mb-12 space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-full">
                    <Headphones className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs md:text-sm rtl:text-sm rtl:tracking-normal font-black uppercase text-emerald-600 tracking-[0.3em]">
                      {c('audio_testimonials_subtitle', locale === 'ar' ? 'تجارب عملائنا' : locale === 'en' ? 'Testimonials' : 'Témoignages')}
                    </span>
                  </div>
                <h2 className="text-4xl md:text-5xl font-black text-black tracking-tight">
                  {c('audio_testimonials_title', locale === 'ar' ? 'ماذا يقولون عنا' : locale === 'en' ? 'What They Say' : 'Ce qu\'ils disent de nous')}<span className="text-emerald-500">.</span>
                </h2>
              </ScrollReveal>
              <TestimonialsTabs audioTestimonials={audioTestimonials} imageTestimonials={imageTestimonials} locale={locale} />
            </div>
          </section>
        )

      case 'home_section_digital':
        if (!featureDigitalBooks) return null
        return (
          <section key={key} {...getSectionProps('home_section_digital', 'bg-black')} className={`py-12 overflow-hidden relative ${getSectionProps('home_section_digital', 'bg-black').className || ''}`}>
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-amber-400/5 rounded-full blur-[120px]" />
            </div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
              <div className="flex flex-col lg:flex-row items-center gap-16">
                <div className="flex-1 space-y-8">
                  <ScrollReveal animation="animate-reveal-up" delay={100}><div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-400/10 border border-amber-400/20 rounded-full"><Zap className="w-3 h-3 text-amber-400" /><span className="text-xs md:text-sm rtl:text-sm rtl:tracking-normal font-black uppercase text-amber-400 tracking-[0.3em]">{c('digital_badge', tDigital('HomeSection.Badge'))}</span></div></ScrollReveal>
                  <ScrollReveal animation="animate-reveal-up" delay={200}><h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-[0.9]">{c('digital_title', tDigital('HomeSection.Title'))}<span className="text-amber-400">.</span></h2></ScrollReveal>
                  <ScrollReveal animation="animate-reveal-up" delay={300}><p className="text-lg text-gray-500 font-medium max-w-lg leading-relaxed">{c('digital_description', tDigital('HomeSection.Description'))}</p></ScrollReveal>
                  <ScrollReveal animation="animate-reveal-up" delay={400} className="space-y-4">
                    {[
                      { icon: Download, label: c('digital_feature_1', tDigital('HomeSection.Feature1')) },
                      { icon: FileText, label: c('digital_feature_2', tDigital('HomeSection.Feature2')) },
                      { icon: Shield, label: c('digital_feature_3', tDigital('HomeSection.Feature3')) },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3"><div className="w-8 h-8 bg-amber-400/10 border border-amber-400/20 rounded-xl flex items-center justify-center flex-shrink-0"><item.icon className="w-4 h-4 text-amber-400" /></div><span className="text-sm font-bold text-gray-500">{item.label}</span></div>
                    ))}
                  </ScrollReveal>
                  <ScrollReveal animation="animate-reveal-up" delay={500}><Link href="/livres-numeriques" className="group inline-flex items-center gap-4 px-10 py-5 bg-amber-400 text-black font-black text-xs uppercase tracking-widest rounded-full hover:bg-amber-300 transition-all shadow-2xl hover:shadow-amber-400/30 hover:-translate-y-1 hover:scale-105"><span>{c('digital_cta', tDigital('HomeSection.CTA'))}</span><ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></Link></ScrollReveal>
                </div>
                <ScrollReveal animation="animate-reveal-right" delay={300} className="flex-1 flex justify-center lg:justify-end">
                  <div className="relative w-72 h-80">
                    {[
                      { z: 1, rotate: '-8deg', ty: '16px', tx: '-12px', opacity: 0.4 },
                      { z: 2, rotate: '4deg', ty: '8px', tx: '8px', opacity: 0.6 },
                      { z: 3, rotate: '0deg', ty: '0px', tx: '0px', opacity: 1 },
                    ].map((card, i) => (
                      <div key={i} className="absolute inset-4 rounded-3xl border border-amber-400/20 bg-gray-900 flex flex-col items-center justify-center gap-6 p-8" style={{ zIndex: card.z, transform: `rotate(${card.rotate}) translateY(${card.ty}) translateX(${card.tx})`, opacity: card.opacity }}>
                        {i === 2 && (<><div className="w-20 h-20 bg-amber-400/10 border border-amber-400/30 rounded-2xl flex items-center justify-center"><FileText className="w-10 h-10 text-amber-400" /></div><div className="space-y-2 w-full"><div className="h-2 bg-amber-400/30 rounded-full" /><div className="h-2 bg-white/10 rounded-full w-4/5" /><div className="h-2 bg-white/10 rounded-full w-3/5" /><div className="h-2 bg-white/10 rounded-full w-2/3" /></div><div className="flex items-center gap-2 px-4 py-2 bg-amber-400 rounded-full"><Download className="w-4 h-4 text-black" /><span className="text-black text-xs font-black uppercase tracking-wider">PDF</span></div></>)}
                      </div>
                    ))}
                  </div>
                </ScrollReveal>
              </div>
            </div>
          </section>
        )

      case 'home_section_trust':
        return (
          <TrustSection
            key={key}
            stats={{
              books: totalBooks + 500, // Ajout d'offset pour le décollage
              readers: totalUsers + 1000,
              exchanges: totalExchanges + 200
            }}
          />
        )

      case 'home_section_new_arrivals':
        return (
          <section key={key} {...getSectionProps('home_section_new_arrivals', 'bg-white')} className={`py-24 overflow-hidden ${getSectionProps('home_section_new_arrivals', 'bg-white').className || ''}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <ScrollReveal delay={100} className="flex items-end justify-between mb-16 gap-8">
                <div className="space-y-4">
                  <span className="text-xs md:text-sm rtl:text-sm rtl:tracking-normal font-black uppercase text-gray-500 tracking-[0.3em]">{c('new_arrivals_subtitle', t('NewArrivals.Subtitle'))}</span>
                  <h2 className="text-4xl md:text-6xl font-black text-black tracking-tight">
                    {c('new_arrivals_title', t('NewArrivals.Title'))}
                  </h2>
                </div>
                <Link
                  href="/books"
                  className="group flex items-center gap-4 bg-pixio-cream px-6 py-3 rounded-full border border-gray-100 hover:border-black transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-xl"
                >
                  <span className="text-xs font-black uppercase tracking-widest text-black">{c('new_arrivals_view_all', t('NewArrivals.ViewAll'))}</span>
                  <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center text-white group-hover:translate-x-1 transition-transform">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </Link>
              </ScrollReveal>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-16">
                {newBooks.map((book: any, idx: number) => (
                  <ScrollReveal key={book.id} delay={idx * 100} animation="animate-reveal-up">
                    <BookCard
                      {...book}
                      variant={idx === 0 ? 'featured' : 'default'}
                    />
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </section>
        )

      case 'home_section_exchange':
        if (!featureExchange) return null
        return (
          <section key={key} {...getSectionProps('home_section_exchange', 'bg-gradient-to-br from-green-50 to-teal-50')} className={`py-24 overflow-hidden ${getSectionProps('home_section_exchange', 'bg-gradient-to-br from-green-50 to-teal-50').className || ''}`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <ScrollReveal className="flex flex-col md:flex-row items-end justify-between mb-16 gap-8">
                <div className="space-y-4 flex-1">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-100 to-teal-100 rounded-full">
                    <RefreshCw className="w-4 h-4 text-green-600" />
                    <span className="text-xs md:text-sm rtl:text-sm rtl:tracking-normal font-black uppercase text-green-600 tracking-[0.3em]">
                      {c('exchange_subtitle', t('ExchangeBooks.Subtitle'))}
                    </span>
                  </div>
                  <h2 className="text-4xl md:text-6xl font-black text-black tracking-tight">
                    {c('exchange_title', t('ExchangeBooks.Title'))}<span className="text-green-500">.</span>
                  </h2>
                  <p className="text-lg text-gray-500 font-medium max-w-2xl">
                    {c('exchange_description', t('ExchangeBooks.Description'))}
                  </p>
                </div>
                <Link
                  href="/community/market"
                  className="group flex items-center gap-4 bg-white px-6 py-3 rounded-full border border-green-100 hover:border-green-600 transition-all duration-300 hover:-translate-y-1 shadow-xl hover:shadow-2xl"
                >
                  <span className="text-xs font-black uppercase tracking-widest text-green-600">{c('exchange_view_all', t('ExchangeBooks.ViewAll'))}</span>
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white group-hover:translate-x-1 transition-transform">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </Link>
              </ScrollReveal>

              {exchangeBooks.length === 0 ? (
                <ScrollReveal delay={300} className="text-center py-16 bg-white/50 rounded-3xl border-2 border-dashed border-green-200">
                  <RefreshCw className="w-16 h-16 text-green-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-black text-lg md:text-2xl uppercase tracking-wider mb-8">
                    {c('exchange_no_data', t('ExchangeBooks.NoData'))}
                  </p>
                  <Link
                    href="/community/login"
                    className="inline-flex items-center gap-3 px-8 py-4 bg-green-600 text-white font-black text-sm md:text-base uppercase tracking-widest rounded-full hover:bg-green-700 transition-all shadow-lg hover:shadow-green-600/30 hover:-translate-y-1"
                  >
                    <span>{c('exchange_join', t('ExchangeBooks.JoinCommunity'))}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </ScrollReveal>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {exchangeBooks.map((book: any, idx: number) => (
                      <ScrollReveal key={book.id} delay={idx * 150} animation="animate-reveal-up">
                        <Link
                          href={`/community/market/${book.id}`}
                          className="group h-full relative bg-white rounded-3xl overflow-hidden hover:shadow-2xl transition-all duration-500 border-2 border-green-100 hover:border-green-500 flex flex-col"
                        >
                          <div className="relative aspect-[3/4] bg-gray-100 overflow-hidden">
                            {book.image ? (
                              <ImageWithFallback
                                src={book.image}
                                alt={book.title}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-100 to-teal-100">
                                <BookOpen className="w-20 h-20 text-green-300" />
                              </div>
                            )}

                            <div className="absolute top-4 right-4 px-3 py-1.5 bg-white/95 backdrop-blur-sm rounded-full text-[9px] font-black uppercase tracking-wider text-green-600 border border-green-200">
                              {book.condition}
                            </div>
                          </div>

                          <div className="p-6 flex-grow flex flex-col">
                            <h3 className="text-lg font-black text-black mb-1 line-clamp-2 group-hover:text-green-600 transition-colors">
                              {book.title}
                            </h3>
                            <p className="text-sm text-gray-500 font-bold italic mb-4">
                              {book.author}
                            </p>

                            <div className="mt-auto flex items-center gap-3 pt-4 border-t border-gray-100">
                              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center overflow-hidden">
                                {book.owner?.image ? (
                                  <ImageWithFallback
                                    src={book.owner.image}
                                    alt={book.owner.fullName}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-green-600 font-black text-xs">
                                    {book.owner?.fullName?.[0]}
                                  </span>
                                )}
                              </div>
                              <div className="flex-grow">
                                <p className="text-xs font-bold text-gray-600 truncate">
                                  {book.owner?.fullName}
                                </p>
                                <p className="text-[10px] text-gray-500 font-bold">
                                  {book.owner?.city}
                                </p>
                              </div>
                              {book.owner?.rating > 0 && (
                                <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-full">
                                  <Sparkles className="w-3 h-3 text-yellow-600 fill-yellow-600" />
                                  <span className="text-xs font-black text-yellow-600">
                                    {book.owner.rating.toFixed(1)}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="mt-4 flex items-center gap-2">
                              <RefreshCw className="w-4 h-4 text-green-600" />
                              <span className="text-xs font-black text-green-600 uppercase tracking-wider">
                                {book.exchangeType}
                              </span>
                            </div>
                          </div>
                        </Link>
                      </ScrollReveal>
                    ))}
                  </div>

                  <ScrollReveal delay={500} className="flex justify-center mt-12">
                    <Link
                      href="/community/market"
                      className="group inline-flex items-center gap-4 px-12 py-6 bg-green-600 text-white font-black text-xs uppercase tracking-widest rounded-full hover:bg-green-700 transition-all shadow-2xl hover:scale-105 hover:-translate-y-1"
                    >
                      <span>{c('exchange_view_more', t('ExchangeBooks.ViewMore'))}</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </ScrollReveal>
                </>
              )}
            </div>
          </section>
        )

      case 'home_section_blog':
        if (!recentPosts || recentPosts.length === 0) return null
        return (
          <section key={key} {...getSectionProps('home_section_blog', 'bg-white')} className={`py-32 relative overflow-hidden ${getSectionProps('home_section_blog', 'bg-white').className || ''}`}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 text-[20vw] font-black text-gray-50 opacity-[0.03] select-none pointer-events-none whitespace-nowrap">JOURNAL RIWAYA</div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
              <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-16 gap-8">
                <ScrollReveal className="space-y-4 max-w-xl text-left rtl:text-right">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-pixio-cream rounded-full"><FileText className="w-4 h-4 text-black" /><span className="text-xs md:text-sm rtl:text-sm rtl:tracking-normal rtl:text-sm rtl:tracking-normal font-black uppercase text-black tracking-[0.3em]">{c('journal_subtitle', t('Journal.Subtitle') || 'Notre Journal')}</span></div>
                  <h2 className="text-5xl md:text-7xl rtl:tracking-normal font-black text-black tracking-tighter leading-[0.9]">{c('journal_title_part1', t('Journal.TitlePart1') || 'Derniers Articles')}<br /><span className="text-gray-500 italic">{c('journal_title_part2', t('Journal.TitlePart2') || 'à Découvrir')}</span></h2>
                </ScrollReveal>
                <ScrollReveal animation="animate-reveal-right">
                  <Link href="/blog" className="group flex items-center gap-4 bg-black text-white px-8 py-4 rounded-full hover:bg-gray-800 transition-all shadow-xl hover:-translate-y-1"><span className="text-xs rtl:text-sm rtl:tracking-normal font-black uppercase tracking-widest">{c('journal_view_all', t('Journal.ViewAll') || 'Tout Lire')}</span><ArrowRight className="w-4 h-4 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform rtl:rotate-180" /></Link>
                </ScrollReveal>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                {recentPosts.map((post: any, idx: number) => (
                  <ScrollReveal key={post.id} delay={idx * 150} animation="animate-reveal-up">
                    <Link href={`/blog/${post.slug}`} className="group block h-full">
                      <article className="h-full flex flex-col bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 hover:border-black transition-all duration-500 hover:shadow-2xl hover:-translate-y-2">
                        <div className="relative aspect-[16/10] overflow-hidden">
                          {post.coverImage ? (
                            <ImageWithFallback
                              src={post.coverImage}
                              alt={post.title}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                            />
                          ) : (
                            <div className="w-full h-full bg-pixio-cream flex items-center justify-center">
                              <BookOpen className="w-12 h-12 text-gray-500" />
                            </div>
                          )}
                        </div>

                        <div className="p-8 flex-grow flex flex-col">
                          <div className="flex items-center gap-2 mb-4"><div className="w-1.5 h-1.5 rounded-full bg-black" /><span className="text-[10px] rtl:text-xs rtl:tracking-normal font-black uppercase tracking-widest text-gray-500">{post.category?.name || 'Inspiration'}</span></div>
                          <h3 className="text-2xl font-black text-black leading-tight mb-4 group-hover:text-gray-600 transition-colors line-clamp-2">{post.title}</h3>
                          <p className="text-gray-500 text-sm font-medium line-clamp-3 mb-8">{post.excerpt}</p>
                          <div className="mt-auto flex items-center justify-between">
                            <div className="flex items-center gap-2 text-black font-black text-xs md:text-sm rtl:tracking-normal uppercase tracking-widest group-hover:gap-4 transition-all"><span>{c('journal_read_more', t('Journal.ReadMore') || 'Lire la suite')}</span><ArrowRight className="w-4 h-4 rtl:rotate-180" /></div>
                            <span className="text-[10px] font-semibold text-gray-500 rtl:text-xs">{new Date(post.publishedAt).toLocaleDateString(locale === 'ar' ? 'ar-MA' : 'fr-FR', { day: 'numeric', month: 'long' })}</span>
                          </div>
                        </div>
                      </article>
                    </Link>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </section>
        )

      default:
        return null
    }
  }

  return (
    <>
      {/* RoulettePopup removed */}
      
      <Suspense fallback={<div className="h-[72px] bg-white border-b border-gray-100" />}>
        <HeaderWithUser />
      </Suspense>

      <style dangerouslySetInnerHTML={{ __html: `
        body::-webkit-scrollbar { display: none !important; }
        body { -ms-overflow-style: none !important; scrollbar-width: none !important; }
      `}} />
      <main className="min-h-screen bg-white overflow-x-hidden">
        {finalOrder.map(key => renderSection(key))}

        {/* CTA + AEO fusionnés */}
        <section className="py-16 bg-black overflow-hidden relative">
          <div className="absolute top-0 right-0 w-96 h-96 bg-pixio-beige/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 animate-float"></div>
          <ScrollReveal className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 flex flex-col items-center gap-10" dir="ltr">
            <div>
              <h2 className="text-4xl md:text-6xl font-black text-white mb-8 tracking-tighter">
                {c('cta_title_part1', t('CTA.TitlePart1'))} <br />
                <span className="text-gray-500 italic">{c('cta_title_part2', t('CTA.TitlePart2'))}</span>
              </h2>
              <Link
                href="/books"
                className="group inline-flex items-center gap-4 px-12 py-6 bg-white text-black font-black text-xs uppercase tracking-widest rounded-full hover:bg-pixio-cream transition-all shadow-2xl hover:scale-105 hover:-translate-y-1 pulse-yellow-glow"
              >
                <span>{c('cta_button', t('CTA.Button'))}</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            {aeoSnippetQ && aeoSnippetA && (
              <div className="border-t border-white/20 pt-8 mt-8 w-full max-w-2xl text-center">
                <p className="text-white text-lg md:text-xl font-bold mb-3">{aeoSnippetQ}</p>
                <p className="text-white/90 text-sm md:text-base leading-relaxed">{aeoSnippetA}</p>
              </div>
            )}
          </ScrollReveal>
        </section>

        <SeoCategoriesSection locale={locale} />

        <CatalogPublicWrapper />
        <Footer />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Suspense fallback={null}>
          <GoogleOneTapWrapper />
        </Suspense>
      </main>
    </>
  )
}

// Wrapper to keep GoogleOneTap out of static generation
async function GoogleOneTapWrapper() {
  const { getCommunityUser } = await import('@/lib/actions/community-auth');
  const user = await getCommunityUser();
  if (user) return null;
  const { prisma } = await import('@/lib/prisma');
  const googleEnabledSetting = await prisma.siteSettings.findUnique({ where: { key: 'auth_google_enabled' } });
  if (googleEnabledSetting?.value === 'false') return null;
  return <GoogleOneTap />;
}

