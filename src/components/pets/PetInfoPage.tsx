import Header from './PetHeader'
import Footer from './PetFooter'
import PetPageHero from './PetPageHero'
import PetHelpBanner from './PetHelpBanner'
import { getPetContent, getPetInfo, type InfoPageKey } from '@/lib/pet-content'
import { Link } from '@/i18n/routing'
import { ArrowUpRight } from 'lucide-react'

export default function PetInfoPage({ locale, page }: { locale: string; page: InfoPageKey }) {
  const t = getPetContent(locale), info = getPetInfo(locale, page)
  return <><Header /><main id="main-content" className="pets-store bg-[#fffdf8] text-[#17351d]">
    <PetPageHero locale={locale} {...info} />
    <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 md:grid-cols-[220px_1fr] md:gap-16 md:py-16">
      <aside><nav aria-label={t.contents} className="rounded-2xl border border-[#17351d]/10 bg-white p-5 md:sticky md:top-8"><h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-[#82602d]">{t.contents}</h2><ol className="space-y-4">{info.sections.map((s, i) => <li key={s.title}><a href={'#section-' + i} className="flex gap-3 text-sm leading-6 hover:underline"><span className="text-[#96703a]">0{i + 1}</span>{s.title}</a></li>)}</ol></nav></aside>
      <article className="max-w-3xl space-y-10">{info.sections.map((s, i) => <section key={s.title} id={'section-' + i} className="scroll-mt-8 border-b border-[#17351d]/10 pb-10 last:border-0"><h2 className="font-serif text-2xl sm:text-3xl">{s.title}</h2><p className="mt-5 text-base leading-8 text-[#56634e]">{s.text}</p></section>)}
        {(page === 'privacy' || page === 'terms') && <a className="inline-flex items-center gap-2 text-sm underline underline-offset-4" href={page === 'privacy' ? 'https://www.cndp.ma/images/lois/Loi-09-08-Fr.pdf' : 'https://www.mcinet.gov.ma/fr/content/protection-consommateur/droits-garantis-aux-consommateurs'} target="_blank" rel="noopener noreferrer">{page === 'privacy' ? 'CNDP · Loi 09-08' : 'Loi 31-08 · Ministère de l’Industrie et du Commerce'}<ArrowUpRight className="h-4 w-4" /></a>}
        <Link href="/contact" className="pet-button">{t.contactUs}<ArrowUpRight className="h-4 w-4" /></Link>
      </article>
    </div>
    <PetHelpBanner locale={locale} />
  </main><Footer /></>
}
