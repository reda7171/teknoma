/**
 * Service d'intégration pour WITHYOU API
 * Basé sur la documentation documentation_withyou_livraison
 */

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
    private config: WithYouConfig

    constructor() {
        this.config = {
            key: process.env.WITHYOU_API_KEY || '6ce75dfde8bf10be41b5e0a7109e77ca',
            token: process.env.WITHYOU_API_TOKEN || '365062ce0f2131a681e52bc0b90586fe348881ac21ad1af64f5c43b2cb4e7f04'
        }
    }

    private async request(endpoint: string, data: any = {}, method: 'POST' | 'GET' = 'POST') {
        let url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`

        const bodyData: any = {
            key: this.config.key,
            token: this.config.token,
            ...data
        }

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 15000)

        try {
            const fetchOptions: RequestInit = {
                method,
                headers: { 
                    'Accept': 'application/json'
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
                fetchOptions.headers = {
                    ...fetchOptions.headers,
                    'Content-Type': 'application/json'
                }
                fetchOptions.body = JSON.stringify(bodyData)
            }

            void(`[WithYou] ${method} ${url}`)

            const response = await fetch(url, fetchOptions)
            const bodyText = await response.text()
            
            void(`[WithYou] Response status: ${response.status}`)
            
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
                console.error(`[WithYou] ❌ API Error (${response.status}):`, bodyText)
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
    async getCities() {
        try {
            const res = await this.request('/getville', {}, 'GET')
            // console.log('[WithYou] Raw cities response type:', typeof res)
            
            let cityList: string[] = []

            if (Array.isArray(res)) {
                cityList = res.map((v: any) => v.ville || v)
            } else if (res?.data && Array.isArray(res.data)) {
                cityList = res.data.map((v: any) => v.ville || v)
            }

            // Filtrer les doublons et les valeurs vides
            cityList = Array.from(new Set(cityList.filter(v => v && typeof v === 'string')))

            if (cityList.length > 0) return cityList

            // Fallback si l'API ne renvoie rien
            return [
                "Casablanca", "Rabat", "Marrakech", "Fes", "Tangier", "Agadir", "Meknes", "Oujda", "Kenitra", "Tetouan",
                "Safi", "Mohammedia", "Khouribga", "El Jadida", "Beni Mellal", "Nador", "Taza", "Settat", "Berrechid",
                "Khemisset", "Inezgane", "Ksar El Kebir", "Larache", "Guelmim", "Berkane", "Khenifra", "Sidi Kacem",
                "Sidi Slimane", "Errachidia", "Taroudant", "Ouarzazate", "Tiznit", "Youssoufia", "Ben Guerir", "Tan-Tan",
                "Ouazzane", "Guercif", "Dakhla", "Laayoune", "Oulad Teima", "Sidi Ifni"
            ]
        } catch (error) {
            console.error('[WithYou] Error fetching cities:', error)
            return [
                "Casablanca", "Rabat", "Marrakech", "Fes", "Tangier", "Agadir", "Meknes", "Oujda", "Kenitra", "Tetouan",
                "Safi", "Mohammedia", "Khouribga", "El Jadida", "Beni Mellal", "Nador", "Taza", "Settat", "Berrechid",
                "Khemisset", "Inezgane", "Ksar El Kebir", "Larache", "Guelmim", "Berkane", "Khenifra", "Sidi Kacem",
                "Sidi Slimane", "Errachidia", "Taroudant", "Ouarzazate", "Tiznit", "Youssoufia", "Ben Guerir", "Tan-Tan",
                "Ouazzane", "Guercif", "Dakhla", "Laayoune", "Oulad Teima", "Sidi Ifni"
            ]
        }
    }

    /**
     * Créer un ou plusieurs colis
     */
    async createPackage(data: WithYouPackageData | WithYouPackageData[]) {
        const payload = Array.isArray(data) ? data : [data]
        return this.request('/savecolis', { data: payload })
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
        return this.request('/getstatus', { data: trackingIDs }, 'POST')
    }
}

export const withyouService = new WithYouService()
