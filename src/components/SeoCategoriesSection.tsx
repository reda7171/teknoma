import { getBooks } from '@/lib/db/books'
import { seoPages } from '@/lib/seo-pages'
import Image from 'next/image'
import { Link } from '@/i18n/routing'
import { Sparkles, ArrowRight, ArrowLeft } from 'lucide-react'

// Utilise des couleurs vives et premium qui rappellent le screenshot
const gradients = [
  'from-[#4A25E1] to-[#7A5AF8]', // Deep Purple
  'from-[#0F766E] to-[#042F2E]', // Emerald Dark
  'from-[#E11D48] to-[#881337]', // Rose/Red
  'from-[#0369A1] to-[#0C4A6E]', // Ocean Blue
  'from-[#B45309] to-[#78350F]', // Amber/Orange
  'from-[#9333EA] to-[#581C87]', // Pink/Purple
  'from-[#334155] to-[#0F172A]', // Slate Dark
  'from-[#0284C7] to-[#0369A1]'  // Sky Blue
]

export default async function SeoCategoriesSection({ locale }: { locale: string }) {
  const newCategoriesFr = [
    'romans-arabes', 'romans-romantiques', 'romans-thriller-suspense', 
    'livres-developpement-personnel', 'livres-business-investissement', 
    'romans-marocains', 'idees-cadeaux-livres', 'livres-pas-chers'
  ]
  const newCategoriesAr = [
    'riwayat-arabia', 'riwayat-romansiya', 'riwayat-tachwiq',
    'kotob-tatwir-adat', 'kotob-mal-istithmar', 'riwayat-maghribia',
    'kotob-hadaya', 'kotob-arabia-mounasiba'
  ]
  const newCategoriesEn = [
    'arabic-novels', 'romantic-novels', 'thriller-suspense-novels',
    'self-help-books', 'business-investing-books', 'moroccan-novels',
    'book-gift-ideas', 'cheap-books'
  ]

  let keysToUse = newCategoriesFr
  if (locale === 'ar') keysToUse = newCategoriesAr
  if (locale === 'en') keysToUse = newCategoriesEn

  const pagesData = seoPages[locale] || seoPages['fr']

  const categoriesWithBooks = await Promise.all(keysToUse.map(async (key, index) => {
    const data = pagesData[key]
    if (!data) return null
    // On fetch jusqu'à 3 livres correspondant à la recherche de la catégorie
    const books = await getBooks({ search: data.searchQuery || '', limit: 3, active: true })
    
    return {
      key,
      ...data,
      books,
      color: gradients[index % gradients.length]
    }
  }))

  const validCategories = categoriesWithBooks.filter(Boolean)
  const isRtl = locale === 'ar'

  // Textes traduits statiquement pour éviter les problèmes de clés manquantes
  const texts = {
    title: isRtl ? 'استكشف تشكيلاتنا المميزة' : (locale === 'en' ? 'Explore Our Curated Collections' : 'Découvrez nos Sélections'),
    badge: isRtl ? 'اكتشف التشكيلة' : (locale === 'en' ? 'Discover Selection' : 'Découvrir la Sélection'),
    button: isRtl ? 'استكشاف الباقة' : (locale === 'en' ? 'Explore Bundle' : 'Explorer la sélection')
  }

  return (
    <section className="py-16 bg-gray-50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-black text-center mb-12 text-gray-900">
           {texts.title}
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          {validCategories.map((cat, i) => (
            <div 
              key={cat.key} 
              className={`relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br ${cat.color} p-6 sm:p-10 flex flex-col sm:flex-row items-center gap-8 shadow-xl hover:shadow-2xl transition-all duration-300 group`}
            >
              {/* Text Side */}
              <div className={`flex-1 text-white z-20 ${isRtl ? 'text-right' : 'text-left'}`}>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-white/20 backdrop-blur-md">
                  <Sparkles className="w-4 h-4 text-purple-200" />
                  <span>{texts.badge}</span>
                </div>
                
                <h3 className="text-3xl font-black mb-3 leading-tight text-white drop-shadow-sm">
                  {cat.h1.split(':')[0] || cat.title.split('|')[0]}
                </h3>
                
                <p className="text-white/80 font-medium mb-8 line-clamp-2 text-sm sm:text-base leading-relaxed">
                  {cat.intro}
                </p>

                <Link 
                  href={`/${cat.key}` as any}
                  className="inline-flex items-center gap-3 bg-white text-gray-900 px-6 py-3.5 rounded-full font-black text-sm hover:bg-gray-100 hover:scale-105 active:scale-95 transition-all shadow-lg"
                >
                  <span>{texts.button}</span>
                  {isRtl ? <ArrowLeft className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
                </Link>
              </div>

              {/* Images Side */}
              <div className="relative w-full sm:w-[220px] h-56 sm:h-72 flex-shrink-0 flex items-center justify-center mt-6 sm:mt-0 z-10 perspective-1000">
                {cat.books && cat.books.length > 0 ? (
                  cat.books.map((book: any, index: number) => {
                    // Positionnement : l'index 0 est au premier plan
                    const dir = isRtl ? -1 : 1
                    // Sur mobile, on les espace un peu moins pour ne pas déborder
                    const translateX = index * 2.5 * dir
                    const rotate = index * 6 * dir
                    const zIndex = 30 - index
                    
                    return (
                      <div 
                        key={book.id} 
                        className="absolute shadow-2xl transition-all duration-500 group-hover:-translate-y-4"
                        style={{
                          transform: `translateX(${translateX}rem) rotate(${rotate}deg) translateY(${index * 0.5}rem)`,
                          zIndex,
                        }}
                      >
                        <div className="w-28 h-40 sm:w-36 sm:h-52 rounded-md overflow-hidden ring-4 ring-white/20 relative bg-gray-100">
                           {book.image ? (
                             <Image 
                               src={book.image} 
                               alt={book.title}
                               fill
                               className="object-cover"
                               sizes="(max-width: 640px) 112px, 144px"
                             />
                           ) : (
                             <div className="w-full h-full bg-gray-200 flex items-center justify-center p-2 text-center">
                               <span className="text-gray-500 text-xs font-medium line-clamp-3">{book.title}</span>
                             </div>
                           )}
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="w-28 h-40 sm:w-36 sm:h-52 rounded-md border-2 border-dashed border-white/30 flex items-center justify-center backdrop-blur-sm">
                    <span className="text-white/70 text-sm font-medium text-center px-2">Bientôt disponible</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
