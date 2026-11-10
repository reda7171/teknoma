import { getTranslations } from 'next-intl/server'
import Header from '@/components/HeaderWithUser'
import Footer from '@/components/FooterWithFeatures'
import TrackingClient from './TrackingClient'
import { Metadata } from 'next'
import { getCanonicalAlternates } from '@/lib/seo/canonical'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params
    const isAr = locale === 'ar'
    const isEn = locale === 'en'
    return {
        title: isAr ? 'تتبع طلبيتك' : isEn ? 'Track Your Order' : 'Suivi de commande',
        description: isAr
            ? 'تتبع حالة طلبيتك من الكتب في المغرب خطوة بخطوة برقم الطلب ورقم الهاتف.'
            : isEn
            ? 'Track your Riwaya book order status across Morocco step by step using your order ID and phone number.'
            : 'Suivez l\'état d\'expédition de votre commande de livres Riwaya au Maroc étape par étape.',
        alternates: getCanonicalAlternates(`/${locale}/tracking`, locale),
    }
}

export default async function TrackingPage() {
    const t = await getTranslations('Tracking')

    return (
        <div className="min-h-screen bg-pixio-cream flex flex-col">
            <Header />

            <main className="flex-grow container mx-auto px-4 py-4 sm:py-8 md:py-14 max-w-3xl">
                <div className="text-center mb-4 sm:mb-8 md:mb-12">
                    <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-black mb-2 sm:mb-4 tracking-tighter">{t('Title')}<span className="text-gray-300">.</span></h1>
                    <p className="text-gray-500 font-medium text-sm sm:text-base">{t('Subtitle')}</p>
                </div>

                <TrackingClient />
            </main>

            <Footer />
        </div>
    )
}
