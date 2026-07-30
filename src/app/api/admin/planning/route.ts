import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/actions/auth'

export async function GET(req: NextRequest) {
    try {
        await verifyAdmin()
        const posts = await prisma.scheduledPost.findMany({
            orderBy: { date: 'asc' }
        })
        return NextResponse.json({ success: true, posts })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

import { getSetting } from '@/lib/actions/site-settings'

export async function POST(req: NextRequest) {
    try {
        await verifyAdmin()
        const body = await req.json()
        const { date, time, content, platforms, mediaUrl } = body

        // 1. Sauvegarder en DB avec status PUBLISHED (pour que le cron l'ignore, vu qu'on l'envoie à n8n directement)
        const post = await prisma.scheduledPost.create({
            data: {
                date: new Date(date),
                time,
                content,
                platforms: JSON.stringify(platforms),
                mediaUrl,
                status: 'PUBLISHED'
            }
        })

        // 2. Récupérer l'URL du webhook n8n (priorité à la DB)
        const dbWebhookUrl = await getSetting('n8n_webhook_url')
        const n8nWebhookUrl = dbWebhookUrl || process.env.N8N_WEBHOOK_URL

        if (!n8nWebhookUrl) {
            console.error('n8nWebhookUrl non défini, post sauvegardé mais non envoyé à n8n');
            return NextResponse.json({ success: true, post })
        }

        // 3. Préparer le payload batch pour n8n
        const facebookAccessToken = await getSetting('facebook_access_token')
        const instagramAccountId = await getSetting('instagram_account_id')
        const tiktokAccessToken = await getSetting('tiktok_access_token')
        const tiktokCreatorId = await getSetting('tiktok_creator_id')
        const tiktokAppId = await getSetting('tiktok_app_id')
        const tiktokClientSecret = await getSetting('tiktok_client_secret')

        // URL publique du site (jamais localhost)
        const rawBase = process.env.NEXT_PUBLIC_APP_URL || ''
        const appBaseUrl = rawBase.includes('127.0.0.1') || rawBase.includes('localhost')
            ? 'https://riwaya.store'
            : (rawBase || 'https://riwaya.store')
        // Convertir l'URL image relative en URL absolue publique
        const absoluteImage = mediaUrl
            ? (mediaUrl.startsWith('http') && !mediaUrl.includes('127.0.0.1') && !mediaUrl.includes('localhost')
                ? mediaUrl
                : `https://riwaya.store${mediaUrl.startsWith('/') ? mediaUrl : `/${mediaUrl}`}`)
            : ''

        const batch = []
        for (const platform of platforms) {
            batch.push({
                itemId: post.id,
                itemType: 'POST',
                caption: content || 'Riwaya Post',
                image: absoluteImage,
                platform: platform,
                scheduleAt: new Date(date).toISOString(),
                facebook_access_token: facebookAccessToken,
                instagram_account_id: instagramAccountId,
                tiktok_access_token: tiktokAccessToken,
                tiktok_creator_id: tiktokCreatorId,
                tiktok_app_id: tiktokAppId,
                tiktok_client_secret: tiktokClientSecret,
            })
        }

        // 4. Envoyer à n8n et attendre la réponse (pour déboguer)
        console.log(`[Planning API] Envoi à n8n (${n8nWebhookUrl}) - batch de ${batch.length} items`)
        let n8nStatus = 'not_sent'
        let n8nError = null
        try {
            const n8nRes = await fetch(n8nWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ batch })
            })
            n8nStatus = `${n8nRes.status} ${n8nRes.statusText}`
            console.log(`[Planning API] Réponse n8n: ${n8nStatus}`)
        } catch (err: any) {
            n8nError = err.message
            console.error(`[Planning API] Erreur fetch n8n: ${err.message}`)
        }

        return NextResponse.json({ success: true, post, n8nStatus, n8nError, n8nUrl: n8nWebhookUrl })
    } catch (error: any) {
        console.error('[Planning API] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest) {
    try {
        await verifyAdmin()
        // Delete all scheduled posts
        await prisma.scheduledPost.deleteMany()
        return NextResponse.json({ success: true, message: 'Calendrier vidé' })
    } catch (error: any) {
        console.error('[Planning API] Delete Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
