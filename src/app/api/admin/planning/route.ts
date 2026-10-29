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
        const { date, time, content, platforms, mediaUrl, suggestedProductId, suggestedProductType } = body

        // If a suggested product was used, flag it as promoted
        if (suggestedProductId && suggestedProductType) {
            if (suggestedProductType === 'pack') {
                await prisma.pack.update({ where: { id: suggestedProductId }, data: { isPromoted: true } }).catch(() => {})
            } else {
                await prisma.book.update({ where: { id: suggestedProductId }, data: { isPromoted: true } }).catch(() => {})
            }
        }

        const scheduleDate = new Date(date)
        const isNow = scheduleDate.getTime() <= Date.now() + 5 * 60 * 1000 // si c'est dans moins de 5 min

        // 1. Sauvegarder en DB (PENDING si futur, PUBLISHED si on lance maintenant)
        const post = await prisma.scheduledPost.create({
            data: {
                date: scheduleDate,
                time,
                content,
                platforms: JSON.stringify(platforms),
                mediaUrl,
                status: isNow ? 'PUBLISHED' : 'PENDING'
            }
        })

        if (!isNow) {
            void(`[Planning API] Post sauvegardé pour plus tard: ${scheduleDate.toISOString()}`)
            return NextResponse.json({ success: true, post, message: 'Programmé pour plus tard' })
        }

        // 2. Récupérer l'URL du webhook n8n
        const dbWebhookUrl = await getSetting('n8n_webhook_url')
        const envWebhookUrl = process.env.N8N_WEBHOOK_URL
        let n8nWebhookUrl = dbWebhookUrl || envWebhookUrl

        // Remplacer hostname interne Docker pour que `npm run dev` puisse l'atteindre
        if (n8nWebhookUrl && (n8nWebhookUrl.includes('://n8n') || n8nWebhookUrl.includes('://localhost'))) {
            if (process.env.NODE_ENV !== 'production') {
                n8nWebhookUrl = envWebhookUrl || n8nWebhookUrl
            }
        }

        // FORCER le réseau interne Docker en PROD (contourner le blocage IP publique)
        if (process.env.NODE_ENV === 'production' && n8nWebhookUrl) {
            n8nWebhookUrl = n8nWebhookUrl.replace('167.86.108.246', 'n8n');
            n8nWebhookUrl = n8nWebhookUrl.replace('https://', 'http://'); // Le réseau interne est en HTTP
        }

        if (!n8nWebhookUrl) {
            console.error('n8nWebhookUrl non défini, post sauvegardé mais non envoyé à n8n');
            return NextResponse.json({ success: true, post })
        }

        // 3. Préparer le payload batch complet
        const facebookAccessToken = await getSetting('facebook_access_token')
        const instagramAccountId = await getSetting('instagram_account_id')
        const tiktokAccessToken = await getSetting('tiktok_access_token')
        const tiktokCreatorId = await getSetting('tiktok_creator_id')
        const tiktokAppId = await getSetting('tiktok_app_id')
        const tiktokClientSecret = await getSetting('tiktok_client_secret')
        const threadsAccessToken = await getSetting('threads_access_token')
        const threadsAccountId = await getSetting('threads_account_id')
        const pinterestAccessToken = await getSetting('pinterest_access_token')
        const pinterestBoardId = await getSetting('pinterest_board_id')

        const rawBase = process.env.NEXT_PUBLIC_APP_URL || ''
        const appBaseUrl = rawBase.includes('127.0.0.1') || rawBase.includes('localhost')
            ? 'https://petsunivers.ma'
            : (rawBase || 'https://petsunivers.ma')

        let absoluteImage = mediaUrl || ''
        if (absoluteImage && !absoluteImage.startsWith('http')) {
            absoluteImage = `${appBaseUrl}${absoluteImage.startsWith('/') ? '' : '/'}${absoluteImage}`
        }

        const isVideo = absoluteImage && (absoluteImage.endsWith('.mp4') || absoluteImage.endsWith('.mov') || absoluteImage.endsWith('.webm'))

        const payload = {
            batch: platforms.map((platform: string) => ({
                itemId: post.id,
                itemType: 'OTHER',
                title: 'PetsUnivers',
                image: absoluteImage,
                isVideo,
                isPack: false,
                caption: content || 'PetsUnivers Post',
                description: content || '',
                format: 'post',
                platform: platform,
                scheduleAt: '',
                source: 'petsunivers-admin',
                postId: post.id,
                facebook_access_token: facebookAccessToken,
                instagram_account_id: instagramAccountId,
                tiktok_access_token: tiktokAccessToken,
                tiktok_creator_id: tiktokCreatorId,
                tiktok_app_id: tiktokAppId,
                tiktok_client_secret: tiktokClientSecret,
                threads_access_token: threadsAccessToken,
                threads_account_id: threadsAccountId,
                pinterest_access_token: pinterestAccessToken,
                pinterest_board_id: pinterestBoardId,
            }))
        }

        // 4. Envoyer à n8n avec timeout
        void(`[Planning API] Envoi à n8n (${n8nWebhookUrl}) - batch de ${payload.batch.length} items`)

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        let n8nStatus = 'not_sent'
        let n8nError = null
        try {
            const n8nRes = await fetch(n8nWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal
            })
            n8nStatus = `${n8nRes.status} ${n8nRes.statusText}`
            void(`[Planning API] Réponse n8n: ${n8nStatus}`)
        } catch (err: any) {
            n8nError = err.message
            console.error(`[Planning API] Erreur fetch n8n: ${err.message}`)
        } finally {
            clearTimeout(timeoutId);
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
