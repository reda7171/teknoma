import { Link } from '@/i18n/routing'
import { Smartphone, ArrowUpRight, CheckCircle2 } from 'lucide-react'
import ImageWithFallback from '@/components/ImageWithFallback'
import { getPetCopy, productTitle } from '@/lib/pets'

type Product = {
  id: string
  title: string
  titleFr?: string | null
  titleEn?: string | null
  author: string
  price: number
  image: string
  stock: number
  category?: string | null
}

export default function ProductCard({ product, locale }: { product: Product; locale: string }) {
  const c = getPetCopy(locale)
  const title = productTitle(product, locale)
  let image = product.image
  try {
    const parsed = JSON.parse(image)
    if (Array.isArray(parsed)) image = parsed[0] || ''
  } catch {}

  const inStock = product.stock > 0

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white p-3 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-[#1976D2]/30 hover:shadow-xl">
      {/* Product Image on Clean Light Container */}
      <Link
        href={'/products/' + product.id}
        className="relative aspect-square overflow-hidden rounded-xl bg-gray-50/70 block"
      >
        {image ? (
          <ImageWithFallback
            src={image}
            alt={title}
            fallback="/logo.png"
            className="h-full w-full object-contain p-3 transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <Smartphone className="absolute inset-0 m-auto h-14 w-14 text-gray-300" />
        )}

        {/* Stock pill in MicroMagma Lime Green */}
        <div className="absolute top-2 start-2">
          {inStock ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/95 backdrop-blur-xs px-2 py-0.5 text-[10px] font-bold text-[#4e8200] shadow-xs border border-gray-100">
              <span className="h-1.5 w-1.5 rounded-full bg-[#75C300] animate-pulse" />
              En stock
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
              Rupture
            </span>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-3">
        {/* Brand & Category Strip */}
        <div className="flex items-center justify-between gap-1.5 flex-wrap">
          {product.author && (
            <Link
              href={'/products?brand=' + encodeURIComponent(product.author)}
              className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-[#1976D2] hover:bg-blue-100 transition-colors uppercase tracking-wider"
              title={`Filtrer par marque : ${product.author}`}
            >
              {product.author}
            </Link>
          )}
          {product.category && (
            <Link
              href={'/products?category=' + encodeURIComponent(product.category)}
              className="text-[11px] font-medium text-gray-500 hover:text-[#1976D2] transition-colors"
            >
              {product.category}
            </Link>
          )}
        </div>

        {/* Product Title */}
        <Link href={'/products/' + product.id} className="mt-2 block">
          <h3 className="text-sm font-bold text-[#1A1C1F] line-clamp-2 leading-snug hover:text-[#1976D2] transition-colors">
            {title}
          </h3>
        </Link>

        {/* Price & Action Button (MicroMagma Style) */}
        <div className="mt-auto flex items-end justify-between gap-2 pt-4 border-t border-gray-50">
          <Link href={'/products/' + product.id} className="block">
            <p className="text-base font-black text-[#1A1C1F]">
              {product.price.toLocaleString('fr-FR')}{' '}
              <span className="text-xs font-bold text-[#1976D2]">DH</span>
            </p>
            <p className="text-[11px] text-gray-400 font-medium">Paiement à la livraison</p>
          </Link>

          <Link
            href={'/products/' + product.id}
            aria-label={title}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-[#1A1C1F] transition-all duration-200 group-hover:bg-[#75C300] group-hover:text-[#1A1C1F] group-hover:scale-105 cursor-pointer shadow-xs"
          >
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
