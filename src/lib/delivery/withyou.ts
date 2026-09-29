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
        let key = process.env.WITHYOU_API_KEY
        let token = process.env.WITHYOU_API_TOKEN

        try {
            const { getSetting } = await import('@/lib/actions/site-settings')
            const dbKey = (await getSetting('delivery_api_key')) || (await getSetting('withyou_api_key'))
            const dbToken = (await getSetting('delivery_api_token')) || (await getSetting('withyou_api_token'))
            if (dbKey) key = dbKey
            if (dbToken) token = dbToken
        } catch {
            // ignore siteSettings fetch failure
        }

        return {
            key: key || '6ce75dfde8bf10be41b5e0a7109e77ca',
            token: token || '365062ce0f2131a681e52bc0b90586fe348881ac21ad1af64f5c43b2cb4e7f04'
        }
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
    async getCities(): Promise<string[]> {
        try {
            // L'API WithYou attend la clé et le token dans le corps JSON via POST
            const res = await this.request('/getville', {}, 'POST')
            
            let cityList: string[] = []

            if (Array.isArray(res)) {
                cityList = res.map((v: any) => v.ville || v)
            } else if (res?.data && Array.isArray(res.data)) {
                cityList = res.data.map((v: any) => v.ville || v)
            }

            // Filtrer les doublons et les valeurs vides
            cityList = Array.from(new Set(cityList.filter((v: any) => v && typeof v === 'string')))

            if (cityList.length > 0) return cityList

            return [...WITHYOU_CITIES]
        } catch (error: any) {
            // En cas d'accès refusé ou offline, renvoyer la liste officielle des villes WithYou
            return [...WITHYOU_CITIES]
        }
    }

    /**
     * Créer un ou plusieurs colis
     */
    async createPackage(data: WithYouPackageData | WithYouPackageData[]) {
        const payload = Array.isArray(data) ? data : [data]
        try {
            return await this.request('/savecolis', { data: payload }, 'POST')
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
        return this.request('/updatstatus', { codetracking, status }, 'POST')
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
        const validIDs = trackingIDs.filter(id => id && id.trim() !== '');
        
        if (validIDs.length === 0) {
            // Avoid calling the API with an empty array which returns 403
            return { status: 'success', data: [] };
        }
        
        try {
            return await this.request('/getstatus', { data: validIDs }, 'POST')
        } catch (error: any) {
            // Handle the specific "Acces refuse" which usually means invalid tracking code or empty array
            if (error.message && error.message.includes('Acces refuse')) {
                
                // If we sent a batch, one invalid ID causes the whole batch to fail. Fallback to one-by-one.
                if (validIDs.length > 1) {
                    console.warn(`[WithYou] Batch failed with Acces refuse. Retrying one by one...`);
                    const results: any[] = [];
                    for (const id of validIDs) {
                        try {
                            const res = await this.request('/getstatus', { data: [id] }, 'POST');
                            if (res.data && Array.isArray(res.data)) {
                                results.push(...res.data);
                            }
                        } catch (e: any) {
                            // ignore single invalid ID
                        }
                    }
                    return { status: 'success', data: results };
                }

                console.warn(`[WithYou] Le code de suivi n'a pas été trouvé ou n'appartient pas au compte. (${validIDs.join(', ')})`);
                return { status: 'success', data: [] };
            }
            throw error;
        }
    }
}

export const withyouService = new WithYouService()
