'use client'

import { ArrowUp } from 'lucide-react'
import { useLocale } from 'next-intl'

export default function PetBackToTop() {
  const locale = useLocale()
  const label = locale === 'ar' ? 'الرجوع للأعلى' : locale === 'en' ? 'Back to top' : 'Haut de page'

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label={label}
      className="inline-flex items-center gap-2 rounded-full border border-gray-800 bg-gray-900/80 px-4 py-2 text-xs font-bold text-gray-300 transition-all hover:border-[#75C300] hover:bg-[#75C300] hover:text-[#1A1C1F] active:scale-95"
    >
      <ArrowUp className="h-3.5 w-3.5" />
      <span>{label}</span>
    </button>
  )
}
