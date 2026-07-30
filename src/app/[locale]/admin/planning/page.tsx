import { prisma } from '@/lib/prisma'
import PlanningClient from './PlanningClient'

export const dynamic = 'force-dynamic'

export default async function PlanningPage() {
    let initialPosts = []
    let availableBooks = []
    
    try {
        const posts = await prisma.scheduledPost.findMany({
            orderBy: { date: 'asc' }
        })
        
        initialPosts = posts.map(p => ({
            id: p.id,
            date: p.date,
            time: p.time,
            content: p.content,
            platforms: p.platforms,
            mediaUrl: p.mediaUrl,
            status: p.status
        }))

        // Fetch active books for suggestions
        const books = await prisma.book.findMany({
            where: { active: true },
            select: { id: true, title: true, image: true, author: true, stock: true },
        })

        // Fetch active packs
        const packs = await prisma.pack.findMany({
            where: { active: true },
            select: { id: true, name: true, image: true },
        })

        availableBooks = [
            ...books.map(b => ({ ...b, type: 'book' })),
            ...packs.map(p => ({ id: p.id, title: p.name, image: p.image, author: 'Pack', type: 'pack' }))
        ];

    } catch (error) {
        console.error('Failed to fetch data for planning:', error)
    }

    return <PlanningClient initialPosts={initialPosts as any} availableBooks={availableBooks} />
}
