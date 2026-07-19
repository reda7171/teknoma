import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSetting } from '@/lib/actions/site-settings'

// Cron toutes les 5 minutes — envoie les posts programmés à n8n (fire & forget)
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const secret = searchParams.get('secret')
        if (secret !== process.env.CRON_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const now = new Date()
        const duePosts = await prisma.scheduledPost.findMany({
            where: { status: 'PENDING', date: { lte: now } },
            take: 20
        })

        if (duePosts.length === 0) {
            return NextResponse.json({ success: true, message: 'Aucun post à publier', count: 0 })
        }

        const dbWebhookUrl = await getSetting('n8n_webhook_url')
        const envWebhookUrl = process.env.N8N_WEBHOOK_URL

        let N8N_WEBHOOK_URL = dbWebhookUrl || envWebhookUrl
        // Remplacer hostname Docker interne par IP publique
        if (N8N_WEBHOOK_URL && (N8N_WEBHOOK_URL.includes('://n8n') || N8N_WEBHOOK_URL.includes('://localhost'))) {
            N8N_WEBHOOK_URL = envWebhookUrl || N8N_WEBHOOK_URL
        }

        if (!N8N_WEBHOOK_URL) {
            return NextResponse.json({ error: 'N8N_WEBHOOK_URL non configuré' }, { status: 500 })
        }

        const protocol = req.headers.get('x-forwarded-proto') || 'http'
        const host = req.headers.get('host') || 'localhost:3000'
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`

        // Marquer tous comme SENT immédiatement, puis envoyer à n8n sans attendre
        const postIds = duePosts.map(p => p.id)
        await prisma.scheduledPost.updateMany({
            where: { id: { in: postIds } },
            data: { status: 'PUBLISHED' }
        })

        // Fire & forget : on n'attend pas la réponse de n8n
        const webhookUrl = N8N_WEBHOOK_URL
        for (const post of duePosts) {
            let platforms: string[] = []
            try {
                platforms = typeof post.platforms === 'string' ? JSON.parse(post.platforms) : post.platforms
            } catch { platforms = ['facebook'] }

            let imageUrl = post.mediaUrl || ''
            if (imageUrl && !imageUrl.startsWith('http')) {
                imageUrl = `${baseUrl}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`
            }

            const isVideo = imageUrl && (imageUrl.endsWith('.mp4') || imageUrl.endsWith('.mov'))
            if (imageUrl && !isVideo) {
                imageUrl = `https://wsrv.nl/?url=${encodeURIComponent(imageUrl)}&output=jpg&q=85`
            }

            const payload = {
                batch: platforms.map(platform => ({
                    itemId: post.id,
                    itemType: 'OTHER',
                    title: 'Riwaya',
                    image: imageUrl,
                    isVideo,
                    isPack: false,
                    caption: post.content || '',
                    description: post.content || '',
                    format: 'post',
                    platform,
                    scheduleAt: '',
                    source: 'riwaya-cron',
                    postId: post.id
                }))
            }

            // Fire & forget — pas d'await, pas de timeout bloquant
            fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).catch(e => console.error(`[CRON] post ${post.id} n8n error:`, e))
        }

        return NextResponse.json({
            success: true,
            sent: duePosts.length,
            message: `${duePosts.length} post(s) envoyés à n8n`
        })
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
