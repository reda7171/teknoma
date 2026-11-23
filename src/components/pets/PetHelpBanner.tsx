import { Link } from '@/i18n/routing'
import { ArrowUpRight, HeartHandshake } from 'lucide-react'
import { getPetContent } from '@/lib/pet-content'

export default function PetHelpBanner({ locale }: { locale: string }) {
  const t = getPetContent(locale)
  return (
    <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
      <div className="flex flex-col items-start justify-between gap-7 rounded-3xl border border-gray-200 bg-white p-7 md:flex-row md:items-center md:p-10 shadow-xs">
        <div className="flex max-w-2xl items-start gap-5">
          <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-2xl bg-[#75C300]/15 text-[#427000] shrink-0">
            <HeartHandshake className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-sans font-black text-2xl sm:text-3xl text-[#1A1C1F]">{t.help}</h2>
            <p className="mt-2 text-xs sm:text-sm leading-6 text-gray-500">{t.helpText}</p>
          </div>
        </div>
        <Link
          href="/contact"
          className="inline-flex items-center gap-2 rounded-full bg-[#75C300] px-6 py-3 text-xs sm:text-sm font-bold text-[#1A1C1F] hover:bg-[#68ad00] transition shrink-0"
        >
          {t.contactUs}
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  )
}
