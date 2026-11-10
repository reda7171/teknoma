import { getTranslations } from 'next-intl/server'
import Header from '@/components/HeaderWithUser'
import Footer from '@/components/Footer'
import { BookOpen, Heart, Users, Target, Sparkles, Award, Truck } from 'lucide-react'
import Image from 'next/image'
import { Metadata } from 'next'
import { getCanonicalAlternates } from '@/lib/seo/canonical'
import { getHomepageStats } from '@/lib/db/books'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    return {
        title: locale === 'ar' ? 'من نحن - مكتبة رواية بالمغرب' : locale === 'en' ? 'About Us - Riwaya Bookstore Morocco' : 'À propos - Librairie Riwaya au Maroc',
        description: locale === 'ar' ? 'تعرف على قصة مكتبة رواية بالمغرب: كتب بالعربية والفرنسية والإنجليزية، باقات قراءة، والدفع عند الاستلام في كافة المدن.' : locale === 'en' ? 'Discover the story of Riwaya, an online bookstore in Morocco offering curated books, reading packs, and nationwide Cash on Delivery.' : 'Découvrez l\'histoire de Riwaya, librairie en ligne au Maroc : livres en arabe, français et anglais, packs thématiques et paiement à la livraison.',
        alternates: getCanonicalAlternates(`/${locale}/about`, locale),
    }
}

export default async function AboutPage() {
    const [t, tAbout, stats] = await Promise.all([
        getTranslations('Common'),
        getTranslations('AboutPage'),
        getHomepageStats().catch(() => [0, 0, 0, 0, 0, 0] as [number, number, number, number, number, number]),
    ])
    const [, realReaders] = stats

    return (
        <div className="min-h-screen bg-pixio-cream overflow-hidden">
            <Header />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'AboutPage',
                        mainEntity: {
                            '@type': 'Organization',
                            name: 'Riwaya',
                            description: 'Riwaya est une librairie en ligne au Maroc dédiée aux livres en arabe, français et anglais avec packs thématiques et paiement à la livraison.',
                            foundingDate: '2023',
                            areaServed: {
                                '@type': 'Country',
                                name: 'Morocco'
                            },
                            ...(realReaders > 0 ? {
                                interactionStatistic: [
                                    {
                                        '@type': 'InteractionCounter',
                                        interactionType: 'https://schema.org/BuyAction',
                                        userInteractionCount: realReaders,
                                        name: 'Lecteurs'
                                    }
                                ]
                            } : {})
                        }
                    })
                }}
            />
            {/* Hero Section */}
            <section className="relative py-32 md:py-48 px-4 border-b border-gray-100">
                <div className="max-w-7xl mx-auto text-center relative z-10">
                    <div className="inline-flex items-center gap-3 px-6 py-2 bg-black text-white rounded-full text-[10px] font-black uppercase tracking-[0.3em] mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <Sparkles className="w-3 h-3 text-pixio-yellow" />
                        {tAbout('OurStory')}
                    </div>
                    <h1 className="text-6xl md:text-9xl font-black text-black tracking-tighter leading-none mb-4 italic">
                        Riwaya<span className="text-gray-200">.</span>
                    </h1>
                    <p className="max-w-2xl mx-auto text-lg md:text-2xl font-bold text-gray-400 uppercase tracking-tight leading-relaxed">
                        {tAbout('HeroDesc')}
                    </p>
                </div>
                {/* Decorative Elements */}
                <div className="absolute top-1/2 left-0 w-64 h-64 bg-pixio-yellow/20 blur-[120px] -translate-y-1/2 -translate-x-1/2"></div>
                <div className="absolute top-1/2 right-0 w-64 h-64 bg-pixio-pink/20 blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
            </section>

            {/* Mission & Vision */}
            <section className="py-32 px-4 bg-white">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
                        <div className="relative">
                            <div className="absolute -inset-4 bg-pixio-beige rounded-[3rem] -rotate-2"></div>
                            <div className="relative aspect-square rounded-[2.5rem] overflow-hidden shadow-2xl">
                                <div className="absolute inset-0 bg-black/5 z-10"></div>
                                <Image 
                                    src="/images/about-mission.png" 
                                    alt="Riwaya Mission" 
                                    fill 
                                    className="object-cover"
                                />
                            </div>
                        </div>
                        <div className="space-y-12">
                            <div className="space-y-6 text-center lg:text-left rtl:lg:text-right">
                                <h2 className="text-4xl md:text-6xl font-black text-black tracking-tighter">{tAbout('OurMission')}<span className="text-gray-200">.</span></h2>
                                <p className="text-sm font-bold text-gray-500 uppercase tracking-widest leading-loose">
                                    {tAbout('MissionDesc')}
                                </p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-center lg:text-left rtl:lg:text-right">
                                <div className="p-8 bg-gray-50 rounded-[2rem] border border-gray-100 group hover:bg-black transition-all duration-500">
                                    <Heart className="w-8 h-8 text-black mb-6 group-hover:text-pixio-pink transition-colors mx-auto lg:mx-0 rtl:lg:mr-0 rtl:lg:ml-auto" />
                                    <h3 className="text-xs font-black uppercase tracking-widest text-black group-hover:text-white mb-2">{tAbout('PassionTitle')}</h3>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight group-hover:text-gray-500">{tAbout('PassionDesc')}</p>
                                </div>
                                <div className="p-8 bg-gray-50 rounded-[2rem] border border-gray-100 group hover:bg-black transition-all duration-500">
                                    <Users className="w-8 h-8 text-black mb-6 group-hover:text-pixio-yellow transition-colors mx-auto lg:mx-0 rtl:lg:mr-0 rtl:lg:ml-auto" />
                                    <h3 className="text-xs font-black uppercase tracking-widest text-black group-hover:text-white mb-2">{tAbout('CommunityTitle')}</h3>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight group-hover:text-gray-500">{tAbout('CommunityDesc')}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Why Riwaya */}
            <section className="py-32 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-24">
                        <h2 className="text-4xl md:text-7xl font-black text-black tracking-tighter mb-6 italic">{tAbout('WhyRiwaya')}<span className="text-gray-200">.</span></h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        {[
                            { icon: Award, title: tAbout('QualityTitle'), desc: tAbout('QualityDesc') },
                            { icon: Truck, title: tAbout('DeliveryTitle'), desc: tAbout('DeliveryDesc') },
                            { icon: Target, title: tAbout('SupportTitle'), desc: tAbout('SupportDesc') }
                        ].map((item, i) => (
                            <div key={i} className="bg-white p-12 rounded-[3rem] border border-gray-100 shadow-xl shadow-black/5 text-center group hover:-translate-y-2 transition-all duration-500">
                                <div className="w-20 h-20 bg-pixio-cream rounded-3xl flex items-center justify-center mx-auto mb-8 group-hover:bg-black group-hover:rotate-6 transition-all duration-500">
                                    <item.icon className="w-10 h-10 text-black group-hover:text-white" />
                                </div>
                                <h3 className="text-sm font-black uppercase tracking-widest text-black mb-4">{item.title}</h3>
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-tight leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Location */}
            <section className="py-32 px-4 bg-white border-t border-gray-100">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl md:text-7xl font-black text-black tracking-tighter mb-4 italic">{tAbout('OurLocation')}<span className="text-gray-200">.</span></h2>
                        <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">{tAbout('VisitUs')}</p>
                    </div>
                    <div className="w-full h-[500px] rounded-[3rem] overflow-hidden shadow-2xl border border-gray-100 relative">
                        <iframe
                            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3307.1204143553496!2d-6.855548012368882!3d34.015119950525694!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xda76d9be04b2cdb%3A0xb283e75db60f9d37!2sRiwaya!5e0!3m2!1sfr!2sma!4v1778441297097!5m2!1sfr!2sma"
                            width="100%"
                            height="100%"
                            style={{ border: 0 }}
                            allowFullScreen
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            className="absolute inset-0"
                            title="Riwaya - Rabat, Maroc"
                        ></iframe>
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    )
}
