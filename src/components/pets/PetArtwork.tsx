import Image from 'next/image'
import Link from 'next/link'
import { Smartphone, Laptop, Headphones, ShieldCheck, Sparkles, ArrowUpRight } from 'lucide-react'
import { normalizeImage } from '@/lib/utils'

export interface PinnedProductItem {
  id: string
  title: string
  image: string
  price: number
  author?: string
}

interface PetArtworkProps {
  product?: PinnedProductItem | null
}

export default function PetArtwork({ product }: PetArtworkProps = {}) {
  if (product) {
    return (
      <div className="relative flex aspect-4/3 w-full flex-col items-center justify-between overflow-hidden rounded-2xl bg-linear-to-br from-[#0f172a] via-[#1e293b] to-[#0a0f1d] p-5 sm:p-6 text-white shadow-2xl group">
        {/* Ambient glow */}
        <div className="absolute -top-12 -left-12 h-44 w-44 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 h-44 w-44 rounded-full bg-blue-600/20 blur-3xl pointer-events-none" />

        {/* Top Badges */}
        <div className="relative z-10 w-full flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#75C300]/40 bg-[#75C300]/15 px-3 py-1 text-[11px] font-bold tracking-wide uppercase text-[#75C300] backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5" />
            Produit Vedette
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-[10px] font-semibold backdrop-blur-md">
            <ShieldCheck className="h-3 w-3 text-emerald-400" />
            Garantie 12M
          </span>
        </div>

        {/* Center Product Image */}
        <div className="relative z-10 my-auto flex flex-col items-center justify-center py-2">
          <div className="relative h-28 w-28 sm:h-36 sm:w-36 transition-transform duration-300 group-hover:scale-105">
            <Image
              src={normalizeImage(product.image)}
              alt={product.title}
              fill
              className="object-contain drop-shadow-[0_15px_25px_rgba(0,0,0,0.5)]"
              priority
              sizes="(max-width: 640px) 112px, 144px"
            />
          </div>
        </div>

        {/* Bottom Details & CTA */}
        <div className="relative z-10 w-full rounded-xl bg-white/10 border border-white/10 p-3 backdrop-blur-md flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs sm:text-sm font-bold text-white truncate">{product.title}</p>
            <p className="text-[11px] text-gray-300 truncate">{product.author || 'Tekno Store'}</p>
          </div>
          <Link
            href={`/products/${product.id}`}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-[#75C300] px-3 py-1.5 text-xs font-bold text-[#1A1C1F] hover:bg-[#68ad00] transition-colors"
          >
            <span>{product.price} DH</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex aspect-4/3 w-full items-center justify-center overflow-hidden rounded-2xl bg-linear-to-br from-[#0f172a] via-[#1e293b] to-[#0a0f1d] p-6 text-white shadow-2xl">
      {/* Background ambient glow */}
      <div className="absolute -top-12 -left-12 h-44 w-44 rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="absolute -bottom-12 -right-12 h-44 w-44 rounded-full bg-blue-600/20 blur-3xl" />

      {/* Center Logo */}
      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="relative mb-3 h-28 w-28 sm:h-36 sm:w-36">
          <Image
            src="/logo.png"
            alt="Tekno Store Maroc"
            fill
            className="object-contain drop-shadow-[0_10px_20px_rgba(0,180,255,0.3)]"
            priority
          />
        </div>
        <span className="rounded-full border border-cyan-400/30 bg-cyan-950/60 px-4 py-1 text-[11px] font-bold tracking-widest uppercase text-cyan-300 backdrop-blur-md">
          Smartphones · PC · Mac · Audio
        </span>
      </div>

      {/* Floating badges */}
      <div className="absolute top-4 left-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-1.5 backdrop-blur-md">
        <Smartphone className="h-4 w-4 text-cyan-400" />
        <span className="text-xs font-semibold">100% Neuf</span>
      </div>

      <div className="absolute top-4 right-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-1.5 backdrop-blur-md">
        <ShieldCheck className="h-4 w-4 text-emerald-400" />
        <span className="text-xs font-semibold">Garantie 12M</span>
      </div>

      <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-1.5 backdrop-blur-md">
        <Laptop className="h-4 w-4 text-blue-400" />
        <span className="text-xs font-semibold">Mac & PC Gamer</span>
      </div>

      <div className="absolute bottom-4 right-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-1.5 backdrop-blur-md">
        <Headphones className="h-4 w-4 text-[#75C300]" />
        <span className="text-xs font-semibold">Audio Hi-Res</span>
      </div>
    </div>
  )
}
