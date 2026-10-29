'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ShoppingCart, Search, Star, Package } from 'lucide-react'
import { useCartStore } from '@/store/cart'
import { Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'

type Product = {
    id: string
    name: string
    description: string | null
    price: number
    stock: number
    image: string | null
    category: string
}

export default function JeuxSocieteClient({ products, locale }: { products: Product[], locale: string }) {
    const t = useTranslations('BoardGamesPage')
    const [search, setSearch] = useState('')
    const [added, setAdded] = useState<string | null>(null)
    const addItem = useCartStore((s: any) => s.addItem)

    const filtered = products.filter(p => {
        return p.name.toLowerCase().includes(search.toLowerCase())
    })

    /* Ajouter au panier */
    function handleAdd(product: Product, e: React.MouseEvent) {
        e.preventDefault();
        addItem({
            id: product.id,
            type: 'ACCESSORY',
            title: product.name,
            price: product.price,
            image: product.image ?? '',
            quantity: 1,
        })
        setAdded(product.id)
        setTimeout(() => setAdded(null), 1500)
    }

    if (products.length === 0) return null

    return (
        <div dir={locale === 'ar' ? 'rtl' : 'ltr'}>
            {/* Barre recherche */}
            <div className="flex flex-col md:flex-row md:items-center justify-center gap-6 mb-12">
                <div className="relative w-full max-w-xl mx-auto group">
                    <Search className={`absolute ${locale === 'ar' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-amber-500 transition-colors`} />
                    <input
                        type="text"
                        placeholder={t('SearchPlaceholder')}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className={`w-full ${locale === 'ar' ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-4 bg-white border-2 border-slate-100 rounded-2xl text-base focus:border-amber-300 focus:ring-4 focus:ring-amber-500/10 outline-none shadow-sm transition-all font-medium`}
                    />
                </div>
            </div>

            {/* Grille produits */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {filtered.map(product => (
                    <div
                        key={product.id}
                        className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-10px_rgba(245,158,11,0.2)] hover:-translate-y-1.5 transition-all duration-300 overflow-hidden flex flex-col group relative"
                    >
                        {/* Interactive hover glow */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/0 to-orange-500/0 group-hover:from-amber-500/5 group-hover:to-orange-500/5 pointer-events-none transition-colors duration-500" />

                        <Link href={`/jeux-societe/${product.id}`} className="flex flex-col flex-grow z-10">
                            {/* Image */}
                            <div className="relative h-40 sm:h-52 bg-slate-50 w-full overflow-hidden p-4 flex items-center justify-center">
                                {(() => {
                                    let src = product.image;
                                    if (src) {
                                        try {
                                            const parsed = JSON.parse(src);
                                            if (Array.isArray(parsed) && parsed.length > 0) src = parsed[0];
                                        } catch (e) {}
                                    }
                                    if (!src) return (
                                        <div className="flex items-center justify-center h-full w-full bg-slate-100 rounded-2xl">
                                            <Package className="w-12 h-12 text-slate-300" />
                                        </div>
                                    );

                                    if (!src.startsWith('http') && !src.startsWith('/') && !src.startsWith('data:')) {
                                        if (src.startsWith('/9j/') || src.startsWith('iVBOR') || src.length > 500) {
                                            src = src.startsWith('iVBOR') ? `data:image/png;base64,${src}` : `data:image/jpeg;base64,${src}`;
                                        } else {
                                            src = `/uploads/images/${src}`;
                                        }
                                    }

                                    // Load images from production in dev mode
                                    if (process.env.NODE_ENV === 'development' && src.startsWith('/uploads')) {
                                        src = `https://petsunivers.ma${src}`;
                                    }

                                    return (
                                        <Image
                                            src={src}
                                            alt={product.name}
                                            fill
                                            className="object-contain p-4 group-hover:scale-110 transition-transform duration-700 ease-out drop-shadow-sm"
                                            unoptimized={process.env.NODE_ENV === 'development'}
                                        />
                                    );
                                })()}
                                {/* Badge stock */}
                                {product.stock <= 5 && product.stock > 0 && (
                                    <div className={`absolute top-3 ${locale === 'ar' ? 'right-3' : 'left-3'} px-2.5 py-1 bg-orange-100/90 backdrop-blur-sm border border-orange-200/50 text-orange-700 text-[10px] sm:text-xs font-black rounded-full shadow-sm`}>
                                        {t('OnlyNLeft', { stock: product.stock })}
                                    </div>
                                )}
                                {product.stock === 0 && (
                                    <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] flex items-center justify-center">
                                        <span className="text-xs sm:text-sm font-black text-slate-500 uppercase tracking-[0.2em]">{t('OutOfStock')}</span>
                                    </div>
                                )}
                            </div>

                            {/* Infos */}
                            <div className="p-4 sm:p-5 flex flex-col flex-grow relative z-10">
                                <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-tight mb-2 line-clamp-2 group-hover:text-amber-600 transition-colors">{product.name}</h3>
                                {product.description && (
                                    <p className="text-xs sm:text-sm text-slate-400 line-clamp-2 mb-3 leading-relaxed font-medium">{product.description}</p>
                                )}
                            </div>
                        </Link>

                        <div className="p-4 sm:p-5 pt-0 mt-auto flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0 z-10">
                            <span className="text-lg sm:text-xl font-black text-slate-900 drop-shadow-sm">{product.price.toFixed(2)} <span className="text-sm text-slate-500 font-bold">DH</span></span>
                            <button
                                onClick={(e) => handleAdd(product, e)}
                                disabled={product.stock === 0}
                                className={`w-full sm:w-auto px-4 py-2.5 rounded-xl sm:rounded-2xl transition-all duration-300 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-sm ${
                                    added === product.id
                                        ? 'bg-emerald-500 text-white shadow-emerald-500/30 -translate-y-1'
                                        : product.stock === 0
                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                                        : 'bg-slate-900 text-white hover:bg-amber-600 hover:shadow-amber-500/30 hover:-translate-y-0.5 active:scale-95'
                                }`}
                            >
                                <ShoppingCart className={`w-4 h-4 sm:w-4 sm:h-4 flex-shrink-0 ${added === product.id ? 'animate-bounce' : ''}`} />
                                <span className="truncate">{added === product.id ? t('Added') : t('Add')}</span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {filtered.length === 0 && (
                <div className="text-center py-20">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
                        <Search className="w-6 h-6 text-slate-400" />
                    </div>
                    <p className="text-slate-500 font-bold text-lg">
                        {t('NoGameFound', { search })}
                    </p>
                </div>
            )}
        </div>
    )
}
