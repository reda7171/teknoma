import { Link } from '@/i18n/routing'
import { Smartphone, ArrowUpRight } from 'lucide-react'
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

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-3xl border border-[#17351d]/10 bg-white p-3 transition hover:-translate-y-1 hover:shadow-lg">
      <Link
        href={'/products/' + product.id}
        className="relative aspect-square overflow-hidden rounded-2xl bg-stone-50 block"
      >
        {image ? (
          <ImageWithFallback
            src={image}
            alt={title}
            fallback="/logo.png"
            className="h-full w-full object-contain p-4 transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <Smartphone className="absolute inset-0 m-auto h-16 w-16 text-[#dcdcc7]" />
        )}
      </Link>

      <div className="flex flex-1 flex-col p-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {product.category && (
            <Link
              href={'/products?category=' + encodeURIComponent(product.category)}
              className="text-xs font-semibold text-[#426344] hover:underline"
            >
              {product.category}
            </Link>
          )}
          {product.author && (
            <Link
              href={'/products?brand=' + encodeURIComponent(product.author)}
              className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 hover:bg-blue-100 transition-colors"
              title={`Filtrer par marque : ${product.author}`}
            >
              {product.author}
            </Link>
          )}
        </div>

        <Link href={'/products/' + product.id} className="mt-2 block">
          <h3 className="text-base font-bold text-[#17351d] line-clamp-2 hover:text-blue-700 transition-colors">
            {title}
          </h3>
        </Link>

        <div className="mt-auto flex items-end justify-between gap-2 pt-5">
          <Link href={'/products/' + product.id} className="block">
            <p className="text-lg font-black text-[#17351d]">
              {product.price.toLocaleString('fr-FR')} <span className="text-xs font-normal">MAD</span>
            </p>
            <p className={'mt-1 text-xs font-semibold ' + (product.stock > 0 ? 'text-emerald-700' : 'text-stone-400')}>
              {product.stock > 0 ? c.stock : c.out}
            </p>
          </Link>
          <Link
            href={'/products/' + product.id}
            aria-label={title}
            className="h-8 w-8 rounded-full bg-[#f7f0df] p-1.5 text-[#284b2c] flex items-center justify-center transition-colors group-hover:bg-[#284b2c] group-hover:text-[#fffdf8]"
          >
            <ArrowUpRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </div>
  )
}

