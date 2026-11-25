import PetHelpBanner from '@/components/pets/PetHelpBanner'
import { notFound } from 'next/navigation'
import HeaderWithUser from '@/components/HeaderWithUser'
import Footer from '@/components/Footer'
import ProductPurchase from '@/components/pets/ProductPurchase'
import ImageWithFallback from '@/components/ImageWithFallback'
import { prisma } from '@/lib/prisma'
import { getPetCopy, productTitle } from '@/lib/pets'
import { Link } from '@/i18n/routing'
import { getBaseUrl, getOgImageUrl } from '@/lib/utils'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ locale: string; id: string }> }): Promise<Metadata> {
  const { locale, id } = await params
  const p = await prisma.book.findFirst({ where: { id, active: true, status: 'APPROVED' } })
  if (!p) return { title: { absolute: 'Tekno Store' } }

  const title = productTitle(p, locale) + ' | Tekno Store'
  const description = (locale === 'fr' ? p.descriptionFr : locale === 'en' ? p.descriptionEn : p.description) || p.descriptionFr || p.description || ''
  const cleanDesc = description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160)

  let rawImg = p.image
  try {
    const v = JSON.parse(rawImg)
    if (Array.isArray(v)) rawImg = v[0] || ''
  } catch {}

  const baseUrl = getBaseUrl()
  const imgUrl = getOgImageUrl(rawImg, baseUrl, `${baseUrl}/og-image.jpg`)
  const productUrl = `${baseUrl}/${locale}/products/${id}`
  const ogLocale = locale === 'ar' ? 'ar_MA' : locale === 'en' ? 'en_MA' : 'fr_MA'

  return {
    title: { absolute: title },
    description: cleanDesc,
    alternates: {
      canonical: productUrl,
    },
    openGraph: {
      title,
      description: cleanDesc,
      url: productUrl,
      siteName: 'Tekno Store',
      locale: ogLocale,
      type: 'website',
      images: [
        {
          url: imgUrl,
          width: 800,
          height: 800,
          alt: title,
        }
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: cleanDesc,
      images: [imgUrl],
    }
  }
}

export default async function Product({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params
  const c = getPetCopy(locale)
  const p = await prisma.book.findFirst({ where: { id, active: true, status: 'APPROVED' } })
  if (!p) notFound()

  const title = productTitle(p, locale)
  const description = (locale === 'fr' ? p.descriptionFr : locale === 'en' ? p.descriptionEn : p.description) || p.descriptionFr || p.description
  let image = p.image
  try {
    const v = JSON.parse(image)
    if (Array.isArray(v)) image = v[0] || ''
  } catch {}

  return (
    <>
      <HeaderWithUser />
      <main id="main-content" className="pets-store bg-[#F0EFF2] px-5 py-10 text-[#1A1C1F]">
        <div className="mx-auto max-w-6xl">
          <Link href="/products" className="text-sm text-gray-500">
            ← {c.back}
          </Link>
          <div className="mt-8 grid items-start gap-10 md:grid-cols-2">
            <div className="relative aspect-square rounded-3xl border border-gray-200 bg-white">
              <ImageWithFallback src={image} alt={title} fallback="/logo.png" className="h-full w-full object-contain p-8" priority />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1976D2]">
                {p.category ? (
                  <Link href={'/products?category=' + encodeURIComponent(p.category)} className="hover:underline">
                    {p.category}
                  </Link>
                ) : null}
                {p.subCategory ? ' · ' + p.subCategory : ''}
              </p>
              <h1 className="mt-3 font-sans font-black text-4xl leading-tight">{title}</h1>
              <p className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                <span>{c.brand} :</span>
                <Link
                  href={'/products?brand=' + encodeURIComponent(p.author)}
                  className="inline-flex items-center rounded-full bg-blue-50 px-3 py-0.5 text-xs font-bold text-[#1976D2] hover:bg-blue-100 transition-colors"
                  title={`Voir tous les produits ${p.author}`}
                >
                  {p.author}
                </Link>
              </p>
              <p className="mt-7 text-3xl font-bold">
                {p.price.toFixed(2)} <span className="text-sm font-normal">MAD</span>
              </p>
              <p className="my-5 text-sm text-gray-500">{p.stock > 0 ? c.stock : c.out}</p>
              <ProductPurchase product={{ id: p.id, title, price: p.price, image, stock: p.stock }} locale={locale} />
              <div className="mt-8 border-t border-gray-200 pt-7">
                <h2 className="font-bold">{c.description}</h2>
                <p className="mt-4 whitespace-pre-line text-sm leading-8 text-gray-500">{description.replace(/<[^>]*>/g, ' ')}</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <PetHelpBanner locale={locale} />
      <Footer />
    </>
  )
}
