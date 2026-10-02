'use server'

import { prisma } from '@/lib/prisma'
import { verifyAdmin } from '@/lib/actions/auth'

export interface ReturnReminder {
    id: string
    trackingID: string | null
    createdAt: Date
    daysSinceOrder: number
    fullName: string
    city: string
    phone: string
    total: number
    shippingCompanyId: string | null
    shippingCompanyName: string
    shippingCompanyPhone: string | null
    whatsappLink: string
    whatsappMessage: string
}

/**
 * Récupère les commandes marquées en retour créées depuis plus d'une semaine (7 jours)
 */
export async function getPendingReturnReminders(): Promise<ReturnReminder[]> {
    try {
        await verifyAdmin()
        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

        const [orders, companies] = await Promise.all([
            prisma.order.findMany({
                where: {
                    status: 'RETURNED',
                    createdAt: { lte: oneWeekAgo }
                },
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    trackingID: true,
                    createdAt: true,
                    fullName: true,
                    city: true,
                    phone: true,
                    total: true,
                    shippingCompany: true
                }
            }),
            prisma.shippingCompany.findMany()
        ])

        const companyMap = new Map(companies.map(c => [c.id, c]))

        return orders.map(order => {
            const company = order.shippingCompany ? companyMap.get(order.shippingCompany) : null
            const companyName = company?.name || (order.shippingCompany ? 'Société de livraison' : 'Transporteur')
            const companyPhone = company?.supportPhone?.trim() || null

            const daysSinceOrder = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60 * 24))
            const formattedDate = new Date(order.createdAt).toLocaleDateString('fr-FR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            })

            const trackingText = order.trackingID ? `N° Suivi : ${order.trackingID}` : `Commande #${order.id.slice(0, 8)}`

            const message = `Bonjour ${companyName},\n\nJe vous contacte concernant le colis en retour de notre commande Riwaya :\n- ${trackingText}\n- Client : ${order.fullName} (${order.city})\n- Date commande : ${formattedDate} (il y a ${daysSinceOrder} jours)\n- Montant : ${order.total} DH\n\nCe colis est marqué en retour depuis plus d'une semaine. Pourriez-vous s'il vous plaît nous confirmer où se trouve le colis et quand il nous sera retourné à notre dépôt ?\n\nMerci d'avance pour votre aide,\nL'équipe Riwaya.`

            let waLink = ''
            if (companyPhone) {
                let clean = companyPhone.replace(/\D/g, '')
                if (clean.startsWith('0')) clean = '212' + clean.slice(1)
                else if (!clean.startsWith('212')) clean = '212' + clean
                waLink = `https://wa.me/${clean}?text=${encodeURIComponent(message)}`
            } else {
                waLink = `https://wa.me/?text=${encodeURIComponent(message)}`
            }

            return {
                id: order.id,
                trackingID: order.trackingID,
                createdAt: order.createdAt,
                daysSinceOrder,
                fullName: order.fullName,
                city: order.city,
                phone: order.phone,
                total: order.total,
                shippingCompanyId: company?.id || null,
                shippingCompanyName: companyName,
                shippingCompanyPhone: companyPhone,
                whatsappLink: waLink,
                whatsappMessage: message
            }
        })
    } catch (error: any) {
        if (!error?.message?.includes('Non autorisé')) {
            console.error('Error fetching return reminders:', error)
        }
        return []
    }
}

/**
 * Met à jour le numéro de support WhatsApp de la société de livraison
 */
export async function updateShippingCompanySupportPhone(companyId: string, phone: string) {
    try {
        await verifyAdmin()
        await prisma.shippingCompany.update({
            where: { id: companyId },
            data: { supportPhone: phone }
        })
        return { success: true }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}
