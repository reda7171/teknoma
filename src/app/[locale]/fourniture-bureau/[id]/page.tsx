import { prisma } from '@/lib/prisma'
import HeaderWithUser from '@/components/HeaderWithUser'
import Footer from '@/components/FooterWithFeatures'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, ShoppingCart, Truck, Shield, Package, CheckCircle2, Briefcase, HelpCircle, Heart, Star, Sparkles } from 'lucide-react'
import AddToCartButton from '@/components/AddToCartButton'
import WhatsAppOrderButton from '@/components/WhatsAppOrderButton'
import StickyBottomActions from '@/components/StickyBottomActions'
import FournitureMediaClient from '@/components/FournitureMediaClient'
import { getSetting } from '@/lib/actions/site-settings'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string; locale: string }>
}) {
    const { id } = await params
    const product = await prisma.extraProduct.findUnique({
        where: { id },
    })

    if (!product) {
        return {
            title: 'Produit introuvable | Riwaya',
        }
    }

    return {
        title: `${product.name} | Riwaya`,
        description: product.description || `Découvrez ${product.name} sur Riwaya. Livraison rapide au Maroc.`,
        openGraph: {
            title: `${product.name} | Riwaya`,
            description: product.description || `Découvrez ${product.name} sur Riwaya. Livraison rapide au Maroc.`,
            images: [product.image || '/og-image.jpg'],
        }
    }
}

export default async function ProductDetailPage({
    params,
}: {
    params: Promise<{ id: string; locale: string }>
}) {
    const { id } = await params
    const product = await prisma.extraProduct.findUnique({
        where: { id },
    })

    if (!product) {
        notFound()
    }

    // Récupérer les produits recommandés (autres que le produit actuel)
    const suggestedProducts = await prisma.extraProduct.findMany({
        where: { active: true, id: { not: id } },
        take: 4,
        orderBy: { createdAt: 'desc' }
    })

    const whatsappPhone = await getSetting('contact_whatsapp')
    const tAccessory = await getTranslations('AccessoryDetail')
    const tExtraProduct = await getTranslations('ExtraProductDetail')
    const tBook = await getTranslations('BookDetail')

    // Map to translate category via ExtraProductDetail
    const getCategoryLabel = (category: string) => {
        try {
            return tExtraProduct(`Categories.${category}` as any)
        } catch {
            return tExtraProduct('Categories.ACCESSORY')
        }
    }
    
    const categoryLabel = getCategoryLabel(product.category)

    // Spécifications techniques dynamiques ou basées sur la catégorie par défaut
    const productSpecs = [
        { label: tAccessory('Specs.Material'), value: product.materials || (product.category === 'BOOKMARK' ? tAccessory('Specs.BookmarkMaterial') : tAccessory('Specs.MaterialPremium')) },
        { label: tAccessory('Specs.Dimensions'), value: product.dimensions || (product.category === 'BOOKMARK' ? tAccessory('Specs.BookmarkDim') : tAccessory('Specs.Standard')) },
        { label: tAccessory('Specs.WeightCapacity'), value: product.weight || (product.category === 'USB' ? tAccessory('Specs.USBCapacity') : tAccessory('Specs.Standard')) },
        { label: tAccessory('Specs.Warranty'), value: product.warranty || tAccessory('Specs.RiwayaWarranty') },
    ]

    return (
        <div className="min-h-screen bg-[#FAFAF9]">
            <HeaderWithUser />

            <div className="max-w-6xl mx-auto px-4 py-12 pb-44 md:pb-24">
                {/* Bouton Retour */}
                <Link
                    href="/fourniture-bureau"
                    className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 mb-8 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>{tAccessory('BackToCatalog')}</span>
                </Link>

                {/* ──────── SECTION PRINCIPALE PRODUIT ──────── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 mb-20">
                    {/* Colonne Image / Galerie */}
                    <div className="lg:col-span-7">
                        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col gap-8">
                            <FournitureMediaClient 
                                productName={product.name}
                                mainImage={product.image}
                                images={(product.images as string[]) || []}
                                videos={(product.videos as string[]) || []}
                                stock={product.stock}
                            />

                            {/* Badges de confiance */}
                            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-100 text-center">
                                <div className="group cursor-pointer">
                                    <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-2 text-amber-600 group-hover:scale-110 transition-transform">
                                        <Truck className="w-5 h-5" />
                                    </div>
                                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{tAccessory('FastDelivery')}</p>
                                </div>
                                <div className="group cursor-pointer">
                                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-2 text-emerald-600 group-hover:scale-110 transition-transform">
                                        <Shield className="w-5 h-5" />
                                    </div>
                                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{tAccessory('CODPayment')}</p>
                                </div>
                                <div className="group cursor-pointer">
                                    <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center mx-auto mb-2 text-sky-600 group-hover:scale-110 transition-transform">
                                        <CheckCircle2 className="w-5 h-5" />
                                    </div>
                                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{tAccessory('QualityGuarantee')}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Colonne Infos */}
                    <div className="lg:col-span-5 flex flex-col justify-center gap-8">
                        <div>
                            {/* Catégorie */}
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold mb-4 shadow-sm">
                                <Briefcase className="w-3.5 h-3.5" />
                                {categoryLabel}
                            </div>

                            {/* Titre */}
                            <h1 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight mb-3">
                                {product.name}
                            </h1>
                            
                            {/* Note / Avis Simulés Premium */}
                            <div className="flex items-center gap-2 mb-2">
                                <div className="flex items-center text-amber-400">
                                    <Star className="w-4 h-4 fill-current" />
                                    <Star className="w-4 h-4 fill-current" />
                                    <Star className="w-4 h-4 fill-current" />
                                    <Star className="w-4 h-4 fill-current" />
                                    <Star className="w-4 h-4 fill-current" />
                                </div>
                                <span className="text-xs text-slate-500 font-bold">{tAccessory('ExcellentRating')}</span>
                            </div>
                        </div>

                        {/* Prix */}
                        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-baseline gap-2">
                            <span className="text-4xl font-black text-slate-900">{product.price.toFixed(2)}</span>
                            <span className="text-sm font-black text-slate-400 uppercase tracking-widest">{tAccessory('Currency')}</span>
                        </div>

                        {/* Boutons d'achat */}
                        <div className="space-y-4">
                            <StickyBottomActions>
                                {product.stock > 0 ? (
                                    <>
                                        <WhatsAppOrderButton
                                            title={product.name}
                                            price={product.price}
                                            phone={whatsappPhone || undefined}
                                            type="accessory"
                                            className="!rounded-2xl"
                                        />
                                        <AddToCartButton
                                            product={{
                                                id: product.id,
                                                title: product.name,
                                                price: product.price,
                                                image: product.image ?? '',
                                                type: 'ACCESSORY'
                                            }}
                                            className="w-full !py-4 md:!py-5 text-xs uppercase tracking-[0.2em] font-black !rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-300"
                                        />
                                    </>
                                ) : (
                                    <button
                                        disabled
                                        className="w-full py-4 bg-slate-100 text-slate-400 text-xs font-black uppercase tracking-widest rounded-2xl cursor-not-allowed text-center"
                                    >
                                        {tAccessory('OutOfStock')}
                                    </button>
                                )}
                            </StickyBottomActions>
                        </div>

                        {/* Description principale */}
                        {product.description && (
                            <div className="space-y-3">
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                                    <Package className="w-4 h-4 text-amber-500" />
                                    {tAccessory('ProductPresentation')}
                                </h3>
                                <div className="bg-white p-6 rounded-2xl border border-slate-100 text-slate-600 text-sm leading-relaxed whitespace-pre-line shadow-sm">
                                    {product.description}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ──────── NOUVELLE SECTION: SPÉCIFICATIONS TECHNIQUES ──────── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
                    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-500" />
                            {tAccessory('SpecsAndDimensions')}
                        </h3>
                        <dl className="space-y-4">
                            {productSpecs.map((spec, i) => (
                                <div key={i} className="flex justify-between items-center py-2.5 border-b border-slate-100 last:border-b-0">
                                    <dt className="text-xs font-bold text-slate-400">{spec.label}</dt>
                                    <dd className="text-xs font-black text-slate-800">{spec.value}</dd>
                                </div>
                            ))}
                            <div className="flex justify-between items-center py-2.5 border-b border-slate-100 last:border-b-0">
                                <dt className="text-xs font-bold text-slate-400">{tAccessory('Availability')}</dt>
                                <dd className="text-xs font-black text-emerald-600">{product.stock > 0 ? tAccessory('InStock') : tAccessory('OnOrder')}</dd>
                            </div>
                        </dl>
                    </div>

                    {/* ──────── NOUVELLE SECTION: LIVRAISON & SERVICE ──────── */}
                    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                            <HelpCircle className="w-4 h-4 text-amber-500" />
                            {tAccessory('DeliveryAndService')}
                        </h3>
                        <div className="space-y-4 text-slate-600 text-xs leading-relaxed">
                            <div className="flex gap-4">
                                <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0 text-amber-600 font-bold">1</div>
                                <p><strong>{tAccessory('CODTitle')}</strong> {tAccessory('CODDesc')}</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0 text-amber-600 font-bold">2</div>
                                <p><strong>{tAccessory('SpeedTitle')}</strong> {tAccessory('SpeedDesc')}</p>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0 text-amber-600 font-bold">3</div>
                                <p><strong>{tAccessory('GuaranteeTitle')}</strong> {tAccessory('GuaranteeDesc')}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ──────── SECTION: PRODUITS RECOMMANDÉS (CROSS-SELL) ──────── */}
                {suggestedProducts.length > 0 && (
                    <section className="border-t border-slate-200 pt-16">
                        <div className="flex items-center justify-between mb-10">
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">{tAccessory('YouMightAlsoLike')}</h2>
                            <Link href="/fourniture-bureau" className="text-xs font-black text-amber-600 hover:text-amber-700 bg-white border border-slate-100 shadow-sm px-5 py-2.5 rounded-xl transition-all">
                                {tAccessory('SeeAll')}
                            </Link>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                            {suggestedProducts.map(sProd => {
                                const sCategoryLabel = getCategoryLabel(sProd.category)
                                return (
                                    <div key={sProd.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all overflow-hidden flex flex-col">
                                        <Link href={`/fourniture-bureau/${sProd.id}`} className="flex flex-col flex-grow">
                                            <div className="relative aspect-video w-full bg-slate-50 border-b border-slate-50">
                                                {sProd.image ? (
                                                    <Image
                                                        src={sProd.image}
                                                        alt={sProd.name}
                                                        fill
                                                        className="object-cover"
                                                        unoptimized
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center">
                                                        <Package className="w-8 h-8 text-slate-200" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-4 flex flex-col flex-grow">
                                                <span className="text-[10px] font-bold text-amber-600 mb-1">{sCategoryLabel}</span>
                                                <h4 className="font-bold text-slate-800 text-xs leading-snug line-clamp-2 mb-2">{sProd.name}</h4>
                                                <span className="text-sm font-black text-slate-950 mt-auto">{sProd.price.toFixed(2)} DH</span>
                                            </div>
                                        </Link>
                                    </div>
                                )
                            })}
                        </div>
                    </section>
                )}
            </div>

            <Footer />
        </div>
    )
}
