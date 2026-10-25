import { notFound, permanentRedirect } from 'next/navigation'
import { Metadata } from 'next'
import { getPopularBooks, getBooks } from '@/lib/db/books'
import Header from '@/components/HeaderWithUser'
import Footer from '@/components/Footer'
import BookCard from '@/components/BookCard'
import { CheckCircle2, Truck, Shield, Star, BookOpen, ChevronRight, ChevronDown, Languages } from 'lucide-react'
import { Link } from '@/i18n/routing'
import { getBaseUrl, normalizeImage } from '@/lib/utils'

import { getSeoCategoryPage } from '@/lib/actions/seo-categories'
import { getTranslations } from 'next-intl/server'

// Map de keywords SEO par slug pour enrichir le ciblage
const slugKeywordsMap: Record<string, string[]> = {
  'romans-arabes': ['روايات عربية', 'روايات عربية مشهورة', 'كتب روايات عربية', 'شراء روايات المغرب', 'روايات عربية 2024'],
  'romans-romantiques': ['روايات رومانسية', 'كتاب قواعد العشق الأربعون', 'أفضل الروايات الرومانسية', 'روايات حب', 'روايات رومانسية عربية'],
  'romans-thriller-suspense': ['روايات تشويق', 'روايات بوليسية', 'أفضل روايات الإثارة', 'روايات غموض', 'ثم لم يبق أحد'],
  'livres-developpement-personnel': ['كتب تطوير الذات', 'كتب الثقة بالنفس', 'كتاب العادات الذرية', 'كتب النجاح', 'كتاب معجزة الصباح'],
  'livres-business-investissement': ['كتب المال والأعمال', 'كتاب الأب الغني والأب الفقير', 'كتاب سيكولوجية المال', 'كتب الاستثمار', 'كتب ريادة الأعمال'],
  'romans-marocains': ['روايات مغربية', 'أحسن روايات مغربية', 'روايات كتاب مغاربة', 'أدب مغربي', 'روايات مغربية 2024'],
  'idees-cadeaux-livres': ['كتب هدية', 'أفضل كتاب للهدية', 'هدايا ثقافية المغرب', 'كتب كهدية', 'هدية كتاب مغرب'],
  'livres-pas-chers': ['كتب رخيصة', 'كتوبا رخاص', 'شراء كتب بأسعار مناسبة', 'كتب بثمن معقول', 'مكتبة رخيصة المغرب'],
  'self-help-books': ['self help books morocco', 'personal development books', 'best self help books', 'motivational books morocco'],
  'romantic-novels': ['romantic novels morocco', 'best romance books', 'love story books', 'romantic arabic novels'],
  'livre-maroc': ['livre maroc', 'acheter livre maroc', 'librairie maroc', 'livre en ligne maroc', 'meilleure librairie maroc'],
  'librairie-en-ligne-maroc': ['librairie en ligne maroc', 'acheter livre en ligne', 'commande livre maroc', 'livraison livre maroc'],
  'riwayat-arabia': ['روايات عربية', 'كتب عربية', 'مكتبة عربية أونلاين', 'شراء روايات', 'أفضل الكتب العربية'],
  'kotob-tatwir-adat': ['كتب تطوير الذات', 'كتاب العادات الذرية', 'كتاب فن اللامبالاة', 'كتب الإنتاجية', 'كتاب معجزة الصباح'],
  'kotob-mal-istithmar': ['كتب المال', 'كتاب سيكولوجية المال', 'كتاب الأب الغني', 'كتب الاستثمار', 'كتب الأعمال'],
}

export async function generateMetadata({ params }: { params: Promise<{ seoSlug: string, locale: string }> }): Promise<Metadata> {
  const { seoSlug, locale } = await params
  const resolved = await getSeoCategoryPage(seoSlug, locale)

  if (!resolved) return {}
  const { category: data, slugsByLocale } = resolved

  // Keywords enrichis selon le slug
  const extraKeywords = slugKeywordsMap[seoSlug] || []
  const baseUrl = getBaseUrl()
  const pageUrl = `${baseUrl}/${locale}/collection/${seoSlug}`
  const cleanTitle = data.title.replace(/\s*[|–-]\s*Riwaya(?:\s+Store)?\s*$/i, '').trim()
  const keywordTerms = [data.keyword, data.searchQuery, ...extraKeywords]
    .flatMap(value => value ? value.split(/[,،]/) : [])
    .map(value => value.trim())
    .filter(Boolean)
  const firstBookImage = data.books.find(item => item.book.active)?.book.image
  const normalizedOgImage = firstBookImage ? normalizeImage(firstBookImage) : null
  const ogImage = normalizedOgImage
    ? (normalizedOgImage.startsWith('http') ? normalizedOgImage : `${baseUrl}${normalizedOgImage}`)
    : `${baseUrl}/opengraph-image`
  const ogLocale = locale === 'ar' ? 'ar_MA' : locale === 'en' ? 'en_MA' : 'fr_MA'

  return {
    title: { absolute: `${cleanTitle} | Riwaya` },
    description: data.description,
    keywords: [
      ...new Set(keywordTerms),
      'maroc', 'livraison', 'paiement à la livraison', 'riwaya store', 'librairie maroc'
    ],
    robots: data.isActive
      ? { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' } }
      : { index: false, follow: false },
    openGraph: {
      title: `${cleanTitle} | Riwaya`,
      description: data.description,
      type: 'website',
      siteName: 'Riwaya Store',
      url: pageUrl,
      locale: ogLocale,
      images: [{ url: ogImage, alt: data.h1 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${cleanTitle} | Riwaya`,
      description: data.description,
      images: [ogImage],
    },
    alternates: {
      canonical: pageUrl,
      languages: {
        ...(slugsByLocale.fr ? { 'fr': `${baseUrl}/fr/collection/${slugsByLocale.fr}`, 'fr-MA': `${baseUrl}/fr/collection/${slugsByLocale.fr}` } : {}),
        ...(slugsByLocale.ar ? { 'ar': `${baseUrl}/ar/collection/${slugsByLocale.ar}`, 'ar-MA': `${baseUrl}/ar/collection/${slugsByLocale.ar}` } : {}),
        ...(slugsByLocale.en ? { 'en': `${baseUrl}/en/collection/${slugsByLocale.en}`, 'en-MA': `${baseUrl}/en/collection/${slugsByLocale.en}` } : {}),
        'x-default': `${baseUrl}/fr/collection/${slugsByLocale.fr || data.slug}`,
      }
    }
  }
}

export default async function SeoLandingPage({ params }: { params: Promise<{ seoSlug: string, locale: string }> }) {
  const { seoSlug, locale } = await params
  const resolved = await getSeoCategoryPage(seoSlug, locale)
  const t = await getTranslations('SeoPage')

  if (!resolved || !resolved.category.isActive) {
    notFound()
    return null
  }

  const data = resolved.category
  if (data.slug !== seoSlug) permanentRedirect(`/${locale}/collection/${data.slug}`)

  // Obtenir les livres assignés manuellement d'abord
  let popularBooks = data.books?.map((b: any) => b.book).filter((book: any) => book.active) || []
  
  // Si pas assez de livres, on complète avec la recherche automatique
  if (popularBooks.length < 8) {
    let additionalBooks = []
    if (data.searchQuery) {
      additionalBooks = await getBooks({ search: data.searchQuery, limit: 8, active: true })
    } else {
      additionalBooks = await getPopularBooks(8)
    }
    // Ajouter ceux qui ne sont pas déjà dans la liste
    additionalBooks.forEach((b: any) => {
      if (!popularBooks.some((pb: any) => pb.id === b.id)) {
        popularBooks.push(b)
      }
    })
    popularBooks = popularBooks.slice(0, 8)
  }

  const structuredBooks = popularBooks.slice(0, 24)
  let faqList: { q: string; a: string }[] = []
  try {
    if (data.faq) faqList = JSON.parse(data.faq)
  } catch(e) {}

  if (!Array.isArray(faqList) || faqList.length === 0) {
    if (locale === 'ar') {
      faqList = [
        {
          q: `كيف يمكنني طلب كتب ${data.title} عبر متجر رواية؟`,
          a: "يمكنك اختيار الكتب أو الباقات وإضافتها إلى السلة، ثم تأكيد الطلب بكتابة رقم هاتفك وعنوانك. الدفع يتم نقداً عند الاستلام (COD) بعد استلام طلبيتك وفحصها."
        },
        {
          q: "ما هي مدة وتكلفة توصيل الكتب في المغرب؟",
          a: "نقوم بالتوصيل السريع إلى جميع مدن وقرى المملكة المغربية في غضون 24 إلى 48 ساعة عمل عبر شركاء توصيل موثوقين (الدار البيضاء، الرباط، مراكش، فاس، طنجة، أكادير، وجميع المدن)."
        },
        {
          q: "هل الكتب المعروضة أصلية وجديدة وبجودة ممتازة؟",
          a: "نعم، جميع كتب وروايات متجر رواية جديدة 100%، بجودة طباعة وتغليف عالية لضمان تجربة قراءة ممتعة تدوم طويلاً."
        },
        {
          q: "هل يمكنني فحص الطرد قبل الدفع عند الاستلام؟",
          a: "نعم بكل تأكيد، يتيح لك متجر رواية فحص محتوى الطرد والتأكد من سلامته قبل تسليم المبلغ لموزع التوصيل لضمان راحة بالك التامة."
        },
        {
          q: "هل التوصيل مجاني عند شراء الكتب؟",
          a: "نوفر التوصيل المجاني على الباقات الترويجية المختارة أو عند وصول مجموع سلتكم إلى السقف المؤهل. رسوم الشحن تظهر بوضوح وبكل شفافية قبل تأكيد الطلب."
        },
        {
          q: "ما هي شروط الاستبدال والاسترجاع (ضمان رواية)؟",
          a: "نوفر ضمان 'راضٍ أو مسترجع خلال 7 أيام'. في حال وجود أي عيب مصنعي أو تلف أثناء الشحن، يتكفل فريقنا باستبدال نسختكم فوراً أو إرجاع ثمنها دون تعقيد."
        },
        {
          q: "هل تتوفر باقات وتخفيضات خاصة بالمجموعة؟",
          a: "نعم، نجمع لكم أفضل العناوين ذات الصلة في باقات اقتصادية حصرية (2، 3 أو 4 كتب) بأسعار مخفضة تمنحكم خصومات حقيقية مقارنة بالشراء الفردي."
        },
        {
          q: "كيف أتتبع طلبيتي أو أتواصل مع خدمة العملاء؟",
          a: "فور تسجيل طلبكم، يتواصل معكم فريقنا عبر الواتساب لتأكيد الشحن والتتبع. كما أن خدمة عملائنا رهن إشارتكم 7 أيام في الأسبوع للإجابة على جميع تساؤلاتكم."
        }
      ]
    } else if (locale === 'en') {
      faqList = [
        {
          q: `How can I order ${data.title} books on Riwaya?`,
          a: "Simply browse our collection, add your favorite books or packs to the cart, and confirm your order by entering your name, phone number, and address. Payment is made by Cash on Delivery (COD) upon receiving and inspecting your package."
        },
        {
          q: "What are the delivery times and coverage in Morocco?",
          a: "We ship quickly across all cities and regions of Morocco within 24 to 48 business hours (Casablanca, Rabat, Marrakech, Fes, Tangier, Agadir, and more)."
        },
        {
          q: "Are the books new, original, and authentic?",
          a: "Yes, 100% of the books available on Riwaya are brand new, genuine editions with premium print quality and protective packaging."
        },
        {
          q: "Can I inspect the parcel before paying the courier?",
          a: "Absolutely. With our Cash on Delivery service, you are welcome to inspect the condition of your books before handing over the payment to the delivery agent."
        },
        {
          q: "Is delivery free on book orders?",
          a: "Free shipping is offered on selected promotional packs or eligible cart totals. Exact delivery charges are calculated and displayed transparently before confirmation."
        },
        {
          q: "What is your return and exchange policy?",
          a: "Every order is protected by our Riwaya 7-day money-back guarantee. If you encounter any print defects or shipping issues, we immediately replace or refund your purchase."
        },
        {
          q: "Do you offer bundle deals and discounts for this collection?",
          a: "Yes, we curate exclusive multi-book packs (2, 3, or 4 books) at special bundled prices, allowing you to save money while building your library."
        },
        {
          q: "How can I track my order or reach customer support?",
          a: "As soon as your order is confirmed, our team updates you via WhatsApp and SMS with tracking details. Customer support is available 7 days a week to assist you."
        }
      ]
    } else {
      faqList = [
        {
          q: `Comment commander des livres ${data.title} sur Riwaya ?`,
          a: "Sélectionnez vos livres préférés ou packs, ajoutez-les au panier et validez votre commande en renseignant votre numéro de téléphone et adresse. Le paiement s'effectue en espèces à la livraison (Cash on Delivery) après réception de votre colis."
        },
        {
          q: "Quels sont les délais de livraison au Maroc ?",
          a: "Nous livrons partout au Maroc sous 24 à 48 heures ouvrables dans toutes les villes (Casablanca, Rabat, Marrakech, Fès, Tanger, Agadir, etc.) via des transporteurs partenaires réactifs."
        },
        {
          q: "Les livres sont-ils neufs et authentiques ?",
          a: "Oui, l'ensemble de notre catalogue se compose exclusivement d'éditions neuves, d'origine et soigneusement emballées pour préserver l'état parfait de chaque ouvrage."
        },
        {
          q: "Puis-je vérifier mon colis avant de payer ?",
          a: "Absolument. Avec notre service de paiement à la livraison, vous avez la possibilité de vérifier l'état de votre colis directement auprès du livreur avant de régler."
        },
        {
          q: "La livraison est-elle gratuite ?",
          a: "La livraison est offerte sur nos packs promotionnels et dès que votre panier atteint le montant requis. Pour les autres commandes, les frais sont calculés et affichés en toute transparence avant validation."
        },
        {
          q: "Quelle est votre politique de retour ou d'échange ?",
          a: "Vous bénéficiez de la garantie Riwaya 'Satisfait ou remboursé sous 7 jours'. En cas de défaut de fabrication ou de dommage durant le transport, nous échangeons l'ouvrage ou vous remboursons sans tracas."
        },
        {
          q: "Proposez-vous des packs et des réductions sur plusieurs livres ?",
          a: "Oui ! Nous concevons régulièrement des packs thématiques exclusifs (packs de 2, 3 ou 4 livres) à prix réduits pour vous faire réaliser de réelles économies tout en enrichissant vos lectures."
        },
        {
          q: "Comment suivre ma commande ou contacter le service client ?",
          a: "Dès validation, notre équipe vous contacte sur WhatsApp avec les informations de suivi. Notre service client reste joignable 7 jours sur 7 pour vous accompagner."
        }
      ]
    }
  }

  const baseUrl = getBaseUrl()
  const pageUrl = `${baseUrl}/${locale}/collection/${seoSlug}`

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqList.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: t('BreadcrumbHome'),
        item: `${baseUrl}/${locale}`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: t('BreadcrumbCollections'),
        item: `${baseUrl}/${locale}/catalog`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: data.title,
        item: pageUrl,
      },
    ],
  }

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: data.title,
    description: data.description,
    url: pageUrl,
    numberOfItems: popularBooks.length,
    itemListElement: structuredBooks.map((book: any, index: number) => {
      const bookUrl = `${baseUrl}/${locale}/books/${book.id}`
      const rawImage = normalizeImage(book.image)
      const imageUrl = rawImage.startsWith('http') ? rawImage : `${baseUrl}${rawImage}`

      return {
        '@type': 'ListItem',
        position: index + 1,
        url: bookUrl,
        name: book.title,
        item: {
          '@type': 'Product',
          name: book.title,
          image: imageUrl,
          description: book.description ? book.description.substring(0, 160) : book.title,
          url: bookUrl,
          sku: book.id,
          brand: {
            '@type': 'Brand',
            name: 'Riwaya'
          },
          ...(book.isbn ? { isbn: book.isbn } : {}),
          offers: {
            '@type': 'Offer',
            priceCurrency: 'MAD',
            price: book.price,
            availability: book.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
            itemCondition: 'https://schema.org/NewCondition',
            seller: {
              '@type': 'Organization',
              name: 'Riwaya'
            },
            hasMerchantReturnPolicy: {
              '@type': 'MerchantReturnPolicy',
              applicableCountry: 'MA',
              returnPolicyCountry: 'MA',
              returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
              merchantReturnDays: 3,
              returnMethod: 'https://schema.org/ReturnByMail',
              returnFees: 'https://schema.org/FreeReturn',
              refundType: 'https://schema.org/FullRefund',
              merchantReturnLink: `${baseUrl}/${locale}/returns`
            },
            shippingDetails: {
              '@type': 'OfferShippingDetails',
              shippingRate: {
                '@type': 'MonetaryAmount',
                value: 35,
                currency: 'MAD'
              },
              shippingDestination: {
                '@type': 'DefinedRegion',
                addressCountry: 'MA'
              },
              deliveryTime: {
                '@type': 'ShippingDeliveryTime',
                handlingTime: {
                  '@type': 'QuantitativeValue',
                  minValue: 0,
                  maxValue: 1,
                  unitCode: 'DAY'
                },
                transitTime: {
                  '@type': 'QuantitativeValue',
                  minValue: 1,
                  maxValue: 3,
                  unitCode: 'DAY'
                }
              }
            }
          }
        }
      }
    }),
  }

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: data.title,
    description: data.description,
    url: pageUrl,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: popularBooks.length,
      itemListElement: structuredBooks.map((book: any, index: number) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: book.title,
        url: `${baseUrl}/${locale}/books/${book.id}`,
      })),
    },
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
      <Header />
      
      {/* Hero Section */}
      <section className="bg-black text-white pt-24 pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-500 via-black to-black"></div>
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-bold tracking-widest uppercase mb-6">
            <BookOpen className="w-4 h-4 text-pixio-yellow" />
            <span>Spécialité Riwaya</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black mb-6 leading-tight tracking-tight">
            {data.h1}
          </h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto font-medium">
            {data.intro}
          </p>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-8 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap justify-center gap-8 md:gap-16">
          <div className="flex items-center gap-3">
            <Truck className="w-6 h-6 text-black" />
            <span className="font-bold text-sm uppercase tracking-wider">{t('Delivery')}</span>
          </div>
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-black" />
            <span className="font-bold text-sm uppercase tracking-wider">{t('PaymentOnDelivery')}</span>
          </div>
          <div className="flex items-center gap-3">
            <Star className="w-6 h-6 text-black" />
            <span className="font-bold text-sm uppercase tracking-wider">{t('QualityGuaranteed')}</span>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-10 md:py-16">
        <nav aria-label="Breadcrumb" className="mb-8 flex flex-wrap items-center gap-2 text-sm text-gray-500">
          <Link href="/" className="hover:text-black">{t('BreadcrumbHome')}</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/catalog" className="hover:text-black">{t('BreadcrumbCollections')}</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="font-semibold text-gray-900" aria-current="page">{data.h1}</span>
        </nav>

        <div className="mb-8 flex flex-wrap items-center justify-center gap-2" aria-label="Language versions">
          <Languages className="h-4 w-4 text-gray-500" />
          {resolved.slugsByLocale.fr && <a href={`/fr/collection/${resolved.slugsByLocale.fr}`} hrefLang="fr" className={`rounded-full px-3 py-1 text-xs font-bold ${locale === 'fr' ? 'bg-black text-white' : 'bg-white text-gray-700'}`}>Français</a>}
          {resolved.slugsByLocale.ar && <a href={`/ar/collection/${resolved.slugsByLocale.ar}`} hrefLang="ar" className={`rounded-full px-3 py-1 text-xs font-bold ${locale === 'ar' ? 'bg-black text-white' : 'bg-white text-gray-700'}`}>العربية</a>}
          {resolved.slugsByLocale.en && <a href={`/en/collection/${resolved.slugsByLocale.en}`} hrefLang="en" className={`rounded-full px-3 py-1 text-xs font-bold ${locale === 'en' ? 'bg-black text-white' : 'bg-white text-gray-700'}`}>English</a>}
        </div>

        {/* Featured Products */}
        <div className="mb-16">
          <h2 className="text-3xl font-black text-center mb-8">{t('SelectionOfTheWeek')}</h2>
          <p className="-mt-5 mb-8 text-center text-sm font-medium text-gray-500">
            {locale === 'ar' ? `${popularBooks.length} كتاباً في هذه المجموعة` : locale === 'en' ? `${popularBooks.length} books in this collection` : `${popularBooks.length} livres dans cette collection`}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {popularBooks.map((book: any) => (
              <BookCard key={book.id} {...book} />
            ))}
          </div>
          <div className="text-center mt-10">
            <Link 
              href="/catalog" 
              className="inline-flex px-8 py-4 bg-black text-white font-bold rounded-full hover:bg-gray-800 transition-colors"
            >
              {t('ViewCatalog')}
            </Link>
          </div>
        </div>

        {/* FAQ Section */}
        {faqList && faqList.length > 0 && (
          <section className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-3xl font-black mb-8">{t('FAQ')}</h2>
            <div className="space-y-4">
              {faqList.map((faq: any, index: number) => (
                <details key={index} className="group bg-gray-50/70 hover:bg-gray-50 rounded-2xl p-5 border border-gray-100 transition-all">
                  <summary className="flex items-center justify-between cursor-pointer list-none font-bold text-base md:text-lg text-gray-900 select-none">
                    <span>{faq.q}</span>
                    <ChevronDown className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform duration-200 shrink-0 ml-4 rtl:mr-4 rtl:ml-0" />
                  </summary>
                  <p className="mt-4 pt-3 border-t border-gray-200/60 text-gray-600 leading-relaxed text-sm md:text-base">
                    {faq.a}
                  </p>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* Collapsed SEO Content (Why Choose Us & Guarantees) */}
        <details className="group mt-16 bg-white p-6 md:p-10 rounded-3xl shadow-sm border border-gray-100 transition-all">
          <summary className="flex items-center justify-between cursor-pointer list-none select-none">
            <h2 className="text-xl md:text-2xl font-black text-black m-0">{t('WhyChooseUs')}</h2>
            <div className="flex items-center gap-2 text-xs md:text-sm font-bold text-gray-500 group-hover:text-black transition-colors">
              <span className="group-open:hidden">{locale === 'ar' ? 'عرض المزيد' : locale === 'en' ? 'Show more' : 'En savoir plus'}</span>
              <span className="hidden group-open:inline">{locale === 'ar' ? 'عرض أقل' : locale === 'en' ? 'Show less' : 'Voir moins'}</span>
              <ChevronDown className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform duration-200" />
            </div>
          </summary>
          <article className="prose prose-lg max-w-none prose-headings:font-black prose-headings:text-black prose-p:text-gray-600 mt-6 pt-6 border-t border-gray-100">
            <div dangerouslySetInnerHTML={{ __html: data.categoryText?.replace(/\n/g, '<br />') || '' }}></div>
            <p className="mt-4">{t('BrowseCollection')}</p>
            <p className="mt-4">{t('Mission1')} <strong>{data.keyword}</strong> {t('Mission2')}</p>
            
            <div className="bg-pixio-cream p-6 rounded-2xl mt-8 border border-yellow-100">
              <h3 className="flex items-center gap-2 mt-0 font-bold text-black">
                <CheckCircle2 className="text-pixio-yellow w-6 h-6 flex-shrink-0" />
                <span>{t('Guarantee')}</span>
              </h3>
              <p className="mb-0 text-gray-700">{t('GuaranteeText')}</p>
            </div>
          </article>
        </details>
      </main>
      
      <Footer />
    </div>
  )
}
