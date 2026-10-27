'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function getEmailTemplates() {
    try {
        const templates = await prisma.emailTemplate.findMany({
            orderBy: { createdAt: 'desc' }
        })
        return { success: true, data: templates }
    } catch (error) {
        console.error('Erreur lors de la récupération des templates d\'emails:', error)
        return { success: false, error: 'Impossible de récupérer les templates' }
    }
}

export async function getEmailTemplate(id: string) {
    try {
        const template = await prisma.emailTemplate.findUnique({
            where: { id }
        })
        if (!template) {
            return { success: false, error: 'Template introuvable' }
        }
        return { success: true, data: template }
    } catch (error) {
        console.error('Erreur lors de la récupération du template d\'email:', error)
        return { success: false, error: 'Impossible de récupérer le template' }
    }
}

export async function createEmailTemplate(data: { name: string; subject: string; body: string; description?: string }) {
    try {
        const existing = await prisma.emailTemplate.findUnique({
            where: { name: data.name }
        })

        if (existing) {
            return { success: false, error: 'Un template avec ce nom existe déjà' }
        }

        const template = await prisma.emailTemplate.create({
            data: {
                name: data.name,
                subject: data.subject,
                body: data.body,
                description: data.description,
            }
        })
        revalidatePath('/[locale]/admin/settings')
        return { success: true, data: template }
    } catch (error) {
        console.error('Erreur lors de la création du template:', error)
        return { success: false, error: 'Impossible de créer le template' }
    }
}

export async function updateEmailTemplate(id: string, data: { name: string; subject: string; body: string; description?: string }) {
    try {
        const existing = await prisma.emailTemplate.findUnique({
            where: { name: data.name }
        })

        if (existing && existing.id !== id) {
            return { success: false, error: 'Un autre template utilise déjà ce nom' }
        }

        const template = await prisma.emailTemplate.update({
            where: { id },
            data: {
                name: data.name,
                subject: data.subject,
                body: data.body,
                description: data.description,
            }
        })
        revalidatePath('/[locale]/admin/settings')
        return { success: true, data: template }
    } catch (error) {
        console.error('Erreur lors de la mise à jour du template:', error)
        return { success: false, error: 'Impossible de mettre à jour le template' }
    }
}

export async function deleteEmailTemplate(id: string) {
    try {
        await prisma.emailTemplate.delete({
            where: { id }
        })
        revalidatePath('/[locale]/admin/settings')
        return { success: true }
    } catch (error) {
        console.error('Erreur lors de la suppression du template:', error)
        return { success: false, error: 'Impossible de supprimer le template' }
    }
}

export interface AutomatedEmailRule {
    key: string
    label: string
    description: string
    defaultTemplateName: string
    templateId: string
    active: boolean
}

export async function getAutomatedEmailRules(): Promise<AutomatedEmailRule[]> {
    const rulesConfig = [
        {
            key: 'order_created',
            label: 'Confirmation de Commande',
            description: 'Envoyé au client immédiatement après la validation de son panier.',
            defaultTemplateName: 'CONFIRMATION_COMMANDE'
        },
        {
            key: 'order_shipped',
            label: 'Commande Expédiée',
            description: 'Envoyé lorsque le statut passe à Expédiée avec lien de suivi.',
            defaultTemplateName: 'COMMANDE_EXPEDIEE'
        },
        {
            key: 'order_delivered',
            label: 'Commande Livrée / Avis Client',
            description: 'Envoyé dès la réception de la commande pour remercier et inviter à noter.',
            defaultTemplateName: 'Bienvenue sur Riwaya'
        },
        {
            key: 'abandoned_cart',
            label: 'Relance Panier Abandonné',
            description: 'Envoyé automatiquement par le cron nocturne/périodique aux paniers en attente.',
            defaultTemplateName: 'Panier Abandonné'
        },
        {
            key: 'coupon_gift',
            label: 'Attribution de Code Promo',
            description: 'Envoyé avec un code coupon promotionnel personnalisé.',
            defaultTemplateName: 'CODE_COUPON'
        }
    ]

    const templates = await prisma.emailTemplate.findMany({ select: { id: true, name: true } })
    const templateNameMap = new Map(templates.map(t => [t.name, t.id]))

    const settings = await prisma.siteSettings.findMany({
        where: {
            key: {
                in: rulesConfig.flatMap(r => [
                    `auto_email_${r.key}`,
                    `auto_email_${r.key}_active`
                ])
            }
        }
    })
    const settingsMap = new Map(settings.map(s => [s.key, s.value]))

    return rulesConfig.map(r => {
        const configuredId = settingsMap.get(`auto_email_${r.key}`)
        const activeStr = settingsMap.get(`auto_email_${r.key}_active`)
        const defaultId = templateNameMap.get(r.defaultTemplateName) || ''
        
        return {
            key: r.key,
            label: r.label,
            description: r.description,
            defaultTemplateName: r.defaultTemplateName,
            templateId: configuredId || defaultId,
            active: activeStr !== undefined ? activeStr === 'true' : true
        }
    })
}

export async function saveAutomatedEmailRules(rules: Array<{ key: string; templateId: string; active: boolean }>) {
    try {
        await prisma.$transaction(
            rules.flatMap(r => [
                prisma.siteSettings.upsert({
                    where: { key: `auto_email_${r.key}` },
                    update: { value: r.templateId },
                    create: { key: `auto_email_${r.key}`, value: r.templateId, category: 'email', description: `Template auto pour ${r.key}` }
                }),
                prisma.siteSettings.upsert({
                    where: { key: `auto_email_${r.key}_active` },
                    update: { value: String(r.active) },
                    create: { key: `auto_email_${r.key}_active`, value: String(r.active), category: 'email', description: `Actif pour ${r.key}` }
                })
            ])
        )
        revalidatePath('/[locale]/admin/settings')
        return { success: true }
    } catch (err: any) {
        return { success: false, error: err?.message || 'Erreur lors de la sauvegarde des règles' }
    }
}

export async function sendTestEmailTemplate(templateId: string, recipientEmail: string) {
    try {
        if (!recipientEmail || !recipientEmail.includes('@')) {
            return { success: false, error: 'Adresse email invalide' }
        }

        const template = await prisma.emailTemplate.findFirst({
            where: {
                OR: [
                    { id: templateId },
                    { name: templateId }
                ]
            }
        })

        if (!template) {
            return { success: false, error: 'Template introuvable' }
        }

        const sampleVariables: Record<string, string> = {
            client_nom: 'Mohammed Alami',
            customer_name: 'Mohammed Alami',
            order_id: 'RW-78901',
            total: '185',
            adresse: '15 Boulevard Hassan II',
            ville: 'Casablanca',
            telephone: '0612345678',
            coupon_code: 'RIWAYA10',
            tracking_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.riwaya.store'}/track/RW-78901`,
            articles: '<ul style="margin:0;padding-left:20px;"><li>1x أرض زيكولا (85 درهم)</li><li>1x فن اللامبالاة (100 درهم)</li></ul>'
        }

        let subject = template.subject
        let body = template.body

        for (const [key, value] of Object.entries(sampleVariables)) {
            const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi')
            subject = subject.replace(regex, value)
            body = body.replace(regex, value)
        }

        const { transporter } = await import('@/lib/email')
        await transporter.sendMail({
            from: '"Riwaya" <contact@riwaya.store>',
            to: recipientEmail,
            subject: `[TEST] ${subject}`,
            html: body
        })

        return { success: true }
    } catch (err: any) {
        return { success: false, error: err?.message || 'Erreur lors de l\'envoi du test' }
    }
}

export async function sendTriggerEmail(triggerKey: string, recipientEmail?: string | null, data: Record<string, any> = {}) {
    try {
        if (!recipientEmail || !recipientEmail.includes('@')) return { success: false, error: 'Email manquant' }

        const activeSetting = await prisma.siteSettings.findUnique({
            where: { key: `auto_email_${triggerKey}_active` }
        })
        if (activeSetting && activeSetting.value === 'false') {
            return { success: false, message: 'Automatisation désactivée pour ce déclencheur' }
        }

        const templateSetting = await prisma.siteSettings.findUnique({
            where: { key: `auto_email_${triggerKey}` }
        })

        let template: any = null
        if (templateSetting?.value) {
            template = await prisma.emailTemplate.findFirst({
                where: {
                    OR: [
                        { id: templateSetting.value },
                        { name: templateSetting.value }
                    ]
                }
            })
        }

        if (!template) {
            const fallbackNames: Record<string, string> = {
                order_created: 'CONFIRMATION_COMMANDE',
                order_shipped: 'COMMANDE_EXPEDIEE',
                order_delivered: 'Bienvenue sur Riwaya',
                abandoned_cart: 'Panier Abandonné',
                coupon_gift: 'CODE_COUPON'
            }
            const fallbackName = fallbackNames[triggerKey]
            if (fallbackName) {
                template = await prisma.emailTemplate.findUnique({ where: { name: fallbackName } })
            }
        }

        if (!template) {
            return { success: false, error: 'Aucun template associé à ce déclencheur' }
        }

        let resolvedClientNom = data.client_nom || data.customer_name || data.nom || data.name
        if (!resolvedClientNom && recipientEmail) {
            const customer = await prisma.customer.findFirst({ where: { email: recipientEmail }, select: { fullName: true } })
            const order = !customer ? await prisma.order.findFirst({ where: { email: recipientEmail }, select: { fullName: true }, orderBy: { createdAt: 'desc' } }) : null
            resolvedClientNom = customer?.fullName || order?.fullName || 'Cher lecteur'
        }
        if (!resolvedClientNom) resolvedClientNom = 'Cher lecteur'

        let resolvedCouponCode = data.coupon_code || data.code_promo || data.coupon
        if (!resolvedCouponCode) {
            const activeCoupon = await prisma.coupon.findFirst({
                where: { isActive: true },
                orderBy: { createdAt: 'desc' },
                select: { code: true }
            })
            resolvedCouponCode = activeCoupon?.code || 'RIWAYA10'
        }

        data.client_nom = resolvedClientNom
        data.customer_name = resolvedClientNom
        data.coupon_code = resolvedCouponCode

        let subject = template.subject
        let body = template.body

        for (const [key, value] of Object.entries(data)) {
            const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi')
            subject = subject.replace(regex, String(value || ''))
            body = body.replace(regex, String(value || ''))
        }

        subject = subject
            .replace(/{{\s*(?:client_nom|customer_name|nom|name|client)\s*}}/gi, String(resolvedClientNom))
            .replace(/{{\s*(?:coupon_code|coupon|code_coupon|code_promo|promo_code)\s*}}/gi, String(resolvedCouponCode))
        body = body
            .replace(/{{\s*(?:client_nom|customer_name|nom|name|client)\s*}}/gi, String(resolvedClientNom))
            .replace(/{{\s*(?:coupon_code|coupon|code_coupon|code_promo|promo_code)\s*}}/gi, String(resolvedCouponCode))

        const { transporter } = await import('@/lib/email')
        await transporter.sendMail({
            from: '"Riwaya" <contact@riwaya.store>',
            to: recipientEmail,
            subject,
            html: body
        })

        return { success: true }
    } catch (err: any) {
        console.error(`[AutoEmail] Erreur envoi déclencheur ${triggerKey}:`, err)
        return { success: false, error: err?.message }
    }
}
