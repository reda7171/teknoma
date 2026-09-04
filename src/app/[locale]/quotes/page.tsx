import { getQuotes } from '@/lib/actions/quotes'
import QuoteCard from '@/components/quotes/QuoteCard'
import { Quote } from 'lucide-react'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params
    const t = await getTranslations({ locale, namespace: 'QuotesPage' })
    return {
        title: `${t('HeroBadge')} | Riwaya`,
        description: t('HeroDesc'),
    }
}

export default async function QuotesPage(props: { params: Promise<{ locale: string }> }) {
    const { locale } = await props.params
    const t = await getTranslations({ locale, namespace: 'QuotesPage' })
    const quotes = await getQuotes(undefined, undefined, locale)
    const activeQuotes = quotes.filter((q: any) => q.isActive)

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-black text-slate-900">{t('AllQuotes')}</h2>
                    <p className="text-slate-500 mt-1 text-sm">
                        {t('QuotesCount', { count: activeQuotes.length })}
                    </p>
                </div>
            </div>

            <div className="space-y-5">
                {activeQuotes.map((quote: any) => (
                    <QuoteCard key={quote.id} quote={quote} locale={locale} sourceLabel={t('SourceBook')} />
                ))}

                {activeQuotes.length === 0 && (
                    <div className="text-center py-24 bg-white rounded-3xl border border-slate-100">
                        <div className="text-8xl font-serif text-slate-100 mb-4">"</div>
                        <Quote className="w-12 h-12 mx-auto text-slate-200 mb-4" />
                        <h3 className="text-xl font-bold text-slate-900 mb-2">{t('EmptyTitle')}</h3>
                        <p className="text-slate-500 max-w-sm mx-auto">{t('EmptyDesc')}</p>
                    </div>
                )}
            </div>
        </div>
    )
}
