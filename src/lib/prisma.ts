import { PrismaClient } from '@prisma/client'

if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = "mysql://petsunivers_user:petsunivers_pass@127.0.0.1:3306/petsunivers_db"
}

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        log: ['error'],
    })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
