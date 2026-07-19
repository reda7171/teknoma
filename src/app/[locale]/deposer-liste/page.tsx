import Header from '@/components/HeaderWithUser'
import Footer from '@/components/Footer'
import { CheckCircle2, Sparkles } from 'lucide-react'
import { Metadata } from 'next'
import DeposerListeForm from '@/components/DeposerListeForm'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    return {
        title: locale === 'ar' ? 'ضع قائمتك المدرسية | رواية' : locale === 'en' ? 'Drop your school list | Riwaya' : 'Déposer ma liste scolaire | Riwaya',
        description: locale === 'ar' ? 'ضع قائمتك المدرسية وسنتكفل بالباقي.' : locale === 'en' ? 'Drop your school list and we will take care of the rest.' : 'Déposez votre liste scolaire : on s\'occupe de tout ! Liste complète garantie.',
    }
}

export default async function DeposerListePage() {
    const t = await getTranslations('DeposerListe')
    
    return (
        <div className="min-h-screen bg-[#FDFBF7] overflow-hidden">
            <Header />
            
            <section 
                className="relative py-12 md:py-24 px-4 border-b border-gray-100 min-h-[calc(100vh-120px)] md:min-h-[calc(100vh-80px)] flex flex-col justify-center bg-cover bg-center"
                style={{ backgroundImage: "url('/images/back-to-school-bg.png')" }}
            >
                {/* Overlay pour la lisibilité */}
                <div className="absolute inset-0 bg-[#FDFBF7]/85 backdrop-blur-sm z-0"></div>

                <div className="max-w-4xl mx-auto text-center relative z-10 w-full">
                    <div className="inline-flex items-center gap-3 px-6 py-2 bg-black text-white rounded-full text-[10px] font-black uppercase tracking-[0.3em] mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <Sparkles className="w-3 h-3 text-[#10b981]" />
                        {t('tag')}
                    </div>
                    
                    <h1 className="text-5xl md:text-7xl font-black text-black tracking-tighter leading-tight mb-8" dangerouslySetInnerHTML={{ __html: t.raw('pageTitle') }}></h1>
                    
                    <div className="flex items-center justify-center gap-3 text-lg md:text-2xl font-bold text-gray-600 mb-16">
                        <CheckCircle2 className="w-8 h-8 text-[#10b981]" />
                        <p>{t('subtitle')}</p>
                    </div>

                    <div className="max-w-2xl mx-auto z-20 relative">
                        <DeposerListeForm />
                    </div>
                    
                    <div className="mt-8 md:mt-16 text-center animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
                        <p className="text-xl md:text-2xl font-black text-black leading-tight" dangerouslySetInnerHTML={{ __html: t.raw('teamMsg') }}></p>
                    </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute top-1/3 left-0 w-[500px] h-[500px] bg-[#10b981]/10 blur-[120px] -translate-y-1/2 -translate-x-1/2 rounded-full"></div>
                <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-teal-400/10 blur-[120px] translate-x-1/3 translate-y-1/3 rounded-full"></div>
            </section>

            {/* SEO Text Block */}
            <section className="py-12 px-4 bg-white border-b border-gray-100">
                <div className="max-w-4xl mx-auto text-center">
                    <p className="text-sm md:text-base text-gray-500 leading-relaxed font-medium">
                        {t('seoText')}
                    </p>
                </div>
            </section>

            <Footer />
        </div>
    )
}
