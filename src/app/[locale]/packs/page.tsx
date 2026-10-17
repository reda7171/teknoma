import { getPacks } from '@/lib/db/packs'
import Header from '@/components/HeaderWithUser'
import Footer from '@/components/FooterWithFeatures'
import { prisma } from '@/lib/prisma'
import PacksListClient from '@/components/packs/PacksListClient'
import { getTranslations } from 'next-intl/server'
import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Link } from '@/i18n/routing'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params
    const t = await getTranslations({ locale, namespace: 'PacksPage' })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://riwaya.store'

    return {
        title: `${t('Title')} | Riwaya`,
        description: t('Subtitle'),
        openGraph: {
            title: `${t('Title')} | Riwaya`,
            description: t('Subtitle'),
            images: ['/images/og-packs.png'],
        },
        alternates: {
            canonical: `${baseUrl}/${locale}/packs`,
            languages: {
                'ar': `${baseUrl}/ar/packs`,
                'fr': `${baseUrl}/fr/packs`,
                'en': `${baseUrl}/en/packs`,
                'x-default': `${baseUrl}/ar/packs`,
            },
        },
    }
}


export const dynamic = 'force-dynamic'

export default async function PacksPage({
    params,
    searchParams,
}: {
    params: Promise<{ locale: string }>
    searchParams: Promise<{ custom?: string | string[] }>
}) {
    const [{ custom }, { locale }] = await Promise.all([searchParams, params]);
    if (custom === 'true') {
        redirect(`/${locale}/packs/create`)
    }

    return <PacksContent params={Promise.resolve({ locale })} />
}

export async function PacksContent({
    params,
    openCustomBuilder = false,
}: {
    params: Promise<{ locale: string }>
    openCustomBuilder?: boolean
}) {
    const { locale } = await params;
    const packs = await getPacks()
    const availableBooks = await prisma.book.findMany({
        where: {
            active: true,
            stock: { gt: 0 }
        },
        orderBy: {
            title: 'asc'
        }
    })

    const t = await getTranslations({ locale, namespace: 'PacksPage' })
    const tNav = await getTranslations({ locale, namespace: 'Navigation' })

    return (
        <div className="min-h-screen bg-pixio-cream">
            <Header />

            {/* Page Header */}
            <div className="bg-pixio-beige py-12 md:py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-black">
                    {/* Breadcrumbs */}
                    <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4 text-[10px] md:text-sm font-black uppercase tracking-[0.1em] md:tracking-[0.2em] text-gray-700 mb-6 md:mb-8">
                        <Link href="/" className="hover:text-black transition-colors whitespace-nowrap">{tNav('Home')}</Link>
                        <span className="text-gray-400">/</span>
                        <span className="text-black whitespace-nowrap">{t('Title')}</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-4 md:mb-6 tracking-tighter">
                        {t('Title')}<span className="text-gray-400">.</span>
                    </h1>
                    <p className="text-gray-700 font-bold uppercase tracking-[0.15em] md:tracking-[0.25em] text-xs md:text-base max-w-xl mx-auto leading-relaxed md:leading-loose">
                        {t('Subtitle')}
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 pb-32">
                <PacksListClient
                    packs={packs}
                    availableBooks={availableBooks}
                    openCustomBuilder={openCustomBuilder}
                />
            </div>
            <Footer />
        </div>
    )
}
