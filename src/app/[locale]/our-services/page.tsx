import { getTranslations } from 'next-intl/server'
import Header from '@/components/HeaderWithUser'
import Footer from '@/components/Footer'
import { BookOpen, RefreshCw, PackageOpen, Truck, Store, MapPin } from 'lucide-react'
import Link from 'next/link'
import ServiceCard from '@/components/services/ServiceCard'

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
    const t = await getTranslations({ locale, namespace: 'OurServices' })
    return {
        title: `${t('title')} - Tekno Store`,
        description: t('subtitle'),
    }
}

export default async function OurServicesPage({ params: { locale } }: { params: { locale: string } }) {
    const t = await getTranslations('OurServices')

    const services = [
        {
            id: 'buy',
            icon: <BookOpen className="w-8 h-8 md:w-10 md:h-10 text-white" />,
            title: t('services.buy.title'),
            desc: t('services.buy.desc'),
            color: 'bg-blue-500',
            bg: 'bg-blue-50',
            link: '/books'
        },
        {
            id: 'exchange',
            icon: <RefreshCw className="w-8 h-8 md:w-10 md:h-10 text-white" />,
            title: t('services.exchange.title'),
            desc: t('services.exchange.desc'),
            color: 'bg-green-500',
            bg: 'bg-green-50',
            link: '/books'
        },
        {
            id: 'packs',
            icon: <PackageOpen className="w-8 h-8 md:w-10 md:h-10 text-white" />,
            title: t('services.packs.title'),
            desc: t('services.packs.desc'),
            color: 'bg-pixio-yellow',
            bg: 'bg-yellow-50',
            link: '/packs'
        },
        {
            id: 'cod',
            icon: <Truck className="w-8 h-8 md:w-10 md:h-10 text-white" />,
            title: t('services.cod.title'),
            desc: t('services.cod.desc'),
            color: 'bg-orange-500',
            bg: 'bg-orange-50',
            link: '/livraison'
        },
        {
            id: 'local',
            icon: <MapPin className="w-8 h-8 md:w-10 md:h-10 text-white" />,
            title: t('services.local.title'),
            desc: t('services.local.desc'),
            color: 'bg-pink-500',
            bg: 'bg-pink-50',
            link: '/contact'
        }
    ]

    return (
        <div className="min-h-screen bg-pixio-cream font-sans">
            <Header />

            <main className="max-w-7xl mx-auto px-4 py-16 md:py-32 pb-32 md:pb-32">
                {/* Hero Section */}
                <div className="text-center mb-16 md:mb-24 space-y-6">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-full text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] mb-4">
                        {t('title')}
                    </div>
                    <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-black tracking-tighter leading-tight italic max-w-4xl mx-auto">
                        {t('hero_title')}
                    </h1>
                    <p className="text-sm md:text-lg font-bold text-gray-500 uppercase tracking-tight max-w-2xl mx-auto">
                        {t('hero_desc')}
                    </p>
                </div>

                {/* Services Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-12">
                    {services.map((service) => (
                        <ServiceCard key={service.id} {...service} locale={locale} />
                    ))}
                </div>

                {/* Call To Action Banner */}
                <div className="mt-20 md:mt-32 bg-black rounded-[3rem] p-8 md:p-16 text-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-[url('/1.png')] bg-cover bg-center opacity-20 mix-blend-overlay group-hover:scale-105 transition-transform duration-1000"></div>
                    <div className="relative z-10 max-w-3xl mx-auto space-y-8">
                        <h3 className="text-3xl md:text-5xl font-black text-white tracking-tighter italic">
                            {locale === 'ar' ? 'جاهز لاستكشاف المزيد؟' : locale === 'fr' ? 'Prêt à explorer davantage ?' : 'Ready to explore more?'}
                        </h3>
                        <p className="text-gray-300 font-medium text-base md:text-lg">
                            {locale === 'ar' ? 'انضم إلى مجتمعنا وابدأ في الاستمتاع بجميع خدماتنا اليوم.' : locale === 'fr' ? 'Rejoignez notre communauté et commencez à profiter de tous nos services dès aujourd\'hui.' : 'Join our community and start enjoying all our services today.'}
                        </p>
                        <div className="pt-4">
                            <Link href={`/${locale}/books`} className="inline-flex items-center justify-center px-8 py-4 bg-pixio-yellow text-black font-black uppercase tracking-widest text-sm rounded-full shadow-lg hover:bg-white transition-all hover:-translate-y-1">
                                {locale === 'ar' ? 'تصفح الكتب' : locale === 'fr' ? 'Parcourir les livres' : 'Browse Books'}
                            </Link>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    )
}
