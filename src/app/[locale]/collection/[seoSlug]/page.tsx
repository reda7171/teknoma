import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { getPopularBooks, getBooks } from '@/lib/db/books'
import Header from '@/components/HeaderWithUser'
import Footer from '@/components/Footer'
import BookCard from '@/components/BookCard'
import { CheckCircle2, Truck, Shield, Star, BookOpen } from 'lucide-react'
import { Link } from '@/i18n/routing'

import { getSeoCategoryBySlug } from '@/lib/actions/seo-categories'
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
  const { seoSlug } = await params
  const data = await getSeoCategoryBySlug(seoSlug)

  if (!data) return {}

  // Keywords enrichis selon le slug
  const extraKeywords = slugKeywordsMap[seoSlug] || []

  return {
    title: data.title,
    description: data.description,
    keywords: [
      data.keyword,
      ...extraKeywords,
      'maroc', 'livraison', 'paiement à la livraison', 'riwaya store', 'librairie maroc'
    ],
    openGraph: {
      title: data.title,
      description: data.description,
      type: 'website',
      siteName: 'Riwaya Store',
    },
    alternates: {
      canonical: `https://riwaya.store/fr/collection/${seoSlug}`,
    }
  }
}

export default async function SeoLandingPage({ params }: { params: Promise<{ seoSlug: string, locale: string }> }) {
  const { seoSlug, locale } = await params
  const data = await getSeoCategoryBySlug(seoSlug)
  const t = await getTranslations('SeoPage')

  if (!data || !data.isActive) {
    notFound()
  }

  // Obtenir les livres assignés manuellement d'abord
  let popularBooks = data.books?.map((b: any) => b.book) || []
  
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

  let faqList = []
  try {
    if (data.faq) faqList = JSON.parse(data.faq)
  } catch(e) {}

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
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
      <main className="max-w-4xl mx-auto px-4 py-16">
        <article className="prose prose-lg max-w-none prose-headings:font-black prose-headings:text-black prose-p:text-gray-600 mb-16 bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-gray-100">
          <h2>{t('WhyChooseUs')}</h2>
          <div dangerouslySetInnerHTML={{ __html: data.categoryText?.replace(/\n/g, '<br />') || '' }}></div>
          <p className="mt-4">{t('BrowseCollection')}</p>
          <p className="mt-4">{t('Mission1')} <strong>{data.keyword}</strong> {t('Mission2')}</p>
          
          <div className="bg-pixio-cream p-6 rounded-2xl mt-10 border border-yellow-100">
            <h3 className="flex items-center gap-2 mt-0">
              <CheckCircle2 className="text-pixio-yellow w-6 h-6" />
              <span>{t('Guarantee')}</span>
            </h3>
            <p className="mb-0 text-gray-700">{t('GuaranteeText')}</p>
          </div>
        </article>

        {/* Featured Products */}
        <div className="mb-16">
          <h2 className="text-3xl font-black text-center mb-8">{t('SelectionOfTheWeek')}</h2>
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

        {/* FAQ Schema */}
        {faqList && faqList.length > 0 && (
          <section className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-3xl font-black mb-8">{t('FAQ')}</h2>
            <div className="space-y-6">
              {faqList.map((faq: any, index: number) => (
                <div key={index}>
                  <h3 className="font-bold text-xl text-gray-900 mb-2">{faq.q}</h3>
                  <p className="text-gray-600">{faq.a}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
      
      <Footer />
    </div>
  )
}
