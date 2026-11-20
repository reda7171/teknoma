import PetHelpBanner from '@/components/pets/PetHelpBanner'
import HeaderWithUser from '@/components/HeaderWithUser'
import Footer from '@/components/Footer'
import ProductCard from '@/components/pets/ProductCard'
import { getPetCopy, PET_CATEGORIES } from '@/lib/pets'
import { prisma } from '@/lib/prisma'
import { Link } from '@/i18n/routing'
import { Cpu, Search, X } from 'lucide-react'
import type { Prisma } from '@prisma/client'
import type { Metadata } from 'next'

const POPULAR_BRANDS = ['Apple', 'Samsung', 'Xiaomi', 'Dell', 'HP', 'Lenovo']

export async function generateMetadata({
  params
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const c = getPetCopy((await params).locale)
  return { title: { absolute: c.catalog + ' | Tekno Store' }, description: c.intro }
}

export default async function Products({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ category?: string; brand?: string; search?: string; page?: string }>
}) {
  const { locale } = await params
  const c = getPetCopy(locale)
  const q = await searchParams
  const category = Object.hasOwn(PET_CATEGORIES, q.category || '') ? q.category : undefined
  const brand = q.brand?.trim()
  const search = q.search?.trim().slice(0, 150)

  const filters: Prisma.BookWhereInput[] = []

  if (category) {
    const subcats = PET_CATEGORIES[category as keyof typeof PET_CATEGORIES]
    filters.push({
      OR: [
        { category },
        { subCategory: { in: subcats } }
      ]
    })
  }

  if (brand) {
    filters.push({
      OR: [
        { author: { contains: brand } },
        { title: { contains: brand } },
        { titleFr: { contains: brand } },
        { titleEn: { contains: brand } },
        { subCategory: { contains: brand } }
      ]
    })
  }

  if (search) {
    filters.push({
      OR: [
        { title: { contains: search } },
        { titleFr: { contains: search } },
        { titleEn: { contains: search } },
        { author: { contains: search } }
      ]
    })
  }

  const where: Prisma.BookWhereInput = { active: true, status: 'APPROVED', AND: filters }
  const requested = Math.max(1, Math.floor(Number(q.page) || 1))
  const count = await prisma.book.count({ where })
  const pages = Math.max(1, Math.ceil(count / 24))
  const page = Math.min(requested, pages)
  const products = await prisma.book.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 24,
    skip: (page - 1) * 24
  })

  const labels = [c.cats, c.dogs, c.food, c.accessories, c.care, c.small]

  const buildUrl = (opts: { page?: number; category?: string; brand?: string }) => {
    const p = new URLSearchParams()
    const targetCat = opts.category !== undefined ? opts.category : category
    const targetBrand = opts.brand !== undefined ? opts.brand : brand
    const pageNum = opts.page !== undefined ? opts.page : 1

    if (targetCat) p.set('category', targetCat)
    if (targetBrand) p.set('brand', targetBrand)
    if (search) p.set('search', search)
    if (pageNum > 1) p.set('page', String(pageNum))

    const qs = p.toString()
    return '/products' + (qs ? '?' + qs : '')
  }

  const pageTitle = brand
    ? `${brand} — ${category ? labels[Object.keys(PET_CATEGORIES).indexOf(category)] : c.catalog}`
    : category
      ? labels[Object.keys(PET_CATEGORIES).indexOf(category)]
      : c.catalog

  return (
    <>
      <HeaderWithUser />
      <main id="main-content" className="pets-store min-h-[65vh] bg-[#fffdf8] px-5 py-12 text-[#17351d]">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-widest text-[#a07738]">Tekno Store</p>
          <h1 className="mt-3 font-serif text-4xl md:text-5xl">{pageTitle}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#68705f]">{c.intro}</p>

          {/* Search Bar */}
          <form className="mt-7 flex max-w-xl gap-2" action={'/' + locale + '/products'}>
            {category && <input type="hidden" name="category" value={category} />}
            {brand && <input type="hidden" name="brand" value={brand} />}
            <label className="flex flex-1 items-center gap-2 rounded-xl border border-[#17351d]/20 bg-white px-4">
              <Search className="h-5 w-5 shrink-0 text-[#a07738]" />
              <input
                name="search"
                aria-label={c.search}
                defaultValue={search}
                placeholder={c.search}
                className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none"
              />
            </label>
            <button className="rounded-xl bg-[#17351d] px-5 text-sm font-bold text-white">
              {c.searchButton}
            </button>
          </form>

          {/* 1-Click Brand Filter Bar */}
          <div className="mt-8 pt-4 border-t border-[#17351d]/10">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#82602d] me-2 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" />
                {c.brand} :
              </span>
              <Link
                href={buildUrl({ brand: undefined, page: 1 })}
                className={
                  'rounded-full px-4 py-2 text-xs font-semibold transition ' +
                  (!brand
                    ? 'bg-[#17351d] text-white shadow-xs'
                    : 'border border-[#17351d]/20 bg-white text-[#17351d] hover:border-[#17351d]/40')
                }
              >
                {c.all}
              </Link>
              {POPULAR_BRANDS.map((b) => {
                const isSelected = brand?.toLowerCase() === b.toLowerCase()
                return (
                  <Link
                    key={b}
                    href={buildUrl({ brand: isSelected ? undefined : b, page: 1 })}
                    className={
                      'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition ' +
                      (isSelected
                        ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/20'
                        : 'border border-[#17351d]/20 bg-white text-[#17351d] hover:border-blue-600 hover:text-blue-600')
                    }
                  >
                    <span>{b}</span>
                    {isSelected && <X className="w-3 h-3 ms-0.5" />}
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Category Tabs */}
          <div className="my-5 flex flex-wrap gap-2">
            <Link
              href={buildUrl({ category: undefined, page: 1 })}
              className={
                'rounded-full px-4 py-2 text-xs font-semibold transition ' +
                (!category
                  ? 'bg-[#17351d] text-white'
                  : 'border border-[#17351d]/20 bg-white text-[#17351d] hover:border-[#17351d]/40')
              }
            >
              {c.all}
            </Link>
            {Object.keys(PET_CATEGORIES).map((key, i) => {
              const isSelected = category === key
              return (
                <Link
                  key={key}
                  href={buildUrl({ category: isSelected ? undefined : key, page: 1 })}
                  className={
                    'rounded-full border px-4 py-2 text-xs font-semibold transition ' +
                    (isSelected
                      ? 'border-[#17351d] bg-[#17351d] text-white'
                      : 'border-[#17351d]/20 bg-white hover:border-[#17351d]/40')
                  }
                >
                  {labels[i]}
                </Link>
              )
            })}
          </div>

          {/* Results Count & Active Filters */}
          <div className="mb-5 flex items-center justify-between">
            <p className="text-xs text-[#68705f]">
              {count} {c.results}
              {brand && <span className="ms-2 font-semibold text-[#17351d]">· Marque: {brand}</span>}
              {category && <span className="ms-2 font-semibold text-[#17351d]">· Catégorie: {category}</span>}
            </p>
            {(brand || category || search) && (
              <Link href="/products" className="text-xs font-bold text-red-600 hover:underline">
                Réinitialiser les filtres
              </Link>
            )}
          </div>

          {/* Product Grid */}
          {products.length ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} locale={locale} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-[#c59a55]/50 bg-[#f7f0df] px-6 py-16 text-center">
              <Cpu className="mx-auto h-12 w-12 text-[#a07738]" />
              <h2 className="mt-5 text-xl font-bold">{search ? c.out : c.empty}</h2>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-[#68705f]">{c.emptyText}</p>
              <Link href="/products" className="mt-5 inline-block text-sm font-bold underline">
                {c.reset}
              </Link>
            </div>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <nav aria-label="Pagination" className="mt-8 flex justify-center gap-4">
              {page > 1 && (
                <Link href={buildUrl({ page: page - 1 })} className="rounded-full border px-4 py-2">
                  ←
                </Link>
              )}
              <span className="px-3 py-2">
                {page} / {pages}
              </span>
              {page < pages && (
                <Link href={buildUrl({ page: page + 1 })} className="rounded-full border px-4 py-2">
                  →
                </Link>
              )}
            </nav>
          )}
        </div>
      </main>
      <PetHelpBanner locale={locale} />
      <Footer />
    </>
  )
}
