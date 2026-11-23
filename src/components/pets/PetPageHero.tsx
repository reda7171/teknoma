import { Link } from '@/i18n/routing'
import { ChevronRight, Cpu } from 'lucide-react'
import { getPetContent } from '@/lib/pet-content'

export default function PetPageHero({ locale, label, title, intro }: { locale: string; label: string; title: string; intro: string }) {
  const t = getPetContent(locale)
  return (
    <section className="relative overflow-hidden border-b border-gray-200 bg-white">
      <div className="relative mx-auto max-w-7xl px-5 py-10 sm:px-8 md:py-14">
        <nav aria-label={locale === 'ar' ? 'مسار التنقل' : locale === 'en' ? 'Breadcrumb' : 'Fil d’Ariane'} className="mb-6 flex items-center gap-2 text-xs text-gray-500">
          <Link href="/" className="hover:text-[#1976D2] transition-colors">{t.home}</Link>
          <ChevronRight className="h-3 w-3 rtl:rotate-180 text-gray-400" />
          <span aria-current="page" className="font-semibold text-[#1A1C1F]">{label}</span>
        </nav>
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1976D2]">
          <Cpu className="h-4 w-4 text-[#75C300]" />
          {label}
        </p>
        <h1 className="mt-4 max-w-3xl font-sans font-black text-3xl sm:text-4xl lg:text-5xl leading-tight text-[#1A1C1F]">{title}</h1>
        <p className="mt-4 max-w-2xl text-xs sm:text-sm leading-7 text-gray-600">{intro}</p>
      </div>
    </section>
  )
}
