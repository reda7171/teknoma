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
