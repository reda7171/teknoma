import { Link } from '@/i18n/routing'
import { Smartphone, Laptop, ArrowUpRight, Cpu, Sparkles, Headphones, Zap, ShieldCheck, Truck, HeadphonesIcon } from 'lucide-react'
import { getPetContent } from '@/lib/pet-content'
import PetFAQ from './PetFAQ'
import PetHelpBanner from './PetHelpBanner'

export function HomeWorlds({ locale }: { locale: string }) {
  const t = getPetContent(locale)
  return (
    <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8">
      <div className="mb-8 max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-wider text-[#1976D2]">Tekno Store</p>
        <h2 className="mt-2 font-sans font-black text-2xl sm:text-3xl md:text-4xl text-[#1A1C1F]">{t.worlds}</h2>
        <p className="mt-2 text-xs sm:text-sm leading-6 text-gray-500">{t.worldsText}</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {[
          { icon: Smartphone, title: t.catWorld, text: t.catText, category: 'Smartphones', border: 'border-blue-100 hover:border-[#1976D2]' },
          { icon: Laptop, title: t.dogWorld, text: t.dogText, category: 'PC Portables', border: 'border-gray-200 hover:border-[#75C300]' }
        ].map(({ icon: Icon, title, text, category, border }) => (
          <Link
            href={'/products?category=' + encodeURIComponent(category)}
            key={category}
            className={`group relative isolate flex min-h-64 items-end overflow-hidden rounded-3xl p-7 sm:p-9 bg-white border shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${border}`}
          >
            <Icon
              aria-hidden="true"
              className="absolute end-6 top-8 -z-10 h-36 w-36 stroke-[0.8] text-gray-100 group-hover:scale-110 group-hover:text-gray-200/80 transition-all duration-500"
            />
            <div className="max-w-[85%] sm:max-w-[75%]">
              <span className="rounded-full bg-gray-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#1976D2]">
                Univers Tech
              </span>
              <h3 className="mt-3 font-sans font-black text-2xl sm:text-3xl leading-tight text-[#1A1C1F]">{title}</h3>
              <p className="mt-2 text-xs sm:text-sm leading-6 text-gray-600">{text}</p>
              <span className="mt-4 inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#1A1C1F] group-hover:text-[#1976D2] transition-colors">
                {t.discover}
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

export function HomeMore({ locale }: { locale: string }) {
  const t = getPetContent(locale)
  const icons = [Laptop, Headphones, Zap]
  const valuesIcons = [ShieldCheck, Truck, HeadphonesIcon]

  return (
    <>
      {/* ROUTINES / USAGES TECH */}
      <section className="border-y border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 md:py-16">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-wider text-[#1976D2]">{t.explore}</p>
              <h2 className="mt-2 font-sans font-black text-2xl sm:text-3xl md:text-4xl text-[#1A1C1F]">{t.routine}</h2>
              <p className="mt-2 text-xs sm:text-sm leading-6 text-gray-500">{t.routineText}</p>
            </div>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#1976D2] hover:underline"
            >
              {t.shop}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {t.routines.map((item, i) => {
              const Icon = icons[i]
              return (
                <Link
                  key={item.category}
                  href={'/products?category=' + encodeURIComponent(item.category)}
                  className="group rounded-2xl border border-gray-200 bg-gray-50/50 p-6 sm:p-7 transition-all hover:bg-white hover:border-[#1976D2] hover:shadow-md"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white border border-gray-200 text-[#1976D2] shadow-xs group-hover:bg-[#75C300] group-hover:text-[#1A1C1F] transition-colors">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 font-sans font-bold text-lg text-[#1A1C1F]">{item.title}</h3>
                  <p className="mt-2 text-xs leading-6 text-gray-600">{item.text}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#1976D2] group-hover:underline">
                    {t.explore}
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* 3 STEPS ORDER PROCESS */}
      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 md:py-16">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-wider text-[#1976D2]">Processus Simple & Rapide</p>
          <h2 className="mt-2 font-sans font-black text-2xl sm:text-3xl md:text-4xl text-[#1A1C1F]">{t.stepsTitle}</h2>
          <p className="mt-2 text-xs sm:text-sm leading-6 text-gray-500">{t.stepsText}</p>
        </div>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {t.steps.map((step, i) => (
            <article key={step.title} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#75C300]/15 font-sans font-black text-lg text-[#477700]">
                0{i + 1}
              </span>
              <h3 className="mt-4 font-sans font-bold text-base text-[#1A1C1F]">{step.title}</h3>
              <p className="mt-2 text-xs leading-6 text-gray-600">{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* VALUES SECTION */}
      <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8">
        <div className="grid gap-10 rounded-3xl bg-white border border-gray-200 p-7 sm:p-10 lg:grid-cols-[0.85fr_1.15fr] lg:p-14 shadow-sm">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#75C300]/15 text-[#477700] mb-6">
              <Cpu className="h-6 w-6" />
            </div>
            <h2 className="font-sans font-black text-3xl sm:text-4xl leading-tight text-[#1A1C1F]">{t.valuesTitle}</h2>
            <p className="mt-4 text-xs sm:text-sm leading-7 text-gray-600">{t.valuesText}</p>
            <Link
              href="/about"
              className="inline-flex items-center gap-2.5 rounded-full bg-[#1A1C1F] px-6 py-3 text-xs font-bold text-white hover:bg-[#75C300] hover:text-[#1A1C1F] transition mt-7"
            >
              {t.about}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="space-y-6">
            {t.values.map((item, i) => {
              const Icon = valuesIcons[i]
              return (
                <article key={item.title} className="flex gap-4 p-3 rounded-2xl hover:bg-gray-50 transition">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1976D2]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-sans font-bold text-sm text-[#1A1C1F]">{item.title}</h3>
                    <p className="mt-1 text-xs leading-6 text-gray-600">{item.text}</p>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      {/* FAQ PREVIEW */}
      <section className="mx-auto grid max-w-7xl gap-8 px-5 pb-14 sm:px-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#1976D2]">FAQ & Questions</p>
          <h2 className="mt-2 max-w-md font-sans font-black text-2xl sm:text-3xl md:text-4xl leading-tight text-[#1A1C1F]">
            {t.faqTitle}
          </h2>
          <p className="mt-3 text-xs sm:text-sm leading-6 text-gray-500">{t.faqIntro}</p>
          <Link
            href="/faq"
            className="mt-6 inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#1976D2] hover:underline"
          >
            {t.faq}
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
          <PetFAQ locale={locale} limit={4} />
        </div>
      </section>

      <PetHelpBanner locale={locale} />
    </>
  )
}
