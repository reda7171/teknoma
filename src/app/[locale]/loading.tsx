import { Cpu } from 'lucide-react'

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center gap-4 bg-[#F0EFF2] text-[#1A1C1F]">
      <div className="relative flex items-center justify-center">
        <div className="h-20 w-20 animate-spin rounded-full border-4 border-gray-300 border-t-[#75C300]" />
        <Cpu className="absolute h-9 w-9 text-[#1976D2] animate-pulse" />
      </div>
      <div className="flex items-center gap-2">
        <span className="font-sans text-2xl font-black tracking-tight text-[#1A1C1F]">
          Tekno Store
        </span>
        <span className="inline-block h-2 w-2 rounded-full bg-[#75C300] animate-ping" />
      </div>
      <p className="text-xs font-semibold text-gray-500 tracking-wider uppercase">Chargement en cours…</p>
    </div>
  )
}
