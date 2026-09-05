import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Plus, Upload } from 'lucide-react'
import BooksTable from './BooksTable'
import { normalizeImage } from '@/lib/utils'
import CatalogButton from '@/components/admin/CatalogButton'
import CatalogImageButton from '@/components/admin/CatalogImageButton'
import EmptyLibraryButton from '@/components/admin/EmptyLibraryButton'
import SyncJumiaStockButton from '@/components/admin/SyncJumiaStockButton'

import { Prisma } from '@prisma/client'

import BookFilters from './BookFilters'
import { getCategoryTree } from '@/lib/actions/category-tree'
import { getAdminRole, getAdminUser } from '@/lib/actions/auth'

export default async function BooksPage({ searchParams }: { searchParams: Promise<{ page?: string, search?: string, status?: string, type?: string, lang?: string, sort?: string, limit?: string, jumia?: string, category?: string, subCategory?: string }> }) {
    const params = await searchParams
    const currentPage = Number(params.page) || 1
    const ITEMS_PER_PAGE = Number(params.limit) || 20
    const searchQuery = params.search || ''
    const statusParam = params.status || ''
    const typeParam = params.type || ''
    const langParam = params.lang || ''
    const sortParam = params.sort || ''
    const jumiaParam = params.jumia || ''
    const categoryParam = params.category || ''
    const subCategoryParam = params.subCategory || ''

    const role = await getAdminRole()
    const userId = await getAdminUser()

    const where: Prisma.BookWhereInput = {
        ...(role === 'SELLER' && userId ? { sellerId: userId } : {}),
        ...(searchQuery && {
            OR: [
                { title: { contains: searchQuery } },
                { titleFr: { contains: searchQuery } },
                { titleEn: { contains: searchQuery } },
                { author: { contains: searchQuery } },
                { category: { contains: searchQuery } },
                { sellerSku: { contains: searchQuery } }
            ]
        }),
        ...(statusParam.split(',').includes('no-image') && {
            image: { in: ['', '/book-placeholder.png'] }
        }),
        ...(statusParam.split(',').includes('out-of-stock') && {
            stock: { equals: 0 }
        }),
        ...(statusParam.split(',').includes('in-stock') && {
            stock: { gt: 0 }
        }),
        ...(statusParam.split(',').includes('active') && {
            active: true
        }),
        ...(statusParam.split(',').includes('inactive') && {
            active: false
        }),
        ...(langParam && {
            language: { in: langParam.split(',') }
        }),
        ...(jumiaParam.split(',').includes('synced') && {
            isSyncedWithJumia: true
        }),
        ...(jumiaParam.split(',').includes('not-synced') && {
            isSyncedWithJumia: false
        }),
        ...(jumiaParam.split(',').includes('has-sku') && {
            sellerSku: { not: null }
        }),
        ...(jumiaParam.split(',').includes('no-sku') && {
            sellerSku: null
        }),
        ...(categoryParam && {
            category: { in: categoryParam.split(',') }
        }),
        ...(subCategoryParam && {
            subCategory: { in: subCategoryParam.split(',') }
        })
    }

    const productTypes = typeParam ? typeParam.split(',') : ['all']

    let allProducts: any[] = []

    // 1. Fetch Books
    if (productTypes.includes('all') || productTypes.includes('book')) {
        const books = await prisma.book.findMany({
            where,
            include: { _count: { select: { orderItems: { where: { order: { status: 'CONFIRMED' } } }, posts: true } } }
        })
        allProducts.push(...books.map(b => ({ ...b, productType: 'BOOK', orderCount: b._count?.orderItems || 0, sellerSku: b.sellerSku, isSyncedWithJumia: b.isSyncedWithJumia, jumiaStock: b.jumiaStock, hasArticle: (b._count?.posts || 0) > 0 })))
    }

    // 2. Fetch Packs
    if (productTypes.includes('all') || productTypes.includes('pack')) {
        const packWhere: any = {}
        if (searchQuery) {
            packWhere.OR = [ { name: { contains: searchQuery } }, { nameFr: { contains: searchQuery } }, { nameEn: { contains: searchQuery } }, { description: { contains: searchQuery } }, { sellerSku: { contains: searchQuery } } ]
        }
        if (statusParam.split(',').includes('active')) packWhere.active = true
        if (statusParam.split(',').includes('inactive')) packWhere.active = false
        if (jumiaParam.split(',').includes('synced')) packWhere.isSyncedWithJumia = true
        if (jumiaParam.split(',').includes('not-synced')) packWhere.isSyncedWithJumia = false
        if (jumiaParam.split(',').includes('has-sku')) packWhere.sellerSku = { not: null }
        if (jumiaParam.split(',').includes('no-sku')) packWhere.sellerSku = null
        
        const packs = await prisma.pack.findMany({
            where: packWhere,
            include: { _count: { select: { orderItems: { where: { order: { status: 'CONFIRMED' } } } } } }
        })
        allProducts.push(...packs.map(p => ({
            id: p.id,
            title: p.name,
            titleFr: p.nameFr,
            titleEn: p.nameEn,
            author: 'Pack',
            price: p.price,
            costPrice: p.costPrice || 0,
            stock: 0, // Packs have 0 stock
            image: p.image || '/book-placeholder.png',
            category: 'PACK',
            language: 'fr',
            description: p.description || '',
            active: p.active,
            isOriginal: true,
            productType: 'PACK',
            orderCount: p._count?.orderItems || 0,
            sellerSku: p.sellerSku,
            jumiaStock: p.jumiaStock,
            createdAt: p.createdAt
        })))
    }

    // 3. Fetch Accessories (Kids, USB, Bookmarks, etc)
    const accessoryTypes = productTypes.filter(t => ['kids', 'usb', 'bookmarks'].includes(t))
    if (productTypes.includes('all') || accessoryTypes.length > 0) {
        const extraWhere: any = {}
        if (searchQuery) {
            extraWhere.OR = [ { name: { contains: searchQuery } }, { description: { contains: searchQuery } }, { sellerSku: { contains: searchQuery } } ]
        }
        if (statusParam.split(',').includes('active')) extraWhere.active = true
        if (statusParam.split(',').includes('inactive')) extraWhere.active = false
        if (jumiaParam.split(',').includes('synced')) extraWhere.isSyncedWithJumia = true
        if (jumiaParam.split(',').includes('not-synced')) extraWhere.isSyncedWithJumia = false
        if (jumiaParam.split(',').includes('has-sku')) extraWhere.sellerSku = { not: null }
        if (jumiaParam.split(',').includes('no-sku')) extraWhere.sellerSku = null
        
        if (!productTypes.includes('all') && accessoryTypes.length > 0) {
            extraWhere.category = { in: accessoryTypes.map(t => t.toUpperCase()) }
        }
        
        const extras = await prisma.extraProduct.findMany({
            where: extraWhere,
            include: { _count: { select: { orderItems: { where: { order: { status: 'CONFIRMED' } } } } } }
        })
        allProducts.push(...extras.map(e => ({
            id: e.id,
            title: e.name,
            titleFr: null,
            titleEn: null,
            author: 'Accessoire',
            price: e.price,
            costPrice: e.costPrice || 0,
            stock: e.stock,
            image: e.image || '/book-placeholder.png',
            category: e.category,
            language: 'fr',
            description: e.description || '',
            active: e.active,
            isOriginal: true,
            productType: 'EXTRA',
            orderCount: e._count?.orderItems || 0,
            sellerSku: e.sellerSku,
            jumiaStock: null,
            createdAt: e.createdAt
        })))
    }

    const totalBooks = allProducts.length
    const activeBooks = allProducts.filter(b => b.active).length
    const stockProducts = productTypes.includes('all') ? allProducts.filter(p => p.productType === 'BOOK') : allProducts
    const totalStock = stockProducts.reduce((sum, p) => sum + (p.stock || 0), 0)
    const stockValue = stockProducts.reduce((sum, p) => sum + ((p.costPrice || 0) * (p.stock || 0)), 0)

    // Manual sorting
    if (sortParam === 'price-asc') allProducts.sort((a, b) => a.price - b.price)
    else if (sortParam === 'price-desc') allProducts.sort((a, b) => b.price - a.price)
    else if (sortParam === 'stock-asc') allProducts.sort((a, b) => a.stock - b.stock)
    else if (sortParam === 'stock-desc') allProducts.sort((a, b) => b.stock - a.stock)
    else if (sortParam === 'title-asc') allProducts.sort((a, b) => a.title.localeCompare(b.title))
    else if (sortParam === 'title-desc') allProducts.sort((a, b) => b.title.localeCompare(a.title))
    else if (sortParam === 'orders-asc') allProducts.sort((a, b) => a.orderCount - b.orderCount)
    else if (sortParam === 'orders-desc') allProducts.sort((a, b) => b.orderCount - a.orderCount)
    else {
        // Default sort by displayOrder (if book) and createdAt
        allProducts.sort((a, b) => {
            if (a.displayOrder !== undefined && b.displayOrder !== undefined && a.displayOrder !== b.displayOrder) {
                return a.displayOrder - b.displayOrder;
            }
            return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
        })
    }

    const normalizedBooks = allProducts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE).map(b => ({ ...b, image: normalizeImage(b.image) }))
    const totalPages = Math.ceil(totalBooks / ITEMS_PER_PAGE)

    const activeFilters = {
        search: searchQuery,
        status: statusParam,
        type: typeParam,
        lang: langParam,
        sort: sortParam,
        jumia: jumiaParam,
        category: categoryParam,
        subCategory: subCategoryParam
    }

    const categoryTree = await getCategoryTree()
    const mainCategories = Object.keys(categoryTree)

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-gray-100">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Gestion du Catalogue</h1>
                    <p className="mt-1 text-sm text-gray-500 font-medium">
                        Gérez vos livres, stocks et publications sociales.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Link
                        href="/admin/books/pending"
                        className="inline-flex items-center px-5 py-2.5 bg-amber-50 text-amber-700 font-bold text-sm rounded-xl hover:bg-amber-100 transition-colors"
                    >
                        En attente
                    </Link>
                    <div className="flex gap-2">
                        <SyncJumiaStockButton />
                        <CatalogButton />
                        <CatalogImageButton />
                    </div>
                    <Link
                        href="/admin/books/bulk-import"
                        className="inline-flex items-center px-5 py-2.5 bg-emerald-50 text-emerald-700 font-bold text-sm rounded-xl hover:bg-emerald-100 transition-colors"
                    >
                        <Upload className="w-4 h-4 mr-2" />
                        Importer
                    </Link>
                    <Link
                        href="/admin/books/new"
                        className="inline-flex items-center px-5 py-2.5 bg-black text-white font-bold text-sm rounded-xl hover:bg-gray-900 transition-all shadow-xl shadow-black/10 active:scale-95"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Ajouter
                    </Link>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Total Livres', value: totalBooks, color: 'text-gray-900' },
                    { label: 'Livres Actifs', value: activeBooks, color: 'text-green-600' },
                    { label: 'Stock Total', value: totalStock, color: 'text-blue-600' },
                    { label: 'Valeur Stock', value: `${stockValue.toFixed(0)} درهم`, color: 'text-purple-600' }
                ].map((stat, i) => (
                    <div key={i} className="bg-white rounded-3xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
                        <p className={`mt-2 text-2xl font-black ${stat.color}`}>{stat.value}</p>
                    </div>
                ))}
            </div>

            <div className="flex flex-col gap-8">
                {/* Search & Filters */}
                <BookFilters 
                    activeFilters={activeFilters}
                    totalCount={totalBooks}
                    categories={mainCategories}
                    categoryTree={categoryTree}
                />

                {/* Table Content */}
                <div className="w-full">
                    <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
                        <BooksTable 
                            books={normalizedBooks} 
                            pageNumber={currentPage} 
                            totalProviderPages={totalPages} 
                            activeFilters={activeFilters}
                            limit={ITEMS_PER_PAGE} 
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
