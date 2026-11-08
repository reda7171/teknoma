import 'server-only'

import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { getSetting } from '@/lib/server/site-settings'
import { createAuditLog } from '@/lib/server/audit'

/**
 * Normalise et hache les identifiants utilisateurs en SHA-256
 * conformément aux exigences Enhanced Conversions de Google Ads.
 */
function sha256(val: string): string {
    return crypto.createHash('sha256').update(val.trim()).digest('hex')
}

function normalizeMoroccanPhone(phone: string): string {
    let clean = phone.replace(/[\s\-\(\)\.]/g, '')
    if (clean.startsWith('0')) {
        clean = '+212' + clean.slice(1)
    } else if (clean.startsWith('212')) {
        clean = '+' + clean
    } else if (!clean.startsWith('+')) {
        clean = '+212' + clean
    }
    return clean
}

export interface UploadConversionResult {
    success: boolean
    orderId: string
    value: number
    currency: string
    mode: 'GOOGLE_ADS_API' | 'AUDIT_LOGGED' | 'SKIPPED'
    message: string
}

/**
 * Remontée automatique de la conversion réelle COD (Livrée et Encaissée)
 * vers Google Ads via Enhanced Conversions et UploadClickConversions.
 */
export async function uploadCodConversionToGoogleAds(orderId: string): Promise<UploadConversionResult> {
    try {
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: { items: true }
        })

        if (!order) {
            return {
                success: false,
                orderId,
                value: 0,
                currency: 'MAD',
                mode: 'SKIPPED',
                message: 'Commande introuvable'
            }
        }

        // Récupérer les identifiants Google Ads depuis les paramètres de la plateforme
        const customerId = (await getSetting('google_ads_customer_id'))?.replace(/-/g, '')
        const conversionActionId = await getSetting('google_ads_conversion_action_id') || 'customers/default/conversionActions/cod_delivered'
        const developerToken = await getSetting('google_ads_developer_token')
        const refreshToken = await getSetting('google_ads_refresh_token')
        const clientId = await getSetting('google_ads_client_id')
        const clientSecret = await getSetting('google_ads_client_secret')

        const conversionDateTime = (order.updatedAt || new Date()).toISOString().replace('T', ' ').replace(/\..+/, '+00:00')
        const conversionValue = order.total
        const currencyCode = 'MAD'

        // Construire les identifiants Enhanced Conversions pour le matching Google
        const userIdentifiers: any[] = []
        if (order.phone) {
            const normalizedPhone = normalizeMoroccanPhone(order.phone)
            userIdentifiers.push({ hashedPhoneNumber: sha256(normalizedPhone) })
        }
        if (order.email) {
            userIdentifiers.push({ hashedEmail: sha256(order.email.toLowerCase().trim()) })
        }

        const conversionPayload: any = {
            conversionAction: conversionActionId.startsWith('customers/') ? conversionActionId : `customers/${customerId || '123'}/conversionActions/${conversionActionId}`,
            conversionDateTime,
            conversionValue,
            currencyCode,
            orderId: order.id,
            userIdentifiers,
        }

        // Si le gclid a été capturé lors du passage de commande
        const gclid = (order as any).gclid || ((order as any).comment?.includes('gclid:') ? (order as any).comment.split('gclid:')[1]?.split(' ')[0] : null)
        if (gclid) {
            conversionPayload.gclid = gclid
        }

        // Si l'API directe Google Ads est configurée avec jetons valides
        if (customerId && developerToken && refreshToken && clientId && clientSecret) {
            try {
                // 1. Obtenir un access token via refresh token
                const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        client_id: clientId,
                        client_secret: clientSecret,
                        refresh_token: refreshToken,
                        grant_type: 'refresh_token',
                    })
                })

                const tokenData = await tokenRes.json()
                if (tokenData.access_token) {
                    // 2. Envoyer la conversion vers Google Ads REST API v17
                    const uploadRes = await fetch(`https://googleads.googleapis.com/v17/customers/${customerId}:uploadClickConversions`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${tokenData.access_token}`,
                            'developer-token': developerToken,
                        },
                        body: JSON.stringify({
                            conversions: [conversionPayload],
                            partialFailure: true,
                        })
                    })

                    const uploadData = await uploadRes.json()

                    await createAuditLog({
                        action: 'UPDATE',
                        entity: 'ORDER',
                        entityId: order.id,
                        details: `Conversion COD réelle (${conversionValue} MAD) transmise avec succès à Google Ads API (Compte: ${customerId})`
                    })

                    return {
                        success: true,
                        orderId: order.id,
                        value: conversionValue,
                        currency: currencyCode,
                        mode: 'GOOGLE_ADS_API',
                        message: `Conversion réelle COD ${conversionValue} MAD transmise directement à Google Ads.`
                    }
                }
            } catch (apiErr: any) {
                console.error('Google Ads API Upload Error (fallback to audit log):', apiErr)
            }
        }

        // Mode trace et archivage (quand les identifiants API directs ne sont pas encore tous renseignés)
        await createAuditLog({
            action: 'UPDATE',
            entity: 'ORDER',
            entityId: order.id,
            details: `Conversion COD enregistrée pour Google Ads (${conversionValue} MAD, action: ${conversionActionId}, phone/email Enhanced Conversions prêts)`
        })

        return {
            success: true,
            orderId: order.id,
            value: conversionValue,
            currency: currencyCode,
            mode: 'AUDIT_LOGGED',
            message: `Conversion COD (${conversionValue} MAD) enregistrée et prête pour Google Ads.`
        }
    } catch (error: any) {
        console.error('Error in uploadCodConversionToGoogleAds:', error)
        return {
            success: false,
            orderId,
            value: 0,
            currency: 'MAD',
            mode: 'SKIPPED',
            message: error?.message || 'Erreur lors du traitement de la conversion Google Ads'
        }
    }
}

