'use server'

import { prisma } from '@/lib/prisma'
import { verifyAdmin } from './auth'
import { revalidatePath, revalidateTag } from 'next/cache'
import { getCached } from '@/lib/cache'

function invalidateSettingsCache(keys: string[]) {
    revalidateTag('setting', { expire: 0 })
    revalidateTag('settings', { expire: 0 })
    revalidateTag('homepage-public-data', { expire: 0 })
    for (const key of keys) {
        revalidateTag(`setting:${key}`, { expire: 0 })
    }
}

// Récupérer tous les paramètres
export async function getAllSettings() {
    return getCached(
        'settings:all',
        async () => {
            try {
                const settings = await prisma.siteSettings.findMany({
                    orderBy: [
                        { category: 'asc' },
                        { key: 'asc' }
                    ]
                })

                // Convertir en objet clé-valeur pour faciliter l'utilisation
                const settingsMap: Record<string, string> = {}
                settings.forEach(setting => {
                    settingsMap[setting.key] = setting.value || ''
                })

                return settingsMap
            } catch (error) {
                console.error('Error fetching settings:', error)
                return {}
            }
        },
        300
    )
}

// Récupérer un paramètre spécifique
export async function getSetting(key: string, defaultValue: string | null = null) {
    return getCached(
        `setting:${key}`,
        async () => {
            try {
                const setting = await prisma.siteSettings.findUnique({
                    where: { key }
                })
                return setting?.value ?? defaultValue
            } catch (error) {
                console.error(`Error fetching setting ${key}:`, error)
                return defaultValue
            }
        },
        300
    )
}

// Mettre à jour ou créer un paramètre
export async function updateSetting(key: string, value: string, category: string = 'general', description?: string) {
    try {
        await verifyAdmin()

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
        await verifyAdmin()

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
        await verifyAdmin()

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
    return getCached(
        `settings:category:${category}`,
        async () => {
            try {
                const settings = await prisma.siteSettings.findMany({
                    where: { category },
                    orderBy: { key: 'asc' }
                })

                const settingsMap: Record<string, string> = {}
                settings.forEach(setting => {
                    settingsMap[setting.key] = setting.value || ''
                })

                return settingsMap
            } catch (error) {
                console.error(`Error fetching settings for category ${category}:`, error)
                return {}
            }
        },
        300
    )
}

// Vérifie si une fonctionnalité est activée (défaut: true si pas défini)
export async function isFeatureEnabled(featureKey: string, defaultValue: boolean = true): Promise<boolean> {
    const value = await getSetting(featureKey)
    // Si non défini → utiliser la valeur par défaut
    if (value === null) return defaultValue
    return value === 'true'
}

export interface GoogleReviewEmailItem {
    email: string
    used: boolean
    source?: string
}

/**
 * Ajoute automatiquement l'email d'un lecteur Gmail à la liste des avis Google
 */
export async function addGmailReaderToGoogleReviews(email: string) {
    if (!email || !email.includes('@')) return
    const cleanEmail = email.toLowerCase().trim()
    if (!cleanEmail.endsWith('@gmail.com') && !cleanEmail.endsWith('@googlemail.com')) return

    try {
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

        const alreadyExists = currentList.some(item => item.email.toLowerCase().trim() === cleanEmail)
        if (!alreadyExists) {
            currentList.push({ email: cleanEmail, used: false, source: 'gmail_login' })
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
        }
    } catch (err) {
        console.error('Erreur addGmailReaderToGoogleReviews:', err)
    }
}

/**
 * Synchronise et importe tous les lecteurs inscrits avec un compte Gmail
 */
export async function syncGmailReadersToGoogleReviews() {
    try {
        await verifyAdmin()

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
