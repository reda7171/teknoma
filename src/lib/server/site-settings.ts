import 'server-only'
import { prisma } from '@/lib/prisma'
import { getCached } from '@/lib/cache'
import { revalidateTag } from 'next/cache'
import type { GoogleReviewEmailItem } from '@/lib/actions/site-settings'

export function invalidateSettingsCache(keys: string[]) {
    revalidateTag('setting', { expire: 0 })
    revalidateTag('settings', { expire: 0 })
    revalidateTag('homepage-public-data', { expire: 0 })
    for (const key of keys) {
        revalidateTag(`setting:${key}`, { expire: 0 })
    }
}

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

export async function isFeatureEnabled(featureKey: string, defaultValue: boolean = true): Promise<boolean> {
    const value = await getSetting(featureKey)
    // Si non défini → utiliser la valeur par défaut
    if (value === null) return defaultValue
    return value === 'true'
}

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
