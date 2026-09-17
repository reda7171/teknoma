import { getSetting } from '@/lib/actions/site-settings'

export class JumiaAPI {
    private baseUrl: string
    private email: string
    private apiKey: string
    private accessToken: string | null = null

    constructor(email: string, apiKey: string, environment: string) {
        this.email = email // Now holds Client ID
        this.apiKey = apiKey // Now holds Refresh Token
        this.baseUrl = environment === 'live' 
            ? 'https://vendor-api.jumia.com' 
            : 'https://vendor-api-staging.jumia.com'
    }

    static async getInstance() {
        const enabled = await getSetting('jumia_enabled', 'false')
        if (enabled !== 'true') return null

        const email = await getSetting('jumia_email', '')
        const apiKey = await getSetting('jumia_api_key', '')
        const env = await getSetting('jumia_environment', 'sandbox')

        if (!email || !apiKey) return null

        const instance = new JumiaAPI(email, apiKey, env || 'sandbox')
        try {
            await instance.refreshAccessToken()
        } catch (error) {
            console.error('Failed to initialize Jumia API (network or auth error):', error)
            return null
        }
        return instance
    }

    private async refreshAccessToken() {
        const response = await fetch(`${this.baseUrl}/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: this.email,
                refresh_token: this.apiKey,
                grant_type: 'refresh_token'
            })
        })

        if (!response.ok) {
            console.error('Jumia Auth Error:', await response.text())
            throw new Error('Impossible de générer le jeton Jumia (Refresh Token invalide ou expiré)')
        }

        const data = await response.json()
        this.accessToken = data.access_token
    }

    private async request(endpoint: string, method: string = 'GET', body?: any, retries: number = 3): Promise<any> {
        // Nouvelle API Jumia Vendor utilise Bearer Token
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.accessToken}`
            },
            body: body ? JSON.stringify(body) : undefined,
            cache: 'no-store'
        })

        if (!response.ok) {
            const errText = await response.text()
            
            if (response.status === 429 && retries > 0) {
                console.warn(`Rate limit Jumia atteint. Nouvelle tentative dans 2 secondes... (${retries} restantes)`);
                await new Promise(resolve => setTimeout(resolve, 2000));
                return this.request(endpoint, method, body, retries - 1);
            }
            
            console.warn(`Erreur API Jumia (${response.status}):`, errText)
            
            throw new Error(`Erreur API Jumia: ${response.statusText} - ${errText}`)
        }

        const contentType = response.headers.get('content-type') || ''
        let data: any
        
        if (contentType.includes('application/pdf') || contentType.includes('application/zip') || contentType.includes('application/octet-stream') || contentType.includes('application/x-zip-compressed')) {
            const arrayBuffer = await response.arrayBuffer()
            const base64 = Buffer.from(arrayBuffer).toString('base64')
            data = { document: base64, contentType }
        } else {
            const text = await response.text()
            try {
                data = JSON.parse(text)
            } catch (e) {
                data = { raw: text }
            }
        }


        return data
    }

    // --- Endpoints Authentication ---

    async login(password: string) {
        return this.request('/login', 'POST', { email: this.email, password })
    }



    async getToken(clientId: string, clientSecret: string) {
        return this.request('/token', 'POST', { 
            client_id: clientId, 
            client_secret: clientSecret, 
            grant_type: 'client_credentials' 
        })
    }

    async getOrders(size = 100, token?: string, status?: string, createdAfter?: string, createdBefore?: string) {
        const formatDate = (d: string) => {
            const date = new Date(d);
            if (isNaN(date.getTime())) return d;
            return date.toISOString().split('.')[0] + '+0000';
        }

        let url = `/orders?size=${size}`
        if (token) {
            url += `&token=${token}`
        }
        if (status) {
            // L'API Jumia utilise l'Alternative Name (minuscule, tirets)
            url += `&status=${status}`
        }
        if (createdAfter) {
            url += `&createdAfter=${encodeURIComponent(formatDate(createdAfter))}`
        }
        if (createdBefore) {
            url += `&createdBefore=${encodeURIComponent(formatDate(createdBefore))}`
        }
        return this.request(url)
    }

    async getOrderItems(orderId: string) {
        // Jumia API attend orderId (camelCase) dans la query string
        return this.request(`/orders/items?orderId=${orderId}`)
    }

    async packOrders(payload: any) {
        return this.request('/v2/orders/pack', 'POST', payload)
    }

    async readyToShipOrders(payload: any) {
        return this.request('/orders/ready-to-ship', 'POST', payload)
    }

    async printLabels(payload: any) {
        return this.request(`/orders/print-labels?orderId=${payload.orderId}`, 'POST', payload)
    }

    async printInvoice(payload: any) {
        return this.request(`/orders/print-invoice?orderId=${payload.orderId}`, 'POST', payload)
    }

    async cancelOrders(orderItemIds: string[]) {
        return this.request('/orders/cancel', 'PUT', { orderItemIds })
    }

    async getShipmentProviders(orderItemIds: string[]) {
        const query = orderItemIds.map(id => `orderItemId=${encodeURIComponent(id)}`).join('&')
        return this.request(`/orders/shipment-providers?${query}`)
    }

    async getPayoutStatements(params: {
        createdAfter?: string;
        page?: number;
        size?: number;
        paid?: boolean;
        country?: string;
        currency?: 'LOCAL' | 'USD';
    } = {}) {
        const queryParams = new URLSearchParams()
        if (params.createdAfter) queryParams.append('createdAfter', params.createdAfter)
        if (params.page) queryParams.append('page', params.page.toString())
        if (params.size) queryParams.append('size', params.size.toString())
        if (params.paid !== undefined) queryParams.append('paid', params.paid.toString())
        if (params.country) queryParams.append('country', params.country)
        if (params.currency) queryParams.append('currency', params.currency)
        else queryParams.append('currency', 'LOCAL')

        const queryString = queryParams.toString()
        return this.request(`/payout-statement${queryString ? `?${queryString}` : ''}`)
    }

    async createConsignmentOrder(payload: {
        shopId: string;
        businessClientCode: string;
        shippingDate: string;
        comment?: string;
        products: any[];
    }) {
        return this.request('/consignment-order', 'POST', payload)
    }

    async updateConsignmentOrder(purchaseOrderNumber: string, payload: {
        isShipped: boolean;
        trackingNumber?: string;
        actualDepartureDate?: string;
        estimatedArrivalDate?: string;
        deliveryAgentPhoneNumber?: string;
        '3plName'?: string;
    }) {
        return this.request(`/consignment-order/${purchaseOrderNumber}`, 'PATCH', payload)
    }

    async getConsignmentStock(businessClientCode: string, sku: string) {
        return this.request(`/consignment-stock?businessClientCode=${encodeURIComponent(businessClientCode)}&sku=${encodeURIComponent(sku)}`)
    }

    async getShops() {
        return this.request('/shops')
    }

    async getShopsOfMasterShop() {
        return this.request('/shops-of-master-shop')
    }

    // --- Endpoints Feeds (Products) ---

    async getFeed(id: string) {
        return this.request(`/feeds/${id}`)
    }

    async updateProductsStock(products: any[]) {
        return this.request('/feeds/products/stock', 'POST', { products })
    }

    async updateProductsPrice(products: any[]) {
        return this.request('/feeds/products/price', 'POST', { products })
    }

    async updateProductsStatus(products: any[]) {
        return this.request('/feeds/products/status', 'POST', { products })
    }

    async createProducts(shopId: string, products: any[]) {
        return this.request('/feeds/products/create', 'POST', { shopId, products })
    }

    async updateProducts(products: any[], shopId?: string) {
        const payload: any = { products }
        if (shopId) payload.shopId = shopId
        return this.request('/feeds/products/update', 'POST', payload)
    }

    async updateProductsStatus(products: any[]) {
        return this.request('/feeds/products/status', 'POST', { products })
    }

    // --- Endpoints Produits (Catalog) ---

    async getBrands(page = 1) {
        return this.request(`/catalog/brands?page=${page}`)
    }

    async getCategories(page = 1, attributeSetName?: string) {
        const query = new URLSearchParams()
        if (page) query.append('page', page.toString())
        if (attributeSetName) query.append('attributeSetName', attributeSetName)
        const queryString = query.toString()
        return this.request(`/catalog/categories${queryString ? `?${queryString}` : ''}`)
    }

    async getProducts(params: {
        token?: string;
        size?: number;
        sids?: string[];
        categoryCode?: number;
        createdAtFrom?: string;
        createdAtTo?: string;
        sellerSku?: string;
        shopId?: string;
    } = {}) {
        const query = new URLSearchParams()
        if (params.token) query.append('token', params.token)
        if (params.size) query.append('size', params.size.toString())
        if (params.sids && params.sids.length) params.sids.forEach(sid => query.append('sids', sid))
        if (params.categoryCode) query.append('categoryCode', params.categoryCode.toString())
        if (params.createdAtFrom) query.append('createdAtFrom', params.createdAtFrom)
        if (params.createdAtTo) query.append('createdAtTo', params.createdAtTo)
        if (params.sellerSku) query.append('sellerSku', params.sellerSku)
        if (params.shopId) query.append('shopId', params.shopId)

        const queryString = query.toString()
        return this.request(`/catalog/products${queryString ? `?${queryString}` : ''}`)
    }

    async getAttributeSets(id: string) {
        return this.request(`/catalog/attribute-sets/${encodeURIComponent(id)}`)
    }

    async getCatalogStock(params: {
        sku?: string;
        sellerSku?: string;
        shopId?: string;
        token?: string;
        size?: number;
        productSids?: string[];
    } = {}) {
        const query = new URLSearchParams()
        if (params.sku) query.append('sku', params.sku)
        if (params.sellerSku) query.append('sellerSku', params.sellerSku)
        if (params.shopId) query.append('shopId', params.shopId)
        if (params.token) query.append('token', params.token)
        if (params.size) query.append('size', params.size.toString())
        if (params.productSids && params.productSids.length) params.productSids.forEach(sid => query.append('productSids', sid))

        const queryString = query.toString()
        return this.request(`/catalog/stock${queryString ? `?${queryString}` : ''}`)
    }

    // --- Endpoints Consignation (Consignment) ---
}
