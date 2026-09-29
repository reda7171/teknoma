import { PrismaClient } from '@prisma/client'

if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = "mysql://riwaya_user:riwaya_pass@127.0.0.1:3306/riwaya_db"
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
