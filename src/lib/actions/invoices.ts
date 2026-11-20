'use server'

import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/actions/auth'
import { revalidatePath } from 'next/cache'

export interface InvoiceItemData {
    id?: string
    title: string
    quantity: number
    price: number
    type?: string
}

export interface SaveInvoiceInput {
    orderId: string
    invoiceNumber: string
    invoiceDate: string
    fullName: string
    phone: string
    address: string
    city: string
    email?: string | null
    paymentMethod: string
    isPaid: boolean
    paidAmount: number
    remainingAmount: number
    shippingFees: number
    discount: number
    total: number
    invoiceNotes?: string | null
    items?: InvoiceItemData[]
}

/**
 * Sauvegarder les données de facturation d'une commande
 */
export async function saveOrderInvoice(input: SaveInvoiceInput) {
    try {
        await verifyAdmin()

        const order = await prisma.order.findUnique({
            where: { id: input.orderId },
            include: { items: true }
        })

        if (!order) {
            return { success: false, error: 'Commande introuvable' }
        }

        const paidAmount = Number(input.paidAmount) || 0
        const total = Number(input.total) || 0
        const remainingAmount = input.remainingAmount !== undefined && input.remainingAmount !== null
            ? Number(input.remainingAmount)
            : Math.max(0, total - paidAmount)
        const isPaid = remainingAmount <= 0 || Boolean(input.isPaid)

        // 1. Mettre à jour la commande
        await prisma.order.update({
            where: { id: input.orderId },
            data: {
                invoiceNumber: input.invoiceNumber.trim(),
                invoiceDate: input.invoiceDate ? new Date(input.invoiceDate) : new Date(),
                invoiceNotes: input.invoiceNotes || null,
                fullName: input.fullName.trim(),
                phone: input.phone.trim(),
                address: input.address.trim(),
                city: input.city.trim(),
                email: input.email ? input.email.trim() : order.email,
                paymentMethod: input.paymentMethod,
                isPaid: isPaid,
                paidAmount: paidAmount,
                remainingAmount: remainingAmount,
                shippingFees: Number(input.shippingFees) || 0,
                discount: Number(input.discount) || 0,
                total: total,
                updatedAt: new Date()
            }
        })

        // 2. Si des items sont fournis et correspondent aux OrderItem existants, mettre à jour prix/quantités
        if (input.items && input.items.length > 0) {
            for (const item of input.items) {
                if (item.id && item.id.length > 10) {
                    await prisma.orderItem.updateMany({
                        where: { id: item.id, orderId: input.orderId },
                        data: {
                            quantity: Number(item.quantity) || 1,
                            price: Number(item.price) || 0
                        }
                    })
                }
            }
        }

        revalidatePath('/admin/orders')
        revalidatePath(`/admin/orders/${input.orderId}`)

        return {
            success: true,
            message: 'Facture et informations de paiement enregistrées avec succès',
            data: {
                invoiceNumber: input.invoiceNumber,
                paidAmount,
                remainingAmount,
                isPaid
            }
        }
    } catch (error: any) {
        console.error('Erreur saveOrderInvoice:', error)
        return {
            success: false,
            error: error.message || 'Impossible d\'enregistrer la facture'
        }
    }
}
