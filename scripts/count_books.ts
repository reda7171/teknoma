import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const total = await prisma.book.count()
    const missingDesc = await prisma.book.count({
        where: {
            OR: [
                { description: { equals: '' } },
                { description: { equals: null } },
                // Check if it only has placeholder description length < 20
            ]
        }
    })
    console.log(`Total books: ${total}`)
    console.log(`Missing description: ${missingDesc}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
