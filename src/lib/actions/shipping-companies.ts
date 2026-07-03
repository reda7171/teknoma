'use server'

import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/actions/auth'
import { revalidatePath } from 'next/cache'
import { updateSetting } from '@/lib/actions/site-settings'

export async function getShippingCompanies() {
    try {
        await verifyAdmin()
        return await prisma.shippingCompany.findMany({
            orderBy: { createdAt: 'desc' }
        })
    } catch (error) {
        console.error('Erreur getShippingCompanies:', error)
        return []
    }
}

export async function createShippingCompany(data: { name: string; logo?: string; apiKey?: string; apiUrl?: string; isActive: boolean; supportPhone?: string }) {
    try {
        await verifyAdmin()
        await prisma.shippingCompany.create({ data })
        revalidatePath('/admin/config/shipping-companies')
        return { success: true }
    } catch (error: any) {
        console.error('Erreur createShippingCompany:', error)
        return { success: false, error: error.message }
    }
}

export async function updateShippingCompany(id: string, data: { name?: string; logo?: string; apiKey?: string; apiUrl?: string; isActive?: boolean; supportPhone?: string }) {
    try {
        await verifyAdmin()
        await prisma.shippingCompany.update({
            where: { id },
            data
        })
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
