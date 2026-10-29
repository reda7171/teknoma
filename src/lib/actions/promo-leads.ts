'use server'

import { prisma } from '@/lib/prisma'
import { verifyAdmin } from './auth'
import { revalidatePath } from 'next/cache'
import { sendWhatsAppMessageDirect } from './whatsapp-gateway'

export interface SubmitPromoLeadInput {
    phone?: string
    email?: string
    source?: string
}

export async function submitPromoLead(data: SubmitPromoLeadInput) {
    try {
        const phone = data.phone?.trim() || null
        const email = data.email?.trim()?.toLowerCase() || null

        if (!phone && !email) {
            return { success: false, error: 'Veuillez saisir un numéro de téléphone ou un email' }
        }

        // Validation format de téléphone simple (Maroc ou international)
        if (phone && phone.replace(/[^0-9]/g, '').length < 8) {
            return { success: false, error: 'Numéro de téléphone invalide' }
        }

        // Validation email simple si fourni
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return { success: false, error: 'Adresse email invalide' }
        }

        const source = data.source || 'cart_popup'
        const promoCode = 'PETSUNIVERS10'

        // Vérifier si ce numéro ou cet email existe déjà
        let existing = null
        if (phone) {
            existing = await prisma.promoLead.findFirst({ where: { phone } })
        }
        if (!existing && email) {
            existing = await prisma.promoLead.findFirst({ where: { email } })
        }

        if (existing) {
            // Mise à jour de la date et email/phone si nouveau
            await prisma.promoLead.update({
                where: { id: existing.id },
                data: {
                    phone: phone || existing.phone,
                    email: email || existing.email,
                    source: existing.source || source,
                    updatedAt: new Date()
                }
            })
        } else {
            // Création d'un nouveau lead
            await prisma.promoLead.create({
                data: {
                    phone,
                    email,
                    promoCode,
                    source
                }
            })
        }

        // S'assurer que le coupon PETSUNIVERS10 existe et est actif
        const coupon = await prisma.coupon.findUnique({ where: { code: promoCode } })
        if (!coupon) {
            await prisma.coupon.create({
                data: {
                    code: promoCode,
                    discount: 10,
                    type: 'PERCENTAGE',
                    isActive: true,
                }
            })
        }

        // Envoi automatique WhatsApp si activé et numéro présent
        if (phone) {
            void (async () => {
                try {
                    const autoSetting = await prisma.siteSettings.findUnique({
                        where: { key: 'whatsapp_auto_promo_lead' }
                    }).catch(() => null)

                    if (autoSetting?.value !== 'false') {
                        const templateSetting = await prisma.siteSettings.findUnique({
                            where: { key: 'whatsapp_template_promo_lead' }
                        }).catch(() => null)

                        const template = templateSetting?.value ||
                            "Salam ! Merci pour votre intérêt pour nos livres sur PetsUnivers.\nVoici votre code promo de -{discount}% immédiat : *{promoCode}*.\nUtilisez-le dès maintenant pour finaliser votre commande : {siteUrl}/fr/cart"

                        const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://petsunivers.ma'
                        const message = template
                            .replaceAll('{promoCode}', promoCode)
                            .replaceAll('{discount}', '10')
                            .replaceAll('{siteUrl}', siteUrl)

                        await sendWhatsAppMessageDirect(phone, message, {
                            type: 'PROMO_LEAD',
                            metadata: { promoCode, source: 'cart_popup' }
                        }).catch(() => null)
                    }
                } catch {
                    // Silently ignore to avoid impacting customer UX
                }
            })()
        }

        return {
            success: true,
            promoCode,
            discount: 10,
            discountType: 'PERCENTAGE'
        }
    } catch (error) {
        console.error('[PROMO_LEAD_SUBMIT_ERROR]', error)
        return { success: false, error: 'Une erreur est survenue lors de l\'enregistrement' }
    }
}

export async function getPromoLeads(params?: {
    search?: string
    contacted?: string
    page?: number
    limit?: number
}) {
    await verifyAdmin()

    try {
        const page = Math.max(1, params?.page || 1)
        const limit = Math.min(100, Math.max(10, params?.limit || 20))
        const skip = (page - 1) * limit
        const search = params?.search?.trim()

        const where: any = {}

        if (search) {
            where.OR = [
                { phone: { contains: search } },
                { email: { contains: search } },
                { notes: { contains: search } },
            ]
        }

        if (params?.contacted === 'true') {
            where.contacted = true
        } else if (params?.contacted === 'false') {
            where.contacted = false
        }

        const [leads, totalCount] = await Promise.all([
            prisma.promoLead.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            prisma.promoLead.count({ where }),
        ])

        // Stats globales
        const now = new Date()
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - 7)

        const [totalAll, todayCount, weekCount, withPhoneCount] = await Promise.all([
            prisma.promoLead.count(),
            prisma.promoLead.count({ where: { createdAt: { gte: startOfToday } } }),
            prisma.promoLead.count({ where: { createdAt: { gte: startOfWeek } } }),
            prisma.promoLead.count({ where: { phone: { not: null } } }),
        ])

        return {
            success: true,
            leads,
            totalCount,
            page,
            totalPages: Math.ceil(totalCount / limit),
            stats: {
                totalAll,
                todayCount,
                weekCount,
                withPhoneCount,
            }
        }
    } catch (error) {
        console.error('[PROMO_LEADS_GET_ERROR]', error)
        return { success: false, error: 'Impossible de récupérer les leads promotionnels' }
    }
}

export async function togglePromoLeadContacted(id: string, contacted: boolean) {
    await verifyAdmin()

    try {
        await prisma.promoLead.update({
            where: { id },
            data: { contacted }
        })
        revalidatePath('/[locale]/admin/promo-leads', 'page')
        return { success: true }
    } catch (error) {
        console.error('[PROMO_LEAD_TOGGLE_ERROR]', error)
        return { success: false, error: 'Erreur lors de la mise à jour' }
    }
}

export async function updatePromoLeadNotes(id: string, notes: string) {
    await verifyAdmin()

    try {
        await prisma.promoLead.update({
            where: { id },
            data: { notes: notes.trim() || null }
        })
        revalidatePath('/[locale]/admin/promo-leads', 'page')
        return { success: true }
    } catch (error) {
        console.error('[PROMO_LEAD_NOTES_ERROR]', error)
        return { success: false, error: 'Erreur lors de la mise à jour des notes' }
    }
}

export async function deletePromoLead(id: string) {
    await verifyAdmin()

    try {
        await prisma.promoLead.delete({ where: { id } })
        revalidatePath('/[locale]/admin/promo-leads', 'page')
        return { success: true }
    } catch (error) {
        console.error('[PROMO_LEAD_DELETE_ERROR]', error)
        return { success: false, error: 'Erreur lors de la suppression' }
    }
}
