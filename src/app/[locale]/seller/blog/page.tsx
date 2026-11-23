import { getSellerPosts } from '@/lib/actions/seller/blog'
import { requireSellerSession } from '@/lib/server/seller-auth'
import { Link } from '@/i18n/routing'
import { Clock, PenLine } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import SellerBlogClient from './SellerBlogClient'

export default async function SellerBlogPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params
    await requireSellerSession(locale)
    const [t, posts] = await Promise.all([
        getTranslations('Seller.Blog'),
        getSellerPosts()
    ])

    return (
        <div className="max-w-5xl mx-auto space-y-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-black tracking-tighter uppercase">{t('Title')}</h1>
                    <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mt-2">{t('Subtitle')}</p>
                </div>
                <Link
                    href="/seller/blog/new"
                    className="bg-black text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-gray-800 transition-all active:scale-95 flex items-center gap-2"
                >
                    <PenLine className="w-4 h-4" />
                    {t('NewPost')}
                </Link>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6 flex items-start gap-4">
                <Clock className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-blue-700 leading-relaxed">{t('ApprovalNotice')}</p>
            </div>

            <SellerBlogClient initialPosts={posts} locale={locale} />
        </div>
    )
}
