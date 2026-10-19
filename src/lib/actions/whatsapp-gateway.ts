'use server'

import { verifyAdmin } from './auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { DEFAULT_WHATSAPP_TEMPLATES } from '@/lib/constants/whatsapp-templates'

const GATEWAY_URL = process.env.WHATSAPP_GATEWAY_URL || 'http://127.0.0.1:3001'

export interface WhatsAppGatewayStatusResponse {
    isRunning: boolean
    status: 'INITIALIZING' | 'SCAN_QR' | 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'OFFLINE'
    qr: string | null
    user: {
        id: string
        name: string
        phone: string
    } | null
    error?: string | null
}

export async function getWhatsAppGatewayStatus(): Promise<WhatsAppGatewayStatusResponse> {
    await verifyAdmin()

    try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3500)

        const res = await fetch(`${GATEWAY_URL}/status`, {
            cache: 'no-store',
            signal: controller.signal
        })
        clearTimeout(timeoutId)

        if (!res.ok) {
            return {
                isRunning: false,
                status: 'OFFLINE',
                qr: null,
                user: null,
                error: `Service HTTP ${res.status}`
            }
        }

        const data = await res.json()
        return {
            isRunning: true,
            status: data.status || 'DISCONNECTED',
            qr: data.qr || null,
            user: data.user || null,
            error: data.error || null
        }
    } catch {
        return {
            isRunning: false,
            status: 'OFFLINE',
            qr: null,
            user: null,
            error: 'Le service passerelle WhatsApp est éteint (scripts/whatsapp-gateway.js)'
        }
    }
}

export async function sendWhatsAppMessageViaGateway(phone: string, message: string) {
    await verifyAdmin()

    try {
        const res = await fetch(`${GATEWAY_URL}/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: phone, message })
        })

        const data = await res.json()
        return data
    } catch (err: any) {
        return { success: false, error: err.message || 'Impossible de joindre le serveur WhatsApp' }
    }
}

export async function disconnectWhatsAppGateway() {
    await verifyAdmin()

    try {
        const res = await fetch(`${GATEWAY_URL}/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        })
        const data = await res.json()
        revalidatePath('/[locale]/admin/whatsapp-gateway', 'page')
        return data
    } catch (err: any) {
        return { success: false, error: err.message || 'Erreur lors de la déconnexion' }
    }
}

export async function getWhatsAppGatewaySettings() {
    await verifyAdmin()

    const [autoPromoLead, autoOrderConfirm] = await Promise.all([
        prisma.siteSettings.findUnique({ where: { key: 'whatsapp_auto_promo_lead' } }).catch(() => null),
        prisma.siteSettings.findUnique({ where: { key: 'whatsapp_auto_order_confirm' } }).catch(() => null),
    ])

    return {
        autoPromoLead: autoPromoLead?.value !== 'false', // Default true
        autoOrderConfirm: autoOrderConfirm?.value !== 'false', // Default true
    }
}

export async function updateWhatsAppGatewaySetting(key: string, value: boolean) {
    await verifyAdmin()

    await prisma.siteSettings.upsert({
        where: { key },
        update: { value: value ? 'true' : 'false' },
        create: {
            key,
            value: value ? 'true' : 'false',
            category: 'whatsapp',
            description: 'Automatisation WhatsApp Gateway'
        }
    })

    revalidatePath('/[locale]/admin/whatsapp-gateway', 'page')
    return { success: true }
}

export async function getWhatsAppTemplates() {
    await verifyAdmin()

    const [promoLead, orderConfirm, abandonedCart] = await Promise.all([
        prisma.siteSettings.findUnique({ where: { key: 'whatsapp_template_promo_lead' } }).catch(() => null),
        prisma.siteSettings.findUnique({ where: { key: 'whatsapp_template_order_confirm' } }).catch(() => null),
        prisma.siteSettings.findUnique({ where: { key: 'whatsapp_template_abandoned_cart' } }).catch(() => null),
    ])

    return {
        whatsapp_template_promo_lead: promoLead?.value || DEFAULT_WHATSAPP_TEMPLATES.whatsapp_template_promo_lead,
        whatsapp_template_order_confirm: orderConfirm?.value || DEFAULT_WHATSAPP_TEMPLATES.whatsapp_template_order_confirm,
        whatsapp_template_abandoned_cart: abandonedCart?.value || DEFAULT_WHATSAPP_TEMPLATES.whatsapp_template_abandoned_cart,
    }
}

export async function updateWhatsAppTemplate(key: string, content: string) {
    await verifyAdmin()

    await prisma.siteSettings.upsert({
        where: { key },
        update: { value: content },
        create: {
            key,
            value: content,
            category: 'whatsapp',
            description: 'Modèle de message WhatsApp automatisé'
        }
    })

    revalidatePath('/[locale]/admin/whatsapp-gateway', 'page')
    return { success: true }
}

