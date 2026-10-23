import { Link } from '@/i18n/routing'
import { BookOpen, MapPin, User, Star, Sparkles, Navigation } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { getPrimaryImage } from '@/lib/utils/image'

// ... interfaces remain same ...
interface MarketUser {
    id: string
    fullName: string | null
    city: string | null
    image: string | null
    rating: number
}

interface MarketBook {
    id: string
    title: string
    author: string
    image: string | null
    condition: string
    exchangeType: string
    status: string
    createdAt: Date
    owner?: MarketUser | null
    distanceKm?: number
}

export default function MarketBookCard({ book, isSmartMatch, isBlurred }: { book: MarketBook; isSmartMatch?: boolean; isBlurred?: boolean }) {
    const t = useTranslations('Community.Market')
    const tbf = useTranslations('Community.BookForm')

    if (!book.owner) return null // Should not happen for market books

    const title = isBlurred ? "1 Livre à échanger" : book.title
    const author = isBlurred ? "Dans votre quartier" : book.author
    const ownerName = isBlurred ? "Lecteur local" : book.owner.fullName
    const CardWrapper = isBlurred ? 'div' : Link
    const cardHref = isBlurred ? undefined : `/community/market/${book.id}`

    return (
        <div className="bg-white rounded-2xl sm:rounded-[2rem] p-4 sm:p-5 border border-gray-100 shadow-sm relative group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full">
            {/* Owner Info (Top) */}
            <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden border border-gray-200 shrink-0">
                        {book.owner.image && !isBlurred ? (
                            <img src={book.owner.image} alt={ownerName || 'User'} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-xs">
                                {ownerName?.[0] || 'U'}
                            </div>
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400 leading-none mb-1">{t('Owner')}</p>
                        <p className="text-xs font-bold text-black truncate max-w-[90px] xs:max-w-[120px] sm:max-w-[100px]">{ownerName}</p>
                    </div>
                </div>
                <div className="flex flex-col items-end rtl:items-start shrink-0">
                    <span className="flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-gray-500 bg-gray-50 px-2 py-0.5 sm:py-1 rounded-full mb-1">
                        <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" /> {book.owner.city}
                    </span>
                    {typeof book.distanceKm === 'number' && !isBlurred && (
                        <span className="flex items-center gap-1 text-[9px] sm:text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 sm:py-1 rounded-full mb-1 border border-emerald-100/60 shadow-xs">
                            <Navigation className="w-2.5 h-2.5 shrink-0 text-emerald-600" />
                            {book.distanceKm < 1 ? '< 1 km' : `à ${book.distanceKm} km`}
                        </span>
                    )}
                    <span className="flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-yellow-600 bg-yellow-50 px-2 py-0.5 sm:py-1 rounded-full">
                        <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 fill-yellow-500 shrink-0" /> {book.owner.rating.toFixed(1)}
                    </span>
                </div>
            </div>

            {/* Book Image */}
            <CardWrapper href={cardHref as any} className="block aspect-[2/3] bg-gray-50 rounded-xl sm:rounded-2xl mb-3 sm:mb-4 overflow-hidden relative shadow-inner group-hover:shadow-md transition-shadow">
                {book.image ? (
                    <img
                        src={getPrimaryImage(book.image)}
                        alt={isBlurred ? "Livre d'occasion à échanger au Maroc" : `Livre d'occasion : ${book.title}${book.author ? ` par ${book.author}` : ''} | Troc et échange au Maroc`}
                        className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${isBlurred ? 'blur-xl' : ''}`}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <BookOpen className="w-10 h-10 opacity-20" />
                    </div>
                )}

                {/* Condition Badge */}
                <div className="absolute top-2.5 ltr:right-2.5 rtl:left-2.5 flex flex-col items-end rtl:items-start gap-1 z-10">
                    <div className="bg-black/80 backdrop-blur-sm text-white px-2.5 sm:px-3 py-1 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest border border-white/20 shadow-lg">
                        {tbf(`Conditions.${book.condition}`)}
                    </div>
                    {isSmartMatch && (
                        <div className="bg-amber-500 text-white px-2.5 sm:px-3 py-1 rounded-full text-[8px] sm:text-[9px] font-black uppercase tracking-widest flex items-center gap-1 shadow-lg animate-pulse">
                            <Sparkles className="w-2.5 h-2.5 shrink-0" /> {t('Mutual')}
                        </div>
                    )}
                </div>
            </CardWrapper>

            {/* Book Info */}
            <div className="flex-grow flex flex-col justify-between relative">
                <div>
                    <CardWrapper href={cardHref as any}>
                        <h3 className="font-black text-base sm:text-lg text-black leading-tight mb-1 line-clamp-2 group-hover:text-amber-600 transition-colors" title={title}>
                            {title}
                        </h3>
                    </CardWrapper>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 sm:mb-4 line-clamp-1">{author}</p>
                </div>

                {isBlurred ? (
                    <div className="w-full bg-gray-100 text-gray-500 py-2.5 sm:py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-center shadow-inner cursor-not-allowed">
                        {t('OrderToUnlock')}
                    </div>
                ) : (
                    <Link
                        href={`/community/market/${book.id}`}
                        className="w-full bg-black text-white py-2.5 sm:py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-center shadow-lg hover:bg-gray-800 active:scale-95 transition-all"
                    >
                        {t('Request')}
                    </Link>
                )}
            </div>
        </div>
    )
}
