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
export default async function BooksPage({ searchParams }: { searchParams: Promise<{ page?: string, search?: string, status?: string, type?: string, lang?: string, sort?: string, limit?: string }> }) {
    const params = await searchParams
    const currentPage = Number(params.page) || 1
    const ITEMS_PER_PAGE = Number(params.limit) || 20
    const searchQuery = params.search || ''
    const statusParam = params.status || ''
    const typeParam = params.type || ''
    const langParam = params.lang || ''
    const sortParam = params.sort || ''

    const where: Prisma.BookWhereInput = {
        ...(searchQuery && {
            OR: [
                { title: { contains: searchQuery } },
                { author: { contains: searchQuery } },
                { category: { contains: searchQuery } }
            ]
        }),
        ...(statusParam === 'no-image' && {
            image: { in: ['', '/book-placeholder.png'] }
        }),
        ...(statusParam === 'out-of-stock' && {
            stock: { equals: 0 }
        }),
        ...(statusParam === 'in-stock' && {
            stock: { gt: 0 }
        }),
        ...(statusParam === 'active' && {
            active: true
        }),
        ...(statusParam === 'inactive' && {
            active: false
        }),
        ...(langParam && {
            language: langParam
        })
    }

    const productTypeFilter = typeParam || 'all'

    let booksStats: any[] = []
    let allProducts: any[] = []

    // 1. Fetch Books
    if (productTypeFilter === 'all' || productTypeFilter === 'book') {
        const books = await prisma.book.findMany({
            where,
            include: { _count: { select: { orderItems: { where: { order: { status: 'CONFIRMED' } } } } } }
        })
        booksStats.push(...books.map(b => ({ stock: b.stock, active: b.active, price: b.price })))
        allProducts.push(...books.map(b => ({ ...b, productType: 'BOOK', orderCount: b._count?.orderItems || 0, sellerSku: b.sellerSku })))
    }

    // 2. Fetch Packs
    if (productTypeFilter === 'all' || productTypeFilter === 'pack') {
        const packWhere: any = {}
        if (searchQuery) {
            packWhere.OR = [ { name: { contains: searchQuery } }, { description: { contains: searchQuery } } ]
        }
        if (statusParam === 'active') packWhere.active = true
        if (statusParam === 'inactive') packWhere.active = false
        
        const packs = await prisma.pack.findMany({
            where: packWhere,
            include: { _count: { select: { orderItems: { where: { order: { status: 'CONFIRMED' } } } } } }
        })
        booksStats.push(...packs.map(p => ({ stock: 999, active: p.active, price: p.price })))
        allProducts.push(...packs.map(p => ({
            id: p.id,
            title: p.name,
            author: 'Pack',
            price: p.price,
            stock: 999, // Packs don't have stock
            image: p.image || '/book-placeholder.png',
            category: 'PACK',
            language: 'fr',
            description: p.description || '',
            active: p.active,
            isOriginal: true,
            productType: 'PACK',
            orderCount: p._count?.orderItems || 0,
            sellerSku: p.sellerSku,
            createdAt: p.createdAt
        })))
    }

    // 3. Fetch Accessories (Kids, USB, Bookmarks, etc)
    if (productTypeFilter === 'all' || ['kids', 'usb', 'bookmarks'].includes(productTypeFilter)) {
        const extraWhere: any = {}
        if (searchQuery) {
            extraWhere.OR = [ { name: { contains: searchQuery } }, { description: { contains: searchQuery } } ]
        }
        if (productTypeFilter !== 'all') {
            extraWhere.category = productTypeFilter.toUpperCase()
        }
        if (statusParam === 'active') extraWhere.active = true
        if (statusParam === 'inactive') extraWhere.active = false
        
        const extras = await prisma.extraProduct.findMany({
            where: extraWhere,
            include: { _count: { select: { orderItems: { where: { order: { status: 'CONFIRMED' } } } } } }
        })
        booksStats.push(...extras.map(e => ({ stock: e.stock, active: e.active, price: e.price })))
        allProducts.push(...extras.map(e => ({
            id: e.id,
            title: e.name,
            author: 'Accessoire',
            price: e.price,
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
            createdAt: e.createdAt
        })))
    }

    const totalBooks = allProducts.length
    const activeBooks = booksStats.filter(b => b.active).length
    const totalStock = booksStats.reduce((sum, b) => sum + (b.stock === 999 ? 0 : b.stock), 0)
    const stockValue = booksStats.reduce((sum, b) => sum + (b.price * (b.stock === 999 ? 0 : b.stock)), 0)

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
        sort: sortParam
    }

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
                    { label: 'Valeur Stock', value: `${stockValue.toFixed(0)} MAD`, color: 'text-purple-600' }
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
