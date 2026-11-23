import { Cpu } from 'lucide-react'

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center gap-4 bg-[#fbf9f3] text-[#17351d]">
      <div className="relative flex items-center justify-center">
        <div className="h-20 w-20 animate-spin rounded-full border-4 border-blue-600/20 border-t-blue-600" />
        <Cpu className="absolute h-9 w-9 text-blue-600 animate-pulse" />
      </div>
      <div className="flex items-center gap-2">
        <span className="font-serif text-2xl font-bold tracking-tight text-[#17351d]">
          Tekno Store
        </span>
        <span className="inline-block h-2 w-2 rounded-full bg-blue-600 animate-ping" />
      </div>
      <p className="text-xs font-medium text-[#68705f] tracking-wider uppercase">Chargement en cours…</p>
    </div>
  )
}

