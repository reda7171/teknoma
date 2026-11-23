import { Link } from '@/i18n/routing'
import { ChevronRight, PawPrint } from 'lucide-react'
import { getPetContent } from '@/lib/pet-content'

export default function PetPageHero({ locale, label, title, intro }: { locale: string; label: string; title: string; intro: string }) {
  const t = getPetContent(locale)
  return <section className="relative overflow-hidden border-b border-[#17351d]/10 bg-[#f7f0df]">
    <div className="pointer-events-none absolute -end-12 -top-12 h-72 w-72 rounded-full border border-[#c59a55]/25" aria-hidden="true" />
    <div className="pointer-events-none absolute end-10 top-8 hidden h-56 w-56 rounded-full border border-[#c59a55]/20 md:block" aria-hidden="true" />
    <div className="relative mx-auto max-w-7xl px-5 py-10 sm:px-8 md:py-16">
      <nav aria-label={locale === 'ar' ? 'مسار التنقل' : locale === 'en' ? 'Breadcrumb' : 'Fil d’Ariane'} className="mb-10 flex items-center gap-2 text-xs text-[#56634e]">
        <Link href="/" className="hover:underline">{t.home}</Link><ChevronRight className="h-3 w-3 rtl:rotate-180" /><span aria-current="page">{label}</span>
      </nav>
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#82602d]"><PawPrint className="h-4 w-4" />{label}</p>
      <h1 className="mt-5 max-w-3xl font-serif text-4xl leading-[1.12] tracking-tight sm:text-5xl lg:text-6xl">{title}</h1>
      <p className="mt-5 max-w-2xl text-base leading-8 text-[#56634e]">{intro}</p>
    </div>
  </section>
}
