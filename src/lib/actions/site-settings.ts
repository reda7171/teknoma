'use server'

import * as internal from '@/lib/server/site-settings'
import { invalidateSettingsCache } from '@/lib/server/site-settings'
import { requireRole } from '@/lib/require-role'

import { prisma } from '@/lib/prisma'
import { verifyAdmin } from './auth'
import { revalidatePath, revalidateTag } from 'next/cache'
import { getCached } from '@/lib/cache'



// Récupérer tous les paramètres
export async function getAllSettings() { await requireRole(['ADMIN']); return internal.getAllSettings() }

// Récupérer un paramètre spécifique
export async function getSetting(key: string, defaultValue: string | null = null) { await requireRole(['ADMIN']); return internal.getSetting(key, defaultValue) }

// Mettre à jour ou créer un paramètre
export async function updateSetting(key: string, value: string, category: string = 'general', description?: string) {
    try {
        await requireRole(['ADMIN'])

        const setting = await prisma.siteSettings.upsert({
            where: { key },
            update: { value, category, description },
            create: { key, value, category, description }
        })

        invalidateSettingsCache([key])
        revalidatePath('/admin/settings')
        revalidatePath('/')

        return { success: true, setting }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

// Mettre à jour plusieurs paramètres en une fois
export async function updateMultipleSettings(settings: { key: string; value: string; category?: string; description?: string }[]) {
    try {
        await requireRole(['ADMIN'])

        await prisma.$transaction(
            settings.map(({ key, value, category = 'general', description }) =>
                prisma.siteSettings.upsert({
                    where: { key },
                    update: { value, category, description },
                    create: { key, value, category, description }
                })
            )
        )

        invalidateSettingsCache(settings.map(({ key }) => key))
        revalidatePath('/admin/settings')
        revalidatePath('/')

        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

// Supprimer un paramètre
export async function deleteSetting(key: string) {
    try {
        await requireRole(['ADMIN'])

        await prisma.siteSettings.delete({
            where: { key }
        })

        invalidateSettingsCache([key])
        revalidatePath('/admin/settings')

        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

// Récupérer les paramètres par catégorie
export async function getSettingsByCategory(category: string) {
    if (category === 'features') {
        const values = await internal.getSettingsByCategory(category)
        return Object.fromEntries(Object.entries(values).filter(([key]) => /^feature_[a-z0-9_]+$/.test(key)))
    }
    await requireRole(['ADMIN']); return internal.getSettingsByCategory(category)
}

// Vérifie si une fonctionnalité est activée (défaut: true si pas défini)
export async function isFeatureEnabled(featureKey: string, defaultValue = true) {
    if (!/^feature_[a-z0-9_]+$/.test(featureKey)) throw new Error('Acc�s interdit')
    return internal.isFeatureEnabled(featureKey, defaultValue)
}

export interface GoogleReviewEmailItem {
    email: string
    used: boolean
    source?: string
}

/**
 * Ajoute automatiquement l'email d'un lecteur Gmail à la liste des avis Google
 */


/**
 * Synchronise et importe tous les lecteurs inscrits avec un compte Gmail
 */
export async function syncGmailReadersToGoogleReviews() {
    try {
        await requireRole(['ADMIN'])

        // 1. Récupérer tous les lecteurs ayant un email Gmail
        const gmailUsers = await prisma.user.findMany({
            where: {
                OR: [
                    { email: { endsWith: '@gmail.com' } },
                    { email: { endsWith: '@googlemail.com' } }
                ]
            },
            select: { email: true }
        })

        // 2. Récupérer la liste actuelle
        const setting = await prisma.siteSettings.findUnique({
            where: { key: 'google_reviews_emails' }
        })

        let currentList: GoogleReviewEmailItem[] = []
        if (setting?.value) {
            try {
                currentList = JSON.parse(setting.value)
            } catch {
                currentList = []
            }
        }

        const existingEmails = new Set(currentList.map(item => item.email.toLowerCase().trim()))

        let addedCount = 0
        for (const user of gmailUsers) {
            const clean = user.email.toLowerCase().trim()
            if (clean && !existingEmails.has(clean)) {
                currentList.push({ email: clean, used: false, source: 'community_reader' })
                existingEmails.add(clean)
                addedCount++
            }
        }

        if (addedCount > 0) {
            await prisma.siteSettings.upsert({
                where: { key: 'google_reviews_emails' },
                update: { value: JSON.stringify(currentList) },
                create: {
                    key: 'google_reviews_emails',
                    value: JSON.stringify(currentList),
                    category: 'general',
                    description: 'Liste des emails utilisés pour Google Customer Reviews'
                }
            })

            invalidateSettingsCache(['google_reviews_emails'])
            revalidatePath('/admin/settings')
        }

        return {
            success: true,
            addedCount,
            totalCount: currentList.length,
            availableCount: currentList.filter(e => !e.used).length,
            emails: currentList
        }
    } catch (error: any) {
        console.error('Erreur lors de la synchronisation des emails Gmail:', error)
        return { success: false, error: error.message || 'Erreur de synchronisation' }
    }
}
