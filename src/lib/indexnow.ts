import { prisma } from '@/lib/prisma'

export const DEFAULT_INDEXNOW_KEY = 'a918d1a2e64740c2b085b754a73fabbe'
export const DEFAULT_HOST = 'tekno.ma'

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
        const siteUrl = process.env.NEXTAUTH_URL || 'https://tekno.ma'
        const url = new URL(siteUrl)
        return url.hostname
    } catch {
        return DEFAULT_HOST
    }
}

/**
 * Soumettre une liste d'URLs complètes au protocole IndexNow
 */
export async function submitUrlsToIndexNow(urls: string[]): Promise<{ success: boolean; status?: number; error?: string }> {
    if (!urls || urls.length === 0) {
        return { success: true }
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

    try {
        const response = await fetch('https://api.indexnow.org/indexnow', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8'
            },
            body: JSON.stringify(payload),
            cache: 'no-store'
        })

        if (response.ok || response.status === 200 || response.status === 202) {
            console.info(`[IndexNow] ${uniqueUrls.length} URL(s) soumise(s) avec succès pour ${host}`)
            return { success: true, status: response.status }
        } else {
            const errText = await response.text()
            console.warn(`[IndexNow] Réponse inattendue (${response.status}):`, errText)
            return { success: false, status: response.status, error: errText }
        }
    } catch (err: any) {
        console.error('[IndexNow] Erreur réseau:', err.message || err)
        return { success: false, error: err.message || 'Erreur réseau IndexNow' }
    }
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

    submitUrlsToIndexNow(urls).catch((err) => {
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

    submitUrlsToIndexNow(urls).catch((err) => {
        console.error(`[IndexNow] Échec notification pack ${packId}:`, err)
    })
}
