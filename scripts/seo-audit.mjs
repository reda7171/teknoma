import { PrismaClient } from '@prisma/client'
import { writeFileSync } from 'fs'

const prisma = new PrismaClient()

async function main() {
    const posts = await prisma.post.findMany({
        where: { published: true },
        select: {
            id: true, title: true, slug: true, language: true,
            category: true, excerpt: true,
            books: { select: { id: true, title: true, author: true } }
        },
        orderBy: { publishedAt: 'desc' }
    })

    const books = await prisma.book.findMany({
        where: { active: true },
        select: { id: true, title: true, author: true, category: true }
    })

    const data = { posts, books }
    writeFileSync('scripts/seo-data.json', JSON.stringify(data, null, 2))
    console.log(`Exporté: ${posts.length} articles, ${books.length} livres`)
    await prisma.$disconnect()
}

main().catch(console.error)
