import Link from 'next/link'
import { getPopularQuoteTags } from '@/lib/actions/quotes'
import HeaderWithUser from '@/components/HeaderWithUser'
import Footer from '@/components/FooterWithFeatures'
import { Hash, Quote, Sparkles } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export default async function QuotesLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: Promise<{ locale: string }>
}) {
    const { locale } = await params
    const t = await getTranslations({ locale, namespace: 'QuotesPage' })
    const popularTags = await getPopularQuoteTags()

    // Étiquettes localisées pour les tags par défaut
    const defaultTags = [
        { value: 'best', label: t('TagLabels.best') },
        { value: 'love', label: t('TagLabels.love') },
        { value: 'inspirational', label: t('TagLabels.inspirational') },
        { value: 'funny', label: t('TagLabels.funny') },
        { value: 'motivational', label: t('TagLabels.motivational') },
        { value: 'life', label: t('TagLabels.life') },
        { value: 'friends', label: t('TagLabels.friends') },
        { value: 'positive', label: t('TagLabels.positive') },
    ]

    const usedTagValues = popularTags.map((pt) => pt.name)
    defaultTags.forEach((dt) => {
        if (!usedTagValues.includes(dt.value)) usedTagValues.push(dt.value)
    })

    const allTags = usedTagValues.slice(0, 12).map((val) => {
        const found = defaultTags.find((d) => d.value === val)
        return { value: val, label: found?.label ?? val }
    })

    return (
        <div className="min-h-screen bg-[#FAFAF9]" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
            <HeaderWithUser />

            {/* ── HERO BANNER ── */}
            <section className="relative bg-white border-b border-slate-100 overflow-hidden py-16 md:py-24">
                {/* Dot grid */}
                <div
                    className="absolute inset-0 opacity-[0.035] pointer-events-none"
                    style={{
                        backgroundImage: 'radial-gradient(circle at 1px 1px, #0f172a 1px, transparent 0)',
                        backgroundSize: '28px 28px',
                    }}
                />
                <div className="absolute -top-24 -right-24 w-[500px] h-[500px] bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] bg-rose-400/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-full text-xs font-bold mb-6 uppercase tracking-wider">
                        <Sparkles className="w-3.5 h-3.5" />
                        {t('HeroBadge')}
                    </div>

                    {/* Grand guillemet décoratif */}
                    <div className="text-[120px] md:text-[180px] leading-none font-serif text-slate-100 select-none -mb-12 md:-mb-20">
                        "
                    </div>

                    <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight mb-5 leading-tight">
                        {t('HeroTitle1')}{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-rose-500">
                            {t('HeroTitleHighlight')}
                        </span>{' '}
                        {t('HeroTitle2')}
                    </h1>
                    <p className="text-slate-500 text-lg max-w-xl mx-auto">{t('HeroDesc')}</p>
                </div>

                {/* Barre de tags */}
                <div className="relative z-10 max-w-5xl mx-auto px-4 mt-10 flex flex-wrap justify-center gap-2.5">
                    <Link
                        href={`/${locale}/quotes`}
                        className="px-4 py-1.5 text-sm font-semibold bg-slate-900 text-white rounded-full hover:bg-amber-500 transition-colors"
                    >
                        {t('AllTag')}
                    </Link>
                    {allTags.map((tag) => (
                        <Link
                            key={tag.value}
                            href={`/${locale}/quotes/tag/${tag.value}`}
                            className="px-4 py-1.5 text-sm font-semibold bg-white border border-slate-200 text-slate-600 rounded-full hover:bg-amber-500 hover:text-white hover:border-amber-500 transition-all capitalize"
                        >
                            {tag.label}
                        </Link>
                    ))}
                </div>
            </section>

            {/* ── CONTENU + SIDEBAR ── */}
            <div className="max-w-7xl mx-auto px-4 py-14 flex flex-col lg:flex-row gap-10">
                <main className="flex-1 min-w-0">{children}</main>

                <aside className="w-full lg:w-72 flex-shrink-0 space-y-6">
                    {/* Menu tags */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
                            <Hash className="w-4 h-4 text-amber-500" />
                            <h2 className="font-bold text-slate-900">{t('BrowseByTag')}</h2>
                        </div>
                        <ul className="px-6 py-4 space-y-1">
                            <li>
                                <Link
                                    href={`/${locale}/quotes`}
                                    className="flex items-center gap-2 py-2 px-3 rounded-lg text-slate-700 font-medium hover:bg-amber-50 hover:text-amber-700 transition-colors text-sm"
                                >
                                    <Quote className="w-3.5 h-3.5" />
                                    {t('AllQuotes')}
                                </Link>
                            </li>
                            {allTags.map((tag) => (
                                <li key={tag.value}>
                                    <Link
                                        href={`/${locale}/quotes/tag/${tag.value}`}
                                        className="flex items-center gap-2 py-2 px-3 rounded-lg text-slate-600 hover:bg-amber-50 hover:text-amber-700 transition-colors text-sm"
                                    >
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                                        {tag.label} {t('TagQuotes')}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Bloc promo */}
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white relative overflow-hidden">
                        <div className="absolute -top-6 -right-6 w-24 h-24 bg-amber-400/20 rounded-full blur-xl" />
                        <div className="text-4xl font-serif mb-3 text-amber-300">"</div>
                        <p className="text-slate-300 text-sm leading-relaxed mb-4">{t('PromoQuote')}</p>
                        <Link
                            href={`/${locale}/books`}
                            className="inline-block px-4 py-2 bg-amber-400 text-slate-900 font-bold text-sm rounded-xl hover:bg-amber-300 transition-colors"
                        >
                            {t('PromoBtn')}
                        </Link>
                    </div>
                </aside>
            </div>

            <Footer />
        </div>
    )
}
