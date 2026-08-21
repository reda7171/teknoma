import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const books = await prisma.book.findMany({
        where: {
            OR: [
                { author: { contains: 'جبران' } },
                { title: { contains: 'ماجدولين' } },
                { title: { contains: 'majdolin' } }
            ]
        }
    })
    console.log(JSON.stringify(books, null, 2))
    await prisma.$disconnect()
}

main().catch(console.error)
