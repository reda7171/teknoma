import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const total = await prisma.book.count()
    console.log(`Total books: ${total}`)
}
main().finally(() => prisma.$disconnect())
