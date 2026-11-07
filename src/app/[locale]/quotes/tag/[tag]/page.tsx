import { getQuotes } from '@/lib/actions/quotes'
import QuoteCard from '@/components/quotes/QuoteCard'
import { Hash } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { getCanonicalAlternates } from '@/lib/seo/canonical'

export async function generateMetadata(props: { params: Promise<{ locale: string; tag: string }> }) {
    const { locale, tag } = await props.params
    let decoded = tag
    try {
        decoded = decodeURIComponent(tag)
    } catch {
        decoded = tag
    }
    const t = await getTranslations({ locale, namespace: 'QuotesPage' })
    return {
        title: `${decoded} ${t('TagQuotes')} | Riwaya`,
        description: `${t('HeroDesc')} — #${decoded}`,
        alternates: getCanonicalAlternates(`/quotes/tag/${encodeURIComponent(decoded)}`, locale),
    }
}

export default async function QuotesTagPage(props: {
    params: Promise<{ locale: string; tag: string }>
}) {
    const { locale, tag } = await props.params
    let decoded = tag
    try {
        decoded = decodeURIComponent(tag)
    } catch {
        decoded = tag
    }
    const t = await getTranslations({ locale, namespace: 'QuotesPage' })
    const quotes = await getQuotes(undefined, decoded).catch(() => [])
    const activeQuotes = quotes.filter((q: any) => q.isActive)

    return (
        <div>
            <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                    <Hash className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                    <h2 className="text-2xl font-black text-slate-900 capitalize">
                        {decoded} {t('TagQuotes')}
                    </h2>
                    <p className="text-slate-500 mt-0.5 text-sm">
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
                        <h3 className="text-xl font-bold text-slate-900 mb-2">{t('EmptyTagTitle')}</h3>
                        <p className="text-slate-500 max-w-sm mx-auto">{t('EmptyTagDesc')}</p>
                    </div>
                )}
            </div>
        </div>
    )
}
