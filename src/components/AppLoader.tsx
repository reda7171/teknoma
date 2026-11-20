'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'

export default function AppLoader() {
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 400)
    return () => clearTimeout(timer)
  }, [])

  if (!loading) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-[99999] flex flex-col items-center justify-center gap-5 bg-[#0f172a] text-white">
      <div className="relative h-20 w-44 animate-pulse">
        <Image src="/logo.png" alt="Tekno Store" fill className="object-contain" priority />
      </div>
      <span className="text-xs font-semibold tracking-widest uppercase text-cyan-400">
        Chargement...
      </span>
    </div>
  )
}
