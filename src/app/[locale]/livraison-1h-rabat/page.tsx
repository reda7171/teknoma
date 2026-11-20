import { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import HeaderWithUser from '@/components/HeaderWithUser'
import Footer from '@/components/Footer'
import { Zap, Clock, MapPin, Truck } from 'lucide-react'
import InfiniteBookList from '@/components/InfiniteBookList'
import { getBooks } from '@/lib/db/books'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Livraison1hRabatPage' });

  return {
    title: t('Title'),
    description: t('Description'),
    keywords: ['livraison 1h rabat', 'livres rabat', 'librairie rabat', 'livraison rapide', 'livraison salé', 'livraison témara', 'Tekno Store Sonic']
  }
}

export default async function Livraison1hRabatPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Livraison1hRabatPage' });

  // Fetch initial books for lazy loading
  const initialFilters = { inStock: true, page: 1, limit: 12, active: true };
  const sonicBooks = await getBooks(initialFilters);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-outfit" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <HeaderWithUser locale={locale} />

      <main className="flex-grow pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Hero Section */}
          <div className="bg-white rounded-[2rem] p-8 md:p-16 shadow-sm border border-gray-100 mb-16 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-pixio-yellow/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>

            <div className="relative z-10 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-50 text-yellow-700 rounded-full text-xs font-bold uppercase tracking-wider mb-6 border border-yellow-200">
                <Zap className="w-4 h-4 fill-current" />
                {t('Badge')}
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-black leading-tight tracking-tight mb-8">
                {t('H1')}
              </h1>

              <div className="prose prose-lg text-gray-600 max-w-none">
                <p dangerouslySetInnerHTML={{ __html: t.raw('P1') }} />
                <p dangerouslySetInnerHTML={{ __html: t.raw('P2') }} />
                <p dangerouslySetInnerHTML={{ __html: t.raw('P3') }} />
              </div>

              <div className="flex flex-wrap gap-6 mt-10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-bold text-black">{t('Feature1Title')}</div>
                    <div className="text-sm text-gray-500">{t('Feature1Desc')}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-bold text-black">{t('Feature2Title')}</div>
                    <div className="text-sm text-gray-500">{t('Feature2Desc')}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                    <Truck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-bold text-black">{t('Feature3Title')}</div>
                    <div className="text-sm text-gray-500">{t('Feature3Desc')}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Books List Section */}
          <div className="mb-8">
            <h2 className="text-3xl font-black text-black tracking-tight flex items-center gap-3">
              <Zap className="w-8 h-8 text-pixio-yellow fill-pixio-yellow" />
              {t('CatalogTitle')}
            </h2>
            <p className="text-gray-500 mt-2 text-lg">{t('CatalogDesc')}</p>
          </div>

          <div className="-mx-4 sm:mx-0">
            <InfiniteBookList
              initialBooks={sonicBooks}
              initialFilters={initialFilters}
            />
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
