'use server'

import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/actions/auth'
import { revalidatePath } from 'next/cache'
import { getSetting } from '@/lib/server/site-settings'
import { updateSetting } from '@/lib/actions/site-settings'

export async function getShippingCompanies() {
    try {
        await verifyAdmin()
        const companies = await prisma.shippingCompany.findMany({
            orderBy: [
                { isActive: 'desc' },
                { createdAt: 'desc' }
            ]
        })

        const revenues = await prisma.order.groupBy({
            by: ['shippingCompany'],
            _sum: {
                shippingFees: true
            },
            where: {
                shippingCompany: { not: null },
                status: {
                    in: ['SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED']
                }
            }
        })

        const revenueMap = new Map(revenues.map(r => [r.shippingCompany, r._sum.shippingFees || 0]))

        const withYouToken = await getSetting('withyou_api_token')

        return companies.map(c => ({
            ...c,
            apiToken: c.name.toLowerCase().includes('withyou') ? withYouToken || '' : '',
            revenue: revenueMap.get(c.id) || 0
        }))
    } catch (error) {
        console.error('Erreur getShippingCompanies:', error)
        return []
    }
}

export async function createShippingCompany(data: { name: string; logo?: string; apiKey?: string; apiToken?: string; apiUrl?: string; isActive: boolean; supportPhone?: string }) {
    try {
        await verifyAdmin()
        const { apiToken, ...companyData } = data
        await prisma.shippingCompany.create({ data: companyData })
        if (data.name.toLowerCase().includes('withyou')) {
            await Promise.all([
                updateSetting('withyou_api_key', data.apiKey || '', 'delivery', 'Clé API WithYou'),
                updateSetting('withyou_api_token', apiToken || '', 'delivery', 'Token API WithYou')
            ])
        }
        revalidatePath('/admin/config/shipping-companies')
        return { success: true }
    } catch (error: any) {
        console.error('Erreur createShippingCompany:', error)
        return { success: false, error: error.message }
    }
}

export async function updateShippingCompany(id: string, data: { name?: string; logo?: string; apiKey?: string; apiToken?: string; apiUrl?: string; isActive?: boolean; supportPhone?: string }) {
    try {
        await verifyAdmin()
        const existing = await prisma.shippingCompany.findUnique({ where: { id }, select: { name: true, apiKey: true } })
        const { apiToken, ...companyData } = data
        await prisma.shippingCompany.update({
            where: { id },
            data: companyData
        })
        const companyName = data.name || existing?.name || ''
        if (companyName.toLowerCase().includes('withyou')) {
            const credentialUpdates: Promise<unknown>[] = []
            if (data.apiKey !== undefined) {
                credentialUpdates.push(updateSetting('withyou_api_key', data.apiKey, 'delivery', 'Clé API WithYou'))
            }
            if (apiToken !== undefined) {
                credentialUpdates.push(updateSetting('withyou_api_token', apiToken, 'delivery', 'Token API WithYou'))
            }
            await Promise.all(credentialUpdates)
        }
        revalidatePath('/admin/config/shipping-companies')
        return { success: true }
    } catch (error: any) {
        console.error('Erreur updateShippingCompany:', error)
        return { success: false, error: error.message }
    }
}

export async function deleteShippingCompany(id: string) {
    try {
        await verifyAdmin()
        await prisma.shippingCompany.delete({ where: { id } })
        revalidatePath('/admin/config/shipping-companies')
        return { success: true }
    } catch (error: any) {
        console.error('Erreur deleteShippingCompany:', error)
        return { success: false, error: error.message }
    }
}

export async function setDefaultShippingCompany(id: string) {
    try {
        await verifyAdmin()
        await updateSetting('DEFAULT_SHIPPING_COMPANY_ID', id, 'shipping', 'ID de la société de livraison par défaut')
        revalidatePath('/admin/config/shipping-companies')
        return { success: true }
    } catch (error: any) {
        console.error('Erreur setDefaultShippingCompany:', error)
        return { success: false, error: error.message }
    }
}
