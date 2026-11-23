import Header from '@/components/pets/PetHeader'
import Footer from '@/components/pets/PetFooter'
import PetPageHero from '@/components/pets/PetPageHero'
import PetHelpBanner from '@/components/pets/PetHelpBanner'
import { getPetCopy } from '@/lib/pets'
import { getPetContent } from '@/lib/pet-content'
import { Link } from '@/i18n/routing'
import { ShieldCheck, HeartHandshake, Sparkles, ArrowUpRight, Info } from 'lucide-react'
import type { Metadata } from 'next'
export async function generateMetadata({params}:{params:Promise<{locale:string}>}):Promise<Metadata>{const c=getPetCopy((await params).locale);return {title:{absolute:c.services+' | Tekno Store'},description:c.serviceText}}
export default async function Services({params}:{params:Promise<{locale:string}>}) {
  const {locale}=await params, c=getPetCopy(locale), t=getPetContent(locale)
  return <><Header /><main id="main-content" className="pets-store bg-[#F0EFF2] text-[#1A1C1F]">
    <PetPageHero locale={locale} label={c.services} title={c.serviceTitle} intro={c.serviceText} />
    <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8"><div className="grid gap-5 md:grid-cols-3">{[{icon:ShieldCheck,title:c.grooming,text:c.groomingText,color: 'bg-blue-50 text-[#1976D2]'},{icon:HeartHandshake,title:c.advice,text:c.adviceText,color: 'bg-blue-50 text-[#1976D2]'},{icon:Sparkles,title:c.support,text:c.supportText,color: 'bg-blue-50 text-[#1976D2]'}].map(({icon:Icon,title,text,color},i) => <article key={title} className="flex flex-col rounded-[2rem] border border-gray-200 bg-white p-7 sm:p-9"><div className="flex items-center justify-between"><span className={'rounded-2xl p-4 '+color}><Icon className="h-8 w-8 stroke-[1.4]" /></span><span className="text-xs tracking-widest text-[#1976D2]">0{i+1}</span></div><h2 className="mt-8 font-sans font-bold text-3xl">{title}</h2><p className="mb-8 mt-4 text-sm leading-8 text-gray-500">{text}</p><Link href={'/contact?subject='+encodeURIComponent(title)} className="mt-auto inline-flex items-center gap-2 text-sm font-bold">{c.inquiry}<ArrowUpRight className="h-4 w-4" /></Link></article>)}</div><p className="mt-7 flex items-start gap-3 rounded-2xl bg-gray-100 p-5 text-sm leading-7 text-gray-500"><Info className="mt-1 h-4 w-4 shrink-0 text-[#1976D2]" />{c.serviceNote}</p></section>
    <section className="mx-auto max-w-7xl px-5 pb-12 sm:px-8"><h2 className="max-w-2xl font-sans font-bold text-3xl sm:text-4xl">{t.serviceStepsTitle}</h2><div className="mt-9 grid gap-7 md:grid-cols-3">{t.serviceSteps.map((step,i) => <article key={step.title} className="border-t border-gray-200 pt-6"><span className="font-sans font-bold text-3xl text-[#75C300]">0{i+1}</span><h3 className="mt-4 text-lg font-semibold">{step.title}</h3><p className="mt-3 text-sm leading-7 text-gray-500">{step.text}</p></article>)}</div></section>
    <PetHelpBanner locale={locale} />
  </main><Footer /></>
}
