import Image from 'next/image'
import { Smartphone, Laptop, Headphones, Watch, Sparkles, ShieldCheck } from 'lucide-react'

export default function PetArtwork() {
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
        <Headphones className="h-4 w-4 text-purple-400" />
        <span className="text-xs font-semibold">Audio Hi-Res</span>
      </div>
    </div>
  )
}
