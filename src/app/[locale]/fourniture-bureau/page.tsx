import { prisma } from '@/lib/prisma'
import Image from 'next/image'
import Link from 'next/link'
import HeaderWithUser from '@/components/HeaderWithUser'
import Footer from '@/components/FooterWithFeatures'
import { ShoppingCart, Star, Package, Filter, Search, Briefcase } from 'lucide-react'
import type { Metadata } from 'next'
import FournitureClient from './FournitureClient'

export const metadata: Metadata = {
    title: 'Fourniture Bureau | Riwaya',
    description: 'Découvrez notre sélection de fournitures de bureau : stylos, cahiers, organiseurs et tout ce qu\'il faut pour votre espace de travail.',
    openGraph: {
        title: 'Fourniture Bureau | Riwaya',
        description: 'Découvrez notre sélection de fournitures de bureau : stylos, cahiers, organiseurs et tout ce qu\'il faut pour votre espace de travail.',
        images: ['/og-image.jpg'],
    }
}

export default async function FournitureBureauPage() {
    /* Récupérer les produits catégorie FURNITURE depuis extra_products */
    const products = await prisma.extraProduct.findMany({
        where: { active: true },
        orderBy: { createdAt: 'desc' },
    })

    return (
        <div className="min-h-screen bg-[#FAFAF9]">
            <HeaderWithUser />

            {/* ──────── HERO ──────── */}
            <section className="relative bg-white border-b border-slate-100 py-16 overflow-hidden">
                <div className="absolute -top-20 -right-20 w-72 h-72 bg-amber-50 rounded-full blur-3xl opacity-70 pointer-events-none" />
                <div className="absolute -bottom-16 -left-16 w-60 h-60 bg-sky-50 rounded-full blur-3xl opacity-70 pointer-events-none" />

                <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center text-center md:text-left gap-10 relative z-10">
                    <div className="flex-1">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-100 text-amber-700 rounded-full text-xs sm:text-sm font-bold mb-4 sm:mb-5">
                            <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            Espace de travail
                        </div>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 leading-tight mb-4">
                            Fourniture <span className="text-amber-500">Bureau</span>
                        </h1>
                        <p className="text-slate-500 text-base sm:text-lg leading-relaxed max-w-lg mx-auto md:mx-0 mb-6 sm:mb-8">
                            Stylos, cahiers, organiseurs, classeurs — tout ce dont vous avez besoin pour un bureau productif et bien rangé.
                        </p>
                        <div className="flex justify-center md:justify-start gap-4 sm:gap-6 text-xs sm:text-sm font-bold text-slate-500">
                            <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" /> {products.length} produits</span>
                            <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" /> Livraison rapide</span>
                        </div>
                    </div>
                    <div className="flex-1 flex justify-center w-full">
                        <div className="w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 relative">
                            <div className="absolute inset-0 bg-amber-50 rounded-[2rem] sm:rounded-3xl rotate-6" />
                            <div className="absolute inset-0 bg-white rounded-[2rem] sm:rounded-3xl shadow-xl flex items-center justify-center">
                                <Briefcase className="w-20 h-20 sm:w-28 sm:h-28 text-amber-200" strokeWidth={1} />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ──────── PRODUITS ──────── */}
            <section className="max-w-6xl mx-auto px-4 py-14">
                <FournitureClient products={JSON.parse(JSON.stringify(products))} />
            </section>

            {/* ──────── CTA VIDE si pas de produits ──────── */}
            {products.length === 0 && (
                <div className="max-w-lg mx-auto px-4 py-20 text-center">
                    <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <Package className="w-10 h-10 text-amber-300" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 mb-3">Bientôt disponible</h2>
                    <p className="text-slate-500 mb-8">Notre catalogue de fournitures bureau arrive prochainement. Revenez nous voir très bientôt !</p>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all"
                    >
                        Retour à l'accueil
                    </Link>
                </div>
            )}

            <Footer />
        </div>
    )
}
