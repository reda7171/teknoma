import { getTranslations } from 'next-intl/server'
import { prisma } from '@/lib/prisma'
import Header from '@/components/HeaderWithUser'
import Footer from '@/components/Footer'
import BookCard from '@/components/BookCard'
import { Truck, MapPin, Package, ShieldCheck } from 'lucide-react'
import Script from 'next/script'
import Link from 'next/link'
import { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ locale: string, city: string }> }): Promise<Metadata> {
    const { locale, city } = await params;
    const decodedCity = decodeURIComponent(city).replace(/-/g, ' ');
    const cityName = decodedCity.charAt(0).toUpperCase() + decodedCity.slice(1).toLowerCase();

    return {
        title: `Livraison de Livres à ${cityName} - Achat en Ligne | Riwaya`,
        description: `Achetez vos livres en ligne et profitez d'une livraison express à ${cityName}. Paiement à la livraison, large choix de romans et développement personnel au Maroc.`,
        keywords: `librairie ${cityName}, acheter livre ${cityName}, livraison livre ${cityName}, book store ${cityName}, romans ${cityName}, développement personnel ${cityName}`,
        alternates: {
            canonical: city.toLowerCase() === 'rabat' 
                ? `https://riwaya.store/${locale}/livraison-1h-rabat`
                : `https://riwaya.store/${locale}/livraison/${city}`,
        },
        openGraph: {
            title: `Livraison de Livres à ${cityName} - Achat en Ligne | Riwaya`,
            description: `Achetez vos livres en ligne et profitez d'une livraison express à ${cityName}. Paiement à la livraison, large choix de romans et développement personnel au Maroc.`,
            images: ['/og-image.jpg'],
        }
    }
}

export default async function DeliveryCityPage({ params }: { params: Promise<{ locale: string, city: string }> }) {
    const { locale, city } = await params;
    const t = await getTranslations('Common');
    
    // Format city name from URL (e.g. casablanca -> Casablanca)
    const decodedCity = decodeURIComponent(city).replace(/-/g, ' ');
    const cityName = decodedCity.charAt(0).toUpperCase() + decodedCity.slice(1).toLowerCase();

    // Fetch popular books
    const popularBooks = await prisma.book.findMany({
        where: { active: true },
        orderBy: [
            { stock: 'desc' },
            { createdAt: 'desc' }
        ],
        take: 8
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://riwaya.store';

    // Geo schema (LocalBusiness delivery area + DeliveryEvent placeholder logic)
    const jsonLd = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'LocalBusiness',
                '@id': `${baseUrl}/#organization`,
                name: 'Librairie Riwaya',
                url: baseUrl,
                image: `${baseUrl}/logo.png`,
                areaServed: {
                    '@type': 'City',
                    name: cityName,
                    containedInPlace: {
                        '@type': 'Country',
                        name: 'Morocco'
                    }
                },
                makesOffer: {
                    '@type': 'Offer',
                    itemOffered: {
                        '@type': 'Service',
                        name: `Livraison de livres à ${cityName}`
                    }
                }
            },
            {
                '@type': 'BreadcrumbList',
                itemListElement: [
                    {
                        '@type': 'ListItem',
                        position: 1,
                        name: 'Accueil',
                        item: `${baseUrl}/${locale}`
                    },
                    {
                        '@type': 'ListItem',
                        position: 2,
                        name: `Livraison à ${cityName}`,
                        item: `${baseUrl}/${locale}/livraison/${city}`
                    }
                ]
            }
        ]
    };

    return (
        <div className="min-h-screen bg-white">
            <Script id="geo-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
            <Header />

            {/* Hero Section Localisée */}
            <div className="pt-32 pb-20 bg-gray-50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-100/40 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <div className="inline-flex items-center gap-2 px-6 py-2 bg-white rounded-full text-emerald-600 text-[10px] font-black uppercase tracking-[0.2em] shadow-sm border border-gray-100 mb-8">
                        <MapPin className="w-4 h-4" />
                        <span>Zone de couverture active</span>
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black text-black tracking-tighter mb-6">
                        Livraison de livres à <br className="hidden md:block"/>
                        <span className="text-emerald-500 italic">{cityName}.</span>
                    </h1>
                    <p className="text-gray-500 max-w-2xl mx-auto text-lg font-medium">
                        Riwaya expédie vos livres favoris directement chez vous à {cityName}. 
                        Commandez aujourd'hui et payez à la réception en toute sécurité.
                    </p>
                </div>
            </div>

            {/* Features Delivery */}
            <div className="py-16 border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="flex flex-col items-center text-center space-y-4 p-8 rounded-[2rem] bg-gray-50/50 hover:bg-gray-50 transition-colors">
                            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-2">
                                <Truck className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-black text-black uppercase tracking-tight">Expédition Rapide</h3>
                            <p className="text-sm text-gray-500 font-medium">Nous expédions vos commandes vers {cityName} sous 24h à 48h selon le transporteur.</p>
                        </div>
                        <div className="flex flex-col items-center text-center space-y-4 p-8 rounded-[2rem] bg-gray-50/50 hover:bg-gray-50 transition-colors">
                            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-2">
                                <ShieldCheck className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-black text-black uppercase tracking-tight">Paiement Sécurisé</h3>
                            <p className="text-sm text-gray-500 font-medium">Achetez en toute confiance. Vous ne payez le livreur qu'une fois votre colis réceptionné à {cityName}.</p>
                        </div>
                        <div className="flex flex-col items-center text-center space-y-4 p-8 rounded-[2rem] bg-gray-50/50 hover:bg-gray-50 transition-colors">
                            <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mb-2">
                                <Package className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-black text-black uppercase tracking-tight">Grand Choix</h3>
                            <p className="text-sm text-gray-500 font-medium">Découvrez notre vaste catalogue de romans, livres islamiques et de développement personnel.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Popular Books Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
                <div className="flex justify-between items-end mb-12">
                    <div>
                        <h2 className="text-3xl md:text-5xl font-black text-black tracking-tighter">
                            Livres recommandés <br/><span className="text-gray-400">pour vous.</span>
                        </h2>
                    </div>
                    <Link href="/books" className="hidden md:inline-flex items-center justify-center px-8 py-4 bg-black text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-full hover:bg-gray-900 transition-colors">
                        Voir tout le catalogue
                    </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {popularBooks.map(book => (
                        <div key={book.id}>
                            <BookCard {...book} />
                        </div>
                    ))}
                </div>

                <div className="mt-12 text-center md:hidden">
                    <Link href="/books" className="inline-flex items-center justify-center px-8 py-4 bg-black text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-full w-full">
                        Voir tout le catalogue
                    </Link>
                </div>
            </div>

            <Footer />
        </div>
    );
}
