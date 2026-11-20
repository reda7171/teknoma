import { Link } from '@/i18n/routing'
import { ArrowUpRight, HeartHandshake } from 'lucide-react'
import { getPetContent } from '@/lib/pet-content'

export default function PetHelpBanner({ locale }: { locale: string }) {
  const t = getPetContent(locale)
  return <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
    <div className="flex flex-col items-start justify-between gap-7 rounded-[2rem] border border-[#c59a55]/30 bg-[#f7f0df] p-7 md:flex-row md:items-center md:p-10">
      <div className="flex max-w-2xl items-start gap-5"><HeartHandshake className="mt-1 hidden h-10 w-10 shrink-0 text-[#96703a] sm:block" /><div><h2 className="font-serif text-3xl">{t.help}</h2><p className="mt-3 text-sm leading-7 text-[#56634e]">{t.helpText}</p></div></div>
      <Link href="/contact" className="pet-button shrink-0">{t.contactUs}<ArrowUpRight className="h-4 w-4" /></Link>
    </div>
  </section>
}
