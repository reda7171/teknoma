import { getBooks } from '@/lib/db/books'
import { getHomeSeoCategories } from '@/lib/actions/seo-categories'
import Image from 'next/image'
import { Link } from '@/i18n/routing'
import { Sparkles, ArrowRight, ArrowLeft } from 'lucide-react'

export default async function SeoCategoriesSection({ locale }: { locale: string }) {
  // Fetch dynamic categories configured to show on home
  const categories = await getHomeSeoCategories(locale)

  if (!categories || categories.length === 0) return null

  const categoriesWithBooks = await Promise.all(categories.map(async (cat) => {
    // If books are manually assigned, use them
    let books = cat.books.map(b => b.book)
    
    // If no books are manually assigned or less than 3, fallback to search query
    if (books.length < 3 && cat.searchQuery) {
      const searchBooks = await getBooks({ search: cat.searchQuery, limit: 3, active: true })
      // Use search books, but try to avoid duplicates if some are manually assigned
      books = [...books, ...searchBooks.filter(sb => !books.some(b => b.id === sb.id))].slice(0, 3)
    }

    return {
      ...cat,
      resolvedBooks: books
    }
  }))

  const validCategories = categoriesWithBooks.filter(c => c.resolvedBooks.length > 0)
  const isRtl = locale === 'ar'

  // Textes traduits statiquement pour éviter les problèmes de clés manquantes
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
          {validCategories.map((cat) => (
            <div 
              key={cat.id} 
              className={`relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br ${cat.colorGradient || 'from-[#4A25E1] to-[#7A5AF8]'} p-6 sm:p-10 flex flex-col sm:flex-row items-center gap-8 shadow-xl hover:shadow-2xl transition-all duration-300 group`}
            >
              {/* Text Side */}
              <div className={`flex-1 text-white z-20 ${isRtl ? 'text-right' : 'text-left'}`}>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-white/20 backdrop-blur-md">
                  <Sparkles className="w-4 h-4 text-purple-200" />
                  <span>{texts.badge}</span>
                </div>
                
                <h3 className="text-3xl font-black mb-3 leading-tight text-white drop-shadow-sm">
                  {cat.h1?.split(':')[0] || cat.title?.split('|')[0]}
                </h3>
                
                <p className="text-white/80 font-medium mb-8 line-clamp-2 text-sm sm:text-base leading-relaxed">
                  {cat.intro}
                </p>

                <Link 
                  href={`/collection/${cat.slug}` as any}
                  aria-label={`${texts.button} - ${cat.h1?.split(':')[0] || cat.title?.split('|')[0]}`}
                  className="inline-flex items-center gap-3 bg-white text-gray-900 px-6 py-3.5 rounded-full font-black text-sm hover:bg-gray-100 hover:scale-105 active:scale-95 transition-all shadow-lg"
                >
                  <span>{texts.button}</span>
                  {isRtl ? <ArrowLeft className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
                </Link>
              </div>

              {/* Images Side (Overlapping 3D effect) */}
              <div className="w-full sm:w-[220px] h-[260px] relative z-10 flex-shrink-0 mt-8 sm:mt-0 perspective-1000">
                {cat.resolvedBooks.map((book, idx) => {
                  if (!book) return null;
                  
                  // Positionnement 3D pour donner l'impression d'une pile
                  const isTop = idx === 0;
                  const isMiddle = idx === 1;
                  const isBottom = idx === 2;
                  
                  let zIndex = 30 - idx * 10;
                  
                  // Styles différents selon RTL ou LTR pour empiler dans le bon sens
                  let translateClass = '';
                  let rotateClass = '';
                  let scaleClass = '';

                  if (isTop) {
                    translateClass = isRtl ? 'translate-x-0' : 'translate-x-0';
                    rotateClass = isRtl ? 'rotate-y-[-5deg] rotate-z-[-2deg]' : 'rotate-y-[5deg] rotate-z-[2deg]';
                    scaleClass = 'scale-100';
                  } else if (isMiddle) {
                    translateClass = isRtl ? '-translate-x-8 translate-y-4' : 'translate-x-8 translate-y-4';
                    rotateClass = isRtl ? 'rotate-y-[-10deg] rotate-z-[2deg]' : 'rotate-y-[10deg] rotate-z-[-2deg]';
                    scaleClass = 'scale-95 opacity-90';
                  } else if (isBottom) {
                    translateClass = isRtl ? '-translate-x-16 translate-y-8' : 'translate-x-16 translate-y-8';
                    rotateClass = isRtl ? 'rotate-y-[-15deg] rotate-z-[4deg]' : 'rotate-y-[15deg] rotate-z-[-4deg]';
                    scaleClass = 'scale-90 opacity-70';
                  }

                  return (
                    <div 
                      key={book.id}
                      className={`absolute top-0 ${isRtl ? 'right-4' : 'left-4'} w-[160px] aspect-[2/3] rounded-lg shadow-2xl transition-all duration-500 ease-out 
                        ${translateClass} ${rotateClass} ${scaleClass} 
                        group-hover:-translate-y-4 group-hover:scale-105 group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]
                        border border-white/10`}
                      style={{ 
                        zIndex,
                        transformStyle: 'preserve-3d',
                        transitionDelay: `${idx * 50}ms`
                      }}
                    >
                      <Image
                        src={book.image}
                        alt={book.title}
                        fill
                        className="object-cover rounded-lg"
                        sizes="160px"
                      />
                      {/* Reflet sur le livre */}
                      <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
                    </div>
                  );
                })}
              </div>

              {/* Decorative Background Elements */}
              <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 rounded-full bg-black/10 blur-3xl pointer-events-none"></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
