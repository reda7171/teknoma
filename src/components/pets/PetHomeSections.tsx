import { Link } from '@/i18n/routing'
import { Smartphone, Laptop, ArrowUpRight, Cpu, Sparkles, Headphones, Zap, ShieldCheck, Truck, HeadphonesIcon } from 'lucide-react'
import { getPetContent } from '@/lib/pet-content'
import PetFAQ from './PetFAQ'
import PetHelpBanner from './PetHelpBanner'

export function HomeWorlds({ locale }: { locale: string }) {
  const t = getPetContent(locale)
  return <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8">
    <div className="mb-8 max-w-2xl"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#82602d]">Tekno Store</p><h2 className="mt-3 font-serif text-3xl leading-tight md:text-4xl">{t.worlds}</h2><p className="mt-4 text-sm leading-7 text-[#56634e]">{t.worldsText}</p></div>
    <div className="grid gap-5 md:grid-cols-2">{[{icon:Smartphone,title:t.catWorld,text:t.catText,category:'Smartphones',color:'bg-[#e8ecdf]',shape:'bg-[#d4dcc6]'},{icon:Laptop,title:t.dogWorld,text:t.dogText,category:'PC Portables',color:'bg-[#f0e3ce]',shape:'bg-[#e7d0af]'}].map(({icon:Icon,title,text,category,color,shape}) => <Link href={'/products?category='+encodeURIComponent(category)} key={category} className={'group relative isolate flex min-h-72 items-end overflow-hidden rounded-[2rem] p-7 sm:p-9 '+color}>
      <span aria-hidden="true" className={'absolute -end-6 top-7 -z-10 h-52 w-52 rounded-full '+shape} /><Icon aria-hidden="true" className="absolute end-5 top-8 -z-10 h-36 w-36 stroke-[.75] text-[#17351d]/25 sm:end-10" />
      <div className="max-w-[80%] sm:max-w-[70%]"><h3 className="max-w-xs font-serif text-3xl leading-tight sm:text-4xl">{title}</h3><p className="mt-4 text-sm leading-7 text-[#47563f]">{text}</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-bold">{t.discover}<ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" /></span></div>
    </Link>)}</div>
  </section>
}

export function HomeMore({ locale }: { locale: string }) {
  const t = getPetContent(locale)
  const icons = [Laptop, Headphones, Zap], valuesIcons = [ShieldCheck, Truck, HeadphonesIcon]
  return <>
    <section className="border-y border-[#17351d]/10 bg-[#f7f0df]/60"><div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 md:py-20"><div className="flex flex-wrap items-end justify-between gap-6"><div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#82602d]">{t.explore}</p><h2 className="mt-3 font-serif text-3xl leading-tight md:text-4xl">{t.routine}</h2><p className="mt-4 text-sm leading-7 text-[#56634e]">{t.routineText}</p></div><Link href="/products" className="inline-flex items-center gap-2 text-sm font-bold">{t.shop}<ArrowUpRight className="h-4 w-4" /></Link></div>
      <div className="mt-9 grid gap-5 md:grid-cols-3">{t.routines.map((item,i) => {const Icon=icons[i];return <Link key={item.category} href={'/products?category='+encodeURIComponent(item.category)} className="group rounded-3xl border border-[#17351d]/10 bg-[#fffdf8] p-7 sm:p-8"><Icon className="h-9 w-9 stroke-[1.3] text-[#96703a]" /><h3 className="mt-7 font-serif text-2xl">{item.title}</h3><p className="mt-4 text-sm leading-7 text-[#56634e]">{item.text}</p><span className="mt-6 inline-flex items-center gap-2 text-xs font-bold">{t.explore}<ArrowUpRight className="h-4 w-4" /></span></Link>})}</div>
    </div></section>
    <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 md:py-20"><div className="max-w-2xl"><h2 className="font-serif text-3xl leading-tight md:text-4xl">{t.stepsTitle}</h2><p className="mt-4 text-sm leading-7 text-[#56634e]">{t.stepsText}</p></div><div className="mt-10 grid gap-8 md:grid-cols-3">{t.steps.map((step,i) => <article key={step.title} className="border-t border-[#17351d]/15 pt-6"><span className="font-serif text-4xl text-[#96703a]">0{i+1}</span><h3 className="mt-5 text-lg font-semibold">{step.title}</h3><p className="mt-3 text-sm leading-7 text-[#56634e]">{step.text}</p></article>)}</div></section>
    <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8"><div className="grid gap-10 rounded-[2rem] bg-[#e8ecdf] p-7 sm:p-10 lg:grid-cols-[.85fr_1.15fr] lg:p-14"><div><Cpu className="mb-6 h-9 w-9 stroke-[1.3] text-[#96703a]" /><h2 className="font-serif text-4xl leading-tight">{t.valuesTitle}</h2><p className="mt-5 text-sm leading-8 text-[#47563f]">{t.valuesText}</p><Link href="/about" className="pet-button mt-7">{t.about}<ArrowUpRight className="h-4 w-4" /></Link></div><div className="space-y-7">{t.values.map((item,i) => {const Icon=valuesIcons[i];return <article key={item.title} className="flex gap-5"><Icon className="mt-1 h-6 w-6 shrink-0 text-[#82602d]" /><div><h3 className="text-base font-semibold">{item.title}</h3><p className="mt-2 text-sm leading-7 text-[#47563f]">{item.text}</p></div></article>})}</div></div></section>
    <section className="mx-auto grid max-w-7xl gap-8 px-5 pb-10 sm:px-8 lg:grid-cols-[.8fr_1.2fr]"><div><p className="text-xs font-bold uppercase tracking-widest text-[#82602d]">FAQ</p><h2 className="mt-4 max-w-md font-serif text-3xl leading-tight md:text-4xl">{t.faqTitle}</h2><p className="mt-5 text-sm leading-7 text-[#56634e]">{t.faqIntro}</p><Link href="/faq" className="mt-6 inline-flex items-center gap-2 text-sm font-bold">{t.faq}<ArrowUpRight className="h-4 w-4" /></Link></div><PetFAQ locale={locale} limit={4} /></section>
    <PetHelpBanner locale={locale} />
  </>
}
