import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSetting } from '@/lib/actions/site-settings'
import { sendTelegramMessage, sendTelegramPhoto } from '@/lib/telegram'

import { verifyAdmin } from '@/lib/actions/auth'
import { rateLimit, getIpIdentifier } from '@/lib/rate-limit'
import { publishPin } from '@/lib/pinterest'

export async function POST(req: NextRequest) {
    try {
        // OWASP A01: Broken Access Control - Authentification Admin Obligatoire
        try {
            await verifyAdmin()
        } catch {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // OWASP A04: Rate Limiting (augmenté à 100 pour autoriser l'auto-programmation par lots)
        const ip = await getIpIdentifier()
        const limiter = await rateLimit(`n8n_publish_${ip}`, { limit: 100, windowMs: 60000 })
        if (!limiter.success) {
            return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
        }

        const body = await req.json()
        const { bookId, packId, extraId, format, scheduleAt, platform, useDescription, customImageUrl, customImageBase64, domain } = body

        // URL du webhook n8n (Priorité à la DB, puis .env)
        const dbWebhookUrl = await getSetting('n8n_webhook_url')
        let N8N_WEBHOOK_URL = dbWebhookUrl || process.env.N8N_WEBHOOK_URL

        if (process.env.NODE_ENV === 'development' && N8N_WEBHOOK_URL) {
            N8N_WEBHOOK_URL = N8N_WEBHOOK_URL.replace('http://n8n:', 'http://167.86.108.246:');
        }

        if (!N8N_WEBHOOK_URL) {
            return NextResponse.json({ error: 'N8N_WEBHOOK_URL non configuré' }, { status: 500 })
        }

        let item: any = null;
        let itemType: 'BOOK' | 'PACK' | 'OTHER' = 'OTHER';

        if (bookId) {
            void('[N8N PUBLISH] Searching for bookId:', bookId)
            item = await prisma.book.findUnique({ where: { id: bookId } })
            void('[N8N PUBLISH] Found item:', !!item)
            itemType = 'BOOK';
        } else if (packId) {
            item = await prisma.pack.findUnique({ where: { id: packId } })
            itemType = 'PACK';
        } else if (extraId) {
            item = await prisma.extraProduct.findUnique({ where: { id: extraId } })
            itemType = 'OTHER';
        } else if (body.isPack) {
            itemType = 'PACK';
        }

        void('[N8N PUBLISH] Final item status:', { bookId, packId, extraId, found: !!item, customImageUrl: !!customImageUrl })

        // Si pas de livre/pack/extra et pas d'image custom, on arrête
        if (!item && !customImageUrl) {
            return NextResponse.json({ error: 'bookId, packId, extraId ou image requis' }, { status: 400 })
        }

        // Jeton d'accès Facebook, IG et TikTok (Stocké en DB via l'admin)
        const facebookAccessToken = await getSetting('facebook_access_token')
        const instagramAccountId = await getSetting('instagram_account_id')
        const threadsAccountId = await getSetting('threads_account_id')
        const threadsAccessToken = await getSetting('threads_access_token')
        const tiktokAccessToken = await getSetting('tiktok_access_token')
        const tiktokCreatorId = await getSetting('tiktok_creator_id')
        const tiktokAppId = await getSetting('tiktok_app_id')
        const tiktokClientSecret = await getSetting('tiktok_client_secret')
        const pinterestAccessToken = await getSetting('pinterest_access_token')
        const pinterestBoardId = await getSetting('pinterest_board_id')

        // URL publique (Facebook doit pouvoir accéder à l'image)
        let host = req.headers.get('host') || '';
        let baseUrl = process.env.NEXT_PUBLIC_APP_URL || '';

        // Déterminer le protocole
        const protocol = (host.includes('localhost') || /^\d+\.\d+\.\d+\.\d+/.test(host)) ? 'http' : 'https';

        // Logique de résolution de baseUrl pour éviter 'localhost' (inaccessible par Meta)
        const isLocal = (url: string) => !url || url.includes('localhost') || url.includes('127.0.0.1') || url.includes('0.0.0.0');

        if (isLocal(baseUrl)) {
            if (!isLocal(host)) {
                baseUrl = `${protocol}://${host}`;
            } else {
                const port = host.split(':')[1] || '3000';
                baseUrl = `${protocol}://167.86.108.246${port ? `:${port}` : ''}`;
            }
        }

        baseUrl = baseUrl.replace(/\/$/, '');

        // Si base64 fourni, sauvegarder le fichier côté serveur pour obtenir une URL publique
        let resolvedCustomImageUrl = customImageUrl
        if (customImageBase64 && customImageBase64.startsWith('data:image')) {
            try {
                const { writeFile, mkdir } = await import('fs/promises')
                const path = await import('path')
                const { randomBytes } = await import('crypto')
                const matches = customImageBase64.match(/^data:([A-Za-z-+/]+);base64,(.+)$/)
                if (matches) {
                    const ext = matches[1].includes('png') ? 'png' : 'jpg'
                    const buffer = Buffer.from(matches[2], 'base64')
                    const fileName = `creative_${randomBytes(8).toString('hex')}.${ext}`
                    const uploadDir = path.default.join(process.cwd(), 'public', 'uploads', 'creatives')
                    await mkdir(uploadDir, { recursive: true })
                    await writeFile(path.default.join(uploadDir, fileName), buffer)
                    const pubUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.petsunivers.ma'
                    resolvedCustomImageUrl = `${pubUrl}/api/uploads/creatives/${fileName}`
                }
            } catch (e) {
                console.error('[N8N PUBLISH] Base64 save error:', e)
            }
        }

        let imageUrl = resolvedCustomImageUrl || item?.image || '';

        if (imageUrl && (imageUrl.includes('localhost') || imageUrl.includes('127.0.0.1'))) {
            try {
                const urlObj = new URL(imageUrl);
                imageUrl = urlObj.pathname + urlObj.search;
            } catch (e) {
                // Ignore
            }
        }

        if (imageUrl && !imageUrl.startsWith('http')) {
            const imagePath = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
            imageUrl = `${baseUrl}${imagePath}`;
        }

        // Make ASCII-safe URL for Facebook if needed (Facebook Graph API has issues with arabic URLs)
        if (/[^\x00-\x7F]/.test(decodeURIComponent(imageUrl))) {
            try {
                const urlObj = new URL(imageUrl);
                const path = await import('path');
                const { copyFile, mkdir } = await import('fs/promises');

                const localPath = path.default.join(process.cwd(), 'public', decodeURIComponent(urlObj.pathname).replace('/api/uploads/', '/uploads/'));
                const ext = path.default.extname(localPath) || '.jpg';
                const safeFileName = `safe_${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`;
                const safeUploadDir = path.default.join(process.cwd(), 'public', 'uploads', 'creatives');

                await mkdir(safeUploadDir, { recursive: true });
                await copyFile(localPath, path.default.join(safeUploadDir, safeFileName));

                imageUrl = `${urlObj.origin}/api/uploads/creatives/${safeFileName}`;
                void('[N8N PUBLISH] Created safe ASCII image copy:', imageUrl);
            } catch (e) {
                console.error('[N8N PUBLISH] Failed to create safe ASCII image copy:', e);
                // Fallback: Encoder les caractères non-ASCII
                try {
                    const urlObj = new URL(imageUrl);
                    imageUrl = urlObj.origin + urlObj.pathname.split('/').map(segment => encodeURIComponent(decodeURIComponent(segment))).join('/') + urlObj.search;
                } catch { /* ignore */ }
            }
        } else {
            try {
                const urlObj = new URL(imageUrl);
                imageUrl = urlObj.origin + urlObj.pathname.split('/').map(segment => encodeURIComponent(decodeURIComponent(segment))).join('/') + urlObj.search;
            } catch { /* ignore si URL invalide */ }
        }

        const isVideo = imageUrl && (imageUrl.toLowerCase().endsWith('.mp4') || imageUrl.toLowerCase().endsWith('.mov') || imageUrl.toLowerCase().endsWith('.webm'));

        const title = body.packName || body.title || (item ? (itemType === 'BOOK' ? item.title : item.name) : 'PetsUnivers');
        const price = body.price || item?.price || 0;

        const jumiaSku = body.sellerSku || (item as any)?.sellerSku || '';
        const jumiaLink = jumiaSku
            ? `https://www.jumia.ma/catalog/?q=${encodeURIComponent(jumiaSku)}`
            : (item?.title ? `https://www.jumia.ma/catalog/?q=${encodeURIComponent(item.title)}` : '');

        const storeDomain = domain === 'petsunivers.ma'
            ? 'https://petsunivers.ma'
            : (domain === 'petsunivers.ma'
                ? 'https://petsunivers.ma'
                : (domain === 'jumia.ma'
                    ? (jumiaLink || 'https://www.jumia.ma')
                    : (baseUrl.includes('localhost') ? 'https://petsunivers.ma' : baseUrl)));

        // Texte à publier avec lien intégré
        let finalCaption = body.customCaption || (itemType === 'BOOK' ? (item?.description || title) : (item?.description ? `${title}\n\n${item.description}` : title));

        if (finalCaption === 'PetsUnivers' || !finalCaption) {
            finalCaption = `📚 Découvrez notre sélection de livres sur PetsUnivers !\n\n🔗 ${domain === 'jumia.ma' ? jumiaLink : storeDomain}`;
        } else if (!finalCaption.includes('http')) {
            if (domain === 'jumia.ma') {
                finalCaption += `\n\n🛒 Commander sur Jumia : ${jumiaLink}`;
            } else {
                const linkToAppend = item ? (itemType === 'BOOK' ? `${storeDomain}/fr/books/${item.id}` : `${storeDomain}/fr/packs`) : storeDomain;
                finalCaption += `\n\n🔗 Découvrez-le ici : ${linkToAppend}`;
                if ((body.includeJumiaLink || body.logoVariant === 'jumia') && jumiaLink) {
                    finalCaption += `\n🛒 Aussi disponible sur Jumia : ${jumiaLink}`;
                }
            }
        } else if (domain && domain !== 'jumia.ma') {
            finalCaption = finalCaption.replace(/https?:\/\/(www\.)?petsunivers\.(store|ma)/gi, storeDomain);
        }

        // Construire le payload envoyé à n8n
        const baseItem = {
            itemId: item?.id || 'marketing',
            itemType,
            title: title,
            author: itemType === 'BOOK' ? item?.author : 'PetsUnivers',
            price: price,
            category: itemType === 'BOOK' ? item?.category : 'Promotion',
            language: itemType === 'BOOK' ? item?.language : 'fr',
            image: imageUrl,
            isVideo: isVideo,
            isPack: itemType === 'PACK',
            booksList: body.books || (itemType === 'PACK' ? (item as any)?.books?.map((b: any) => b.book?.title || b.title) || [] : []),
            bookUrl: domain === 'jumia.ma' ? (jumiaLink || '') : (itemType === 'BOOK' && item?.id ? `${storeDomain}/fr/books/${item.id}` : ''),
            packUrl: itemType === 'PACK' ? `${storeDomain}/fr/packs` : '',
            itemUrl: domain === 'jumia.ma' ? (jumiaLink || '') : (item ? (itemType === 'BOOK' ? `${storeDomain}/fr/books/${item.id}` : `${storeDomain}/fr/packs`) : storeDomain),
            jumiaUrl: jumiaLink || '',
            domain: domain || (storeDomain.includes('petsunivers.ma') ? 'petsunivers.ma' : (domain === 'jumia.ma' ? 'jumia.ma' : 'petsunivers.ma')),
            caption: finalCaption,
            description: body.customCaption || item?.description || '',
            longDescription: item?.longDescription || '',
            format,
            scheduleAt: scheduleAt || '',
            source: 'petsunivers-admin',
            facebook_access_token: facebookAccessToken,
            instagram_account_id: instagramAccountId,
            threads_account_id: threadsAccountId,
            threads_access_token: threadsAccessToken,
            tiktok_access_token: tiktokAccessToken,
            tiktok_creator_id: tiktokCreatorId,
            tiktok_app_id: tiktokAppId,
            tiktok_client_secret: tiktokClientSecret,
            pinterest_access_token: pinterestAccessToken,
            pinterest_board_id: pinterestBoardId,
            postId: body.postId || ''
        }

        let platformsArray = ['facebook']
        if (platform === 'both' || platform === 'all') {
            platformsArray = ['facebook', 'instagram', 'tiktok', 'threads', 'pinterest']
        } else if (platform) {
            platformsArray = [platform]
        }

        let pinterestResult: any = null
        if (platformsArray.includes('pinterest')) {
            if (pinterestAccessToken && pinterestBoardId && imageUrl) {
                try {
                    // Résoudre le base64 pour Pinterest (ne peut pas fetcher les URLs de notre serveur)
                    let pinterestBase64 = customImageBase64 || null
                    if (!pinterestBase64 && imageUrl) {
                        try {
                            const fsPromises = await import('fs/promises')
                            const pathMod = await import('path')
                            // Extraire le chemin local depuis l'URL
                            let localPath: string
                            if (imageUrl.startsWith('http')) {
                                const urlObj = new URL(imageUrl)
                                const pathname = decodeURIComponent(urlObj.pathname)
                                // Gérer /api/uploads/... → public/uploads/...
                                localPath = pathname.startsWith('/api/uploads/')
                                    ? pathMod.default.join(process.cwd(), 'public', pathname.replace('/api/uploads/', '/uploads/'))
                                    : pathMod.default.join(process.cwd(), 'public', pathname)
                            } else {
                                localPath = pathMod.default.join(process.cwd(), 'public', imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`)
                            }
                            const fileBuffer = await fsPromises.readFile(localPath)
                            const ext = pathMod.default.extname(localPath).toLowerCase().replace('.', '') || 'jpeg'
                            const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
                            pinterestBase64 = `data:${mimeType};base64,${fileBuffer.toString('base64')}`
                            void(`[PINTEREST] Image convertie en base64 depuis: ${localPath}`)
                        } catch (readErr) {
                            console.error('[PINTEREST] Impossible de lire image locale, fallback URL:', readErr)
                        }
                    }

                    const pinRes = await publishPin(
                        imageUrl.startsWith('http') ? imageUrl : `${storeDomain}${imageUrl}`,
                        title,
                        finalCaption,
                        item ? (itemType === 'BOOK' ? `${storeDomain}/fr/books/${item.id}` : `${storeDomain}/fr/packs`) : storeDomain,
                        pinterestBoardId,
                        pinterestAccessToken,
                        pinterestBase64 || undefined
                    )
                    const pinId = pinRes?.id
                    const pinUrl = pinId ? `https://www.pinterest.com/pin/${pinId}/` : undefined
                    pinterestResult = { success: true, pinId, pinUrl }


                    try {
                        await prisma.scheduledPost.create({
                            data: {
                                date: new Date(),
                                time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
                                content: `[Pinterest] ${title} - ${finalCaption.substring(0, 150)}`,
                                platforms: JSON.stringify(['pinterest']),
                                mediaUrl: pinUrl || imageUrl,
                                status: 'PUBLISHED'
                            }
                        })
                    } catch (dbErr) {
                        console.error('Erreur enregistrement ScheduledPost Pinterest:', dbErr)
                    }
                } catch (pinErr: any) {
                    console.error('[N8N PUBLISH] Pinterest direct publish error:', pinErr)
                    pinterestResult = { success: false, error: pinErr.message }
                }
            }
            // Retirer pinterest du lot envoyé à n8n pour éviter l'échec 401 sur le sandbox n8n
            platformsArray = platformsArray.filter(p => p !== 'pinterest')
        }

        if (platformsArray.length === 0) {
            if (!pinterestResult?.success) {
                return NextResponse.json({
                    success: false,
                    error: pinterestResult?.error || 'La publication Pinterest a échoué.',
                    pinterest: pinterestResult
                }, { status: 502 })
            }

            const safeTitle = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            const messageText = `🚀 <b>Nouvelle Publication</b>\n\nUn post pour <b>${safeTitle}</b> a été publié sur <b>Pinterest</b> directement.`
            if (imageUrl && !isVideo) {
                sendTelegramPhoto(imageUrl, messageText).catch(console.error)
            } else {
                sendTelegramMessage(messageText).catch(console.error)
            }

            return NextResponse.json({
                success: true,
                message: 'Épingle Pinterest publiée avec succès !',
                pinterest: pinterestResult
            })
        }

        const payload = {
            batch: platformsArray.map(p => ({
                ...baseItem,
                platform: p
            }))
        }

        // Envoyer au webhook n8n
        void('[N8N PUBLISH] Sending payload to:', N8N_WEBHOOK_URL);

        // Timeout de 60 secondes (n8n publie sur les réseaux sociaux, ça prend du temps)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        let n8nRes;
        try {
            n8nRes = await fetch(N8N_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal
            })
        } catch (fetchError: any) {
            console.error('[N8N PUBLISH] Fetch failed:', fetchError);
            if (fetchError.name === 'AbortError') {
                return NextResponse.json({ error: 'Le serveur n8n ne répond pas (Timeout 10s)' }, { status: 504 })
            }
            return NextResponse.json({
                error: `Impossible de contacter n8n (${N8N_WEBHOOK_URL}). Vérifiez que le serveur n8n est allumé et accessible.`,
                details: fetchError.message
            }, { status: 502 })
        } finally {
            clearTimeout(timeoutId);
        }

        if (!n8nRes.ok) {
            const errText = await n8nRes.text()
            console.error('[N8N PUBLISH] n8n error response:', errText);
            return NextResponse.json({ error: `n8n a retourné une erreur: ${errText}` }, { status: 502 })
        }

        const n8nData = await n8nRes.json().catch(() => ({}))

        // Envoyer la notification Telegram
        const platformLabel = platform === 'all'
            ? 'toutes les plateformes'
            : platform === 'tiktok'
                ? 'TikTok'
                : platform === 'pinterest'
                    ? 'Pinterest'
                    : platform === 'both' || platform === 'all'
                        ? 'Toutes les plateformes'
                        : platform.charAt(0).toUpperCase() + platform.slice(1);

        const safeTitle = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const messageText = scheduleAt
            ? `📅 <b>Publication Programmée</b>\n\nUn post pour <b>${safeTitle}</b> a été programmé sur <b>${platformLabel}</b> via n8n.\n🕒 <b>Date:</b> ${new Date(scheduleAt).toLocaleString('fr-FR')}`
            : `🚀 <b>Nouvelle Publication</b>\n\nUn post pour <b>${safeTitle}</b> a été envoyé à n8n pour publication immédiate sur <b>${platformLabel}</b>.`;

        if (imageUrl && !isVideo) {
            sendTelegramPhoto(imageUrl, messageText).catch(console.error);
        } else {
            sendTelegramMessage(messageText).catch(console.error);
        }

        return NextResponse.json({
            success: true,
            message: scheduleAt ? `Programmé pour ${scheduleAt}` : 'Envoyé à n8n pour publication',
            n8n: n8nData,
            pinterest: pinterestResult
        })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erreur interne'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
