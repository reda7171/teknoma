import { prisma } from '@/lib/prisma'
import PlanningClient from './PlanningClient'

export const dynamic = 'force-dynamic' // Ensure we get fresh data

export default async function PlanningPage() {
    let initialPosts = []
    
    try {
        const posts = await prisma.scheduledPost.findMany({
            orderBy: { date: 'asc' }
        })
        
        // Convert dates to string for serialization, we'll parse them back in the client
        // or let the client handle Next.js App Router automatic serialization
        initialPosts = posts.map(p => ({
            id: p.id,
            date: p.date,
            time: p.time,
            content: p.content,
            platforms: p.platforms, // keep as string, client parses it
            mediaUrl: p.mediaUrl,
            status: p.status
        }))
    } catch (error) {
        console.error('Failed to fetch posts:', error)
    }

    return <PlanningClient initialPosts={initialPosts as any} />
}
