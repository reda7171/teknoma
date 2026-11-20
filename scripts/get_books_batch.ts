import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const missingDesc = await prisma.book.count({
        where: {
            OR: [
                { description: { equals: '' } },
                { description: { equals: ' ' } },
                { description: null as any }
            ]
        }
    })
    console.log("Books missing description: " + missingDesc)
}

main().catch(console.error).finally(() => prisma.$disconnect())
