/**
 * Service d'intégration pour WITHYOU API
 * Basé sur la documentation documentation_withyou_livraison
 */

import { MOROCCO_CITIES, WITHYOU_CITIES } from '@/lib/constants/cities'

const BASE_URL = 'https://new.withyou.ma/api-rest'

interface WithYouConfig {
    key: string
    token: string
}

interface WithYouPackageData {
    villedest: string
    nomdest: string
    teldest: string
    adressedest: string
    prixcolis: string
    refcolis: string
    observation: string
}

class WithYouService {
    private async getCredentials(): Promise<WithYouConfig> {
        const envKey = process.env.WITHYOU_API_KEY?.trim()
        const envToken = process.env.WITHYOU_API_TOKEN?.trim()
        let key = envKey
        let token = envToken

        try {
            const { getSetting } = await import('@/lib/server/site-settings')
            const [withYouKey, withYouToken, legacyKey, legacyToken] = await Promise.all([
                getSetting('withyou_api_key'),
                getSetting('withyou_api_token'),
                getSetting('delivery_api_key'),
                getSetting('delivery_api_token')
            ])

            // Ne jamais mélanger une ancienne clé générique avec un token WithYou
            // actuel. Les réglages dédiés sont prioritaires, puis l'environnement.
            key = withYouKey?.trim() || envKey || legacyKey?.trim()
            token = withYouToken?.trim() || envToken || legacyToken?.trim()
        } catch {
            // ignore siteSettings fetch failure
        }

        if (!key || !token) {
            throw new Error('Identifiants WithYou incomplets. Configurez WITHYOU_API_KEY et WITHYOU_API_TOKEN.')
        }

        return { key, token }
    }

    private async request(endpoint: string, data: any = {}, method: 'POST' | 'GET' = 'POST') {
        const creds = await this.getCredentials()
        let url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`

        const bodyData: any = {
            key: creds.key,
            token: creds.token,
            ...data
        }

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 15000)

        try {
            const fetchOptions: RequestInit = {
                method,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                signal: controller.signal
            }

            if (method === 'GET') {
                const params = new URLSearchParams()
                Object.entries(bodyData).forEach(([k, v]) => {
                    if (typeof v === 'object') {
                        params.append(k, JSON.stringify(v))
                    } else {
                        params.append(k, String(v))
                    }
                })
                url += `?${params.toString()}`
            } else {
                fetchOptions.body = JSON.stringify(bodyData)
            }

            const response = await fetch(url, fetchOptions)
            const bodyText = await response.text()

            let parsed
            try {
                parsed = JSON.parse(bodyText)
            } catch (e) {
                if (bodyText.includes('<!DOCTYPE html>')) {
                    console.error(`[WithYou] Received HTML instead of JSON from ${endpoint}.`)
                }
                return bodyText
            }

            if (!response.ok) {
                throw new Error(`Erreur API WithYou [${endpoint}]: ${parsed?.message || response.statusText}`)
            }

            return parsed
        } catch (error: any) {
            if (error.name === 'AbortError') {
                throw new Error(`Timeout lors de la requête WithYou ${endpoint} (15s)`)
            }
            throw error
        } finally {
            clearTimeout(timeoutId)
        }
    }

    /**
     * Liste des villes
     */
    async getCities(options: { fallback?: boolean } = {}): Promise<string[]> {
        const { fallback = true } = options
        try {
            // L'API WithYou attend la clé et le token dans le corps JSON via POST
            const res = await this.request('/getvilles', {}, 'POST')
            if (res && typeof res === 'object' && (res.status === 'error' || res.erreur)) {
                throw new Error(res.message || 'Erreur WithYou')
            }

            let cityList: string[] = []

            if (Array.isArray(res)) {
                cityList = res.map((v: any) => v.ville || v)
            } else if (res?.data && Array.isArray(res.data)) {
                cityList = res.data.map((v: any) => v.ville || v)
            }

            // Filtrer les doublons et les valeurs vides
            cityList = Array.from(new Set(cityList.filter((v: any) => v && typeof v === 'string')))

            if (cityList.length > 0) return cityList

            if (fallback) return [...WITHYOU_CITIES]
            throw new Error("L'API WithYou n'a retourné aucune ville.")
        } catch (error: any) {
            // En cas d'accès refusé ou offline, renvoyer la liste officielle des villes WithYou
            if (fallback) return [...WITHYOU_CITIES]
            const message = String(error?.message || '')
            if (message.toLowerCase().includes('acces refuse') || message.toLowerCase().includes('accès refusé')) {
                throw new Error('Accès refusé par WithYou. Vérifiez la clé et le token API réellement utilisés.')
            }
            throw error
        }
    }

    /**
     * Créer un ou plusieurs colis
     */
    async createPackage(data: WithYouPackageData | WithYouPackageData[]) {
        const payload = Array.isArray(data) ? data : [data]
        try {
            const res = await this.request('/savecolis', { data: payload }, 'POST')
            if (res && typeof res === 'object' && res.status === 'error') {
                throw new Error(res.message || 'Erreur WithYou')
            }
            return res
        } catch (error: any) {
            if (error?.message?.includes('Acces refuse')) {
                throw new Error('Accès refusé par WithYou (401/403). Veuillez vérifier vos identifiants WITHYOU_API_KEY et WITHYOU_API_TOKEN dans la configuration.')
            }
            throw error
        }
    }

    /**
     * Modifier statut
     */
    async updateStatus(codetracking: string, status: string) {
        const response = await this.request('/updatstatus', { codetracking, status }, 'POST')
        if (!response || typeof response !== 'object' || String(response.code) !== '200' || response.status !== 'success') {
            throw new Error(response?.message || `WithYou n'a pas confirmé la modification du statut ${codetracking}`)
        }
        return response
    }

    /**
     * Obtenir tous les statuts possibles
     */
    async getAllStatus() {
        return this.request('/getallstatus', {}, 'GET')
    }

    /**
     * Obtenir le statut des colis
     */
    async getStatus(trackingIDs: string[]) {
        const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());
        const validIDs = trackingIDs
            .map(id => String(id || '').trim())
            .filter(id => id.length > 0 && !isUuid(id));

        if (validIDs.length === 0) {
            return { status: 'success', data: [] };
        }

        try {
            // L'API WithYou attend un tableau de chaînes: { key, token, data: [codetracking1, codetracking2] }
            const res = await this.request('/getstatus', { data: validIDs }, 'POST')
            if (res && typeof res === 'object' && res.status === 'error') {
                throw new Error(res.message || 'Erreur WithYou')
            }

            const bulkItems = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : []
            if (bulkItems.length > 0) {
                const mapped = bulkItems.map((item: any) => ({
                    id: item.id || item.code_tracking || item.codetracking || item.trackingID,
                    codetracking: item.id || item.code_tracking || item.codetracking || item.trackingID,
                    statut: item.statut || item.status,
                    status: item.statut || item.status,
                    message: item.message
                }))
                return { status: 'success', data: mapped }
            }
            return { status: 'success', data: [] }
        } catch (error: any) {
            // Si un des tracking codes est rejeté en lot (403), interroger un par un
            const individualItems: any[] = []
            for (const codetracking of validIDs) {
                try {
                    const single = await this.request('/getstatus', { data: [codetracking] }, 'POST')
                    const candidates = Array.isArray(single) ? single : Array.isArray(single?.data) ? single.data : []
                    for (const candidate of candidates) {
                        individualItems.push({
                            id: candidate.id || candidate.code_tracking || candidate.codetracking || codetracking,
                            codetracking: candidate.id || candidate.code_tracking || candidate.codetracking || codetracking,
                            statut: candidate.statut || candidate.status,
                            status: candidate.statut || candidate.status,
                            message: candidate.message
                        })
                    }
                } catch {
                    // Ignorer ce code invalide individuellement
                }
            }

            if (individualItems.length > 0) {
                return { status: 'success', data: individualItems }
            }

            const msg = error?.message || ''
            if (msg.includes('fetch failed') || msg.includes('ENOTFOUND') || msg.includes('ETIMEDOUT')) {
                throw new Error('API WithYou indisponible ou inaccessible.')
            }
            return { status: 'success', data: [] }
        }
    }
}

export const withyouService = new WithYouService()
