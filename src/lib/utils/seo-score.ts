export interface BookForSeoScore {
    title?: string | null
    titleFr?: string | null
    titleEn?: string | null
    author?: string | null
    description?: string | null
    descriptionFr?: string | null
    descriptionEn?: string | null
    longDescription?: string | null
    seoKeywords?: string | null
    image?: string | null
    price?: number | null
    stock?: number | null
    isbn?: string | null
}

export function calculateBookSeoScore(book: BookForSeoScore): number {
    if (!book) return 0
    const title = book.title || ''
    const titleFr = book.titleFr || ''
    const author = book.author || ''
    const desc = book.description || ''
    const descFr = book.descriptionFr || ''
    const longDesc = book.longDescription || ''
    const keywords = book.seoKeywords || ''
    const image = book.image || ''
    const price = Number(book.price) || 0
    const stock = book.stock !== undefined && book.stock !== null ? Number(book.stock) : -1
    const isbn = book.isbn || ''

    const checks = [
        title.length >= 5,
        titleFr.length >= 5,
        title.length <= 70 && title.length >= 5,
        author.length >= 2,
        desc.length >= 80,
        descFr.length >= 80,
        longDesc.length >= 200,
        keywords.split(',').filter((k: string) => k.trim()).length >= 3,
        image.length > 5 && image !== '/book-placeholder.png',
        price > 0,
        stock >= 1,
        isbn.length >= 10,
    ]

    const passed = checks.filter(Boolean).length
    return Math.round((passed / 12) * 100)
}
