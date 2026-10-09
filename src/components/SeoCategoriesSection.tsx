import { getBooks } from '@/lib/db/books'
import { getHomeSeoCategories } from '@/lib/actions/seo-categories'
import Image from 'next/image'
import { Link } from '@/i18n/routing'
import { Sparkles, ArrowRight, ArrowLeft } from 'lucide-react'
import { unstable_cache } from 'next/cache'

// Mise en cache des catégories SEO et de leurs couvertures (24h)
const getCachedHomeCategoriesWithBooks = unstable_cache(
  async (locale: string) => {
    const categories = await getHomeSeoCategories(locale)
    if (!categories || categories.length === 0) return []

    return Promise.all(
      categories.map(async (cat) => {
        let book = cat.books[0]?.book || null
        if (!book && cat.searchQuery) {
          const searchBooks = await getBooks({ search: cat.searchQuery, limit: 1, active: true })
          book = searchBooks[0] || null
        }

        // Remplacement des teintes violettes/mauves conformément à la charte
        let gradient = cat.colorGradient || 'from-[#0F766E] to-[#042F2E]'
        if (gradient.includes('#4A25E1') || gradient.includes('#9333EA') || gradient.includes('#7A5AF8') || gradient.includes('purple')) {
          gradient = 'from-[#0F766E] to-[#042F2E]'
        }

        return {
          id: cat.id,
          slug: cat.slug,
          h1: cat.h1?.split(':')[0] || cat.title?.split('|')[0] || '',
          intro: cat.intro || '',
          colorGradient: gradient,
          bookImage: book?.image || null,
          bookTitle: book?.title || null,
        }
      })
    )
  },
  ['home-seo-categories-v3'],
  { revalidate: 86400, tags: ['seo-categories'] }
)

export default async function SeoCategoriesSection({ locale }: { locale: string }) {
  const categories = await getCachedHomeCategoriesWithBooks(locale)

  if (!categories || categories.length === 0) return null

  const isRtl = locale === 'ar'

  const texts = {
    title: isRtl ? 'استكشف تشكيلاتنا المميزة' : (locale === 'en' ? 'Explore Our Curated Collections' : 'Découvrez nos Collections'),
    badge: isRtl ? 'اكتشف التشكيلة' : (locale === 'en' ? 'Discover Selection' : 'Découvrir la Sélection'),
    button: isRtl ? 'استكشاف الباقة' : (locale === 'en' ? 'Explore Bundle' : 'Explorer la sélection')
  }

  return (
    <section className="py-16 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-black text-center mb-12 text-gray-900">
          {texts.title}
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${cat.colorGradient} p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 shadow-md hover:shadow-xl transition-all duration-300 group`}
            >
              {/* Text Side */}
              <div className={`flex-1 text-white z-10 ${isRtl ? 'text-right' : 'text-left'}`}>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-bold uppercase tracking-wider mb-3 border border-white/20">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>{texts.badge}</span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-black mb-2 leading-tight text-white">
                  {cat.h1}
                </h3>

                <p className="text-white/80 font-medium mb-6 line-clamp-2 text-sm sm:text-base leading-relaxed">
                  {cat.intro}
                </p>

                <Link
                  href={`/collection/${cat.slug}` as any}
                  aria-label={`${texts.button} - ${cat.h1}`}
                  className="inline-flex items-center gap-2 bg-white text-gray-900 px-5 py-2.5 rounded-full font-black text-sm hover:bg-gray-100 hover:scale-105 active:scale-95 transition-all shadow-md"
                >
                  <span>{texts.button}</span>
                  {isRtl ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                </Link>
              </div>

              {/* Cover Image Side (1 image nette sans 3D lourd ni blur) */}
              {cat.bookImage && (
                <div className="w-[120px] sm:w-[150px] aspect-[2/3] relative flex-shrink-0 shadow-xl rounded-xl overflow-hidden group-hover:-translate-y-1 transition-transform duration-300 border border-white/20 bg-black/10">
                  <Image
                    src={cat.bookImage}
                    alt={cat.bookTitle || cat.h1}
                    fill
                    loading="lazy"
                    sizes="150px"
                    className="object-cover"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
