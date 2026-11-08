import { requirePageRole } from '@/lib/page-authorization'
import { prisma } from '@/lib/prisma'
import FacebookBotClient from './FacebookBotClient'

export default async function FacebookBotPage() {
    await requirePageRole(["ADMIN","MANAGER"])

    const books = await prisma.book.findMany({
        where: { stock: { gt: 0 } },
        select: {
            id: true,
            title: true,
            price: true,
            image: true,
            author: true,
            category: true,
            description: true,
            stock: true,
            createdAt: true
        },
        orderBy: { createdAt: 'desc' }
    })

    return <FacebookBotClient books={books} />
}
