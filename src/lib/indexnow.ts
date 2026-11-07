import { prisma } from '@/lib/prisma'

export const DEFAULT_INDEXNOW_KEY = 'a918d1a2e64740c2b085b754a73fabbe'
export const DEFAULT_HOST = 'riwaya.store'

export interface IndexNowSubmissionLog {
    timestamp: string
    status: 'SUCCESS' | 'ERROR'
    httpStatus: number
    submittedCount: number
    reason: string
    sampleUrls: string[]
    error?: string | null
}

export async function getIndexNowKey(): Promise<string> {
    try {
        const setting = await prisma.siteSettings.findUnique({
            where: { key: 'indexnow_key' }
        })
        return setting?.value?.trim() || DEFAULT_INDEXNOW_KEY
    } catch {
        return DEFAULT_INDEXNOW_KEY
    }
}

export async function getSiteHost(): Promise<string> {
    try {
        const siteUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://riwaya.store'
        const url = new URL(siteUrl)
        const hostname = url.hostname
        if (hostname.includes('localhost') || hostname.includes('127.0.0.1') || hostname.includes('0.0.0.0')) {
            return DEFAULT_HOST
        }
        return hostname
    } catch {
        return DEFAULT_HOST
    }
}

export async function getIndexNowSubmissionLog(): Promise<IndexNowSubmissionLog | null> {
    try {
        const setting = await prisma.siteSettings.findUnique({
            where: { key: 'seo_indexnow_last_submission' }
        })
        if (!setting?.value) return null
        return JSON.parse(setting.value) as IndexNowSubmissionLog
    } catch {
        return null
    }
}

async function recordSubmissionLog(data: IndexNowSubmissionLog) {
    try {
        const payload = JSON.stringify(data)
        await prisma.siteSettings.upsert({
            where: { key: 'seo_indexnow_last_submission' },
            create: {
                key: 'seo_indexnow_last_submission',
                value: payload,
                category: 'seo',
                description: 'Dernière soumission au protocole IndexNow (Bing, Yandex, Seznam, Naver)'
            },
            update: {
                value: payload
            }
        })
    } catch (err) {
        console.warn('[IndexNow] Impossible d\'enregistrer le log de soumission:', err)
    }
}

/**
 * Soumettre une liste d'URLs complètes au protocole IndexNow (Bing, Yandex, Seznam, Naver)
 */
export async function submitUrlsToIndexNow(
    urls: string[],
    reason: string = 'Mise à jour de contenu'
): Promise<{ success: boolean; status?: number; error?: string; submittedCount: number }> {
    if (!urls || urls.length === 0) {
        return { success: true, submittedCount: 0 }
    }

    const host = await getSiteHost()
    const key = await getIndexNowKey()
    const keyLocation = `https://${host}/${key}.txt`

    const uniqueUrls = Array.from(new Set(urls.filter(Boolean)))

    const payload = {
        host,
        key,
        keyLocation,
        urlList: uniqueUrls
    }

    // Si on est en environnement purement local de simulation sans domaine public joignable
    const isLocalSim = host === 'localhost' || host === '127.0.0.1'

    try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 6000)

        let response = await fetch('https://api.indexnow.org/indexnow', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8'
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
            cache: 'no-store'
        }).catch(async (fetchErr) => {
            // Fallback direct vers le point de terminaison Bing
            return await fetch('https://www.bing.com/indexnow', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json; charset=utf-8'
                },
                body: JSON.stringify(payload),
                signal: controller.signal,
                cache: 'no-store'
            }).catch(() => null)
        })

        clearTimeout(timeoutId)

        const isSuccess = response && (response.ok || response.status === 200 || response.status === 202)
        const httpStatus = response ? response.status : (isLocalSim ? 200 : 0)

        let errText: string | null = null
        if (response && !isSuccess) {
            errText = await response.text().catch(() => 'Erreur inconnue')
        }

        const logData: IndexNowSubmissionLog = {
            timestamp: new Date().toISOString(),
            status: isSuccess || isLocalSim ? 'SUCCESS' : 'ERROR',
            httpStatus,
            submittedCount: uniqueUrls.length,
            reason,
            sampleUrls: uniqueUrls.slice(0, 6),
            error: isSuccess ? null : (errText || (isLocalSim ? null : 'Échec de transmission réseau'))
        }

        await recordSubmissionLog(logData)

        if (isSuccess || isLocalSim) {
            console.info(`[IndexNow] ${uniqueUrls.length} URL(s) soumises avec succès (${reason}) pour ${host}`)
            return { success: true, status: httpStatus, submittedCount: uniqueUrls.length }
        } else {
            console.warn(`[IndexNow] Réponse inattendue (${httpStatus}):`, errText)
            return { success: false, status: httpStatus, error: errText || 'Réponse moteur inattendue', submittedCount: uniqueUrls.length }
        }
    } catch (err: any) {
        console.error('[IndexNow] Erreur réseau transmission:', err.message || err)
        const logData: IndexNowSubmissionLog = {
            timestamp: new Date().toISOString(),
            status: 'ERROR',
            httpStatus: 0,
            submittedCount: uniqueUrls.length,
            reason,
            sampleUrls: uniqueUrls.slice(0, 6),
            error: err.message || 'Erreur réseau IndexNow'
        }
        await recordSubmissionLog(logData)
        return { success: false, error: err.message || 'Erreur réseau IndexNow', submittedCount: uniqueUrls.length }
    }
}

/**
 * Notifie instantanément IndexNow lors de la mise à jour du programme vendeurs et partenaires B2B
 */
export async function submitSellerProgramToIndexNow(
    reason: string = 'Mise à jour programme vendeurs'
): Promise<{ success: boolean; status?: number; error?: string; submittedCount: number }> {
    const host = await getSiteHost()
    const baseUrl = `https://${host}`

    const urls = [
        `${baseUrl}/fr/devenir-vendeur`,
        `${baseUrl}/ar/devenir-vendeur`,
        `${baseUrl}/en/devenir-vendeur`,
        `${baseUrl}/fr/b2b`,
        `${baseUrl}/ar/b2b`,
        `${baseUrl}/en/b2b`,
        `${baseUrl}/sitemap-sellers.xml`,
        `${baseUrl}/sitemap.xml`
    ]

    return submitUrlsToIndexNow(urls, reason)
}

/**
 * Notifie instantanément IndexNow lors de l'ajout, modification ou échange sur la bourse aux livres
 */
export async function submitCommunityMarketToIndexNow(
    exchangeBookId?: string,
    reason: string = 'Mise à jour bourse aux livres'
): Promise<{ success: boolean; status?: number; error?: string; submittedCount: number }> {
    const host = await getSiteHost()
    const baseUrl = `https://${host}`

    const urls = [
        `${baseUrl}/fr/community/market`,
        `${baseUrl}/ar/community/market`,
        `${baseUrl}/en/community/market`,
        `${baseUrl}/fr/community`,
        `${baseUrl}/ar/community`,
        `${baseUrl}/en/community`,
        `${baseUrl}/sitemap.xml`
    ]

    if (exchangeBookId) {
        urls.push(
            `${baseUrl}/fr/community/books/${exchangeBookId}`,
            `${baseUrl}/ar/community/books/${exchangeBookId}`,
            `${baseUrl}/en/community/books/${exchangeBookId}`,
            `${baseUrl}/fr/community/market/${exchangeBookId}`,
            `${baseUrl}/ar/community/market/${exchangeBookId}`,
            `${baseUrl}/en/community/market/${exchangeBookId}`
        )
    }

    return submitUrlsToIndexNow(urls, reason)
}

/**
 * Soumettre automatiquement les URLs multilingues d'un livre
 */
export async function submitBookToIndexNow(bookId: string): Promise<void> {
    if (!bookId) return
    const host = await getSiteHost()
    const baseUrl = `https://${host}`

    const urls = [
        `${baseUrl}/fr/books/${bookId}`,
        `${baseUrl}/ar/books/${bookId}`,
        `${baseUrl}/en/books/${bookId}`,
        `${baseUrl}/fr/books`,
        `${baseUrl}/ar/books`,
        `${baseUrl}/en/books`
    ]

    submitUrlsToIndexNow(urls, `Mise à jour livre ${bookId}`).catch((err) => {
        console.error(`[IndexNow] Échec notification livre ${bookId}:`, err)
    })
}

/**
 * Soumettre automatiquement les URLs multilingues d'un pack
 */
export async function submitPackToIndexNow(packId: string): Promise<void> {
    if (!packId) return
    const host = await getSiteHost()
    const baseUrl = `https://${host}`

    const urls = [
        `${baseUrl}/fr/packs/${packId}`,
        `${baseUrl}/ar/packs/${packId}`,
        `${baseUrl}/en/packs/${packId}`,
        `${baseUrl}/fr/packs`,
        `${baseUrl}/ar/packs`,
        `${baseUrl}/en/packs`
    ]

    submitUrlsToIndexNow(urls, `Mise à jour pack ${packId}`).catch((err) => {
        console.error(`[IndexNow] Échec notification pack ${packId}:`, err)
    })
}
