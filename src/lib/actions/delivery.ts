'use server'

import { withyouService } from '@/lib/delivery/withyou'

/**
 * Récupère la liste des villes disponibles via l'API WithYou
 */
export async function getWithYouCities() {
    try {
        const cities = await withyouService.getCities()
        return cities
    } catch (error) {
        console.error('Failed to fetch cities from WithYou:', error)
        return []
    }
}

/**
 * Récupère le tarif de livraison pour une ville donnée depuis la table city_delivery
 */
export async function getCityDeliveryFee(cityName: string): Promise<number> {
    if (!cityName) return 30

    try {
        const { prisma } = await import('@/lib/prisma')
        const normalized = cityName.trim()

        const match = await (prisma as any).cityDelivery.findFirst({
            where: {
                city: normalized,
                active: true
            }
        })

        if (match && typeof match.price === 'number') {
            return match.price
        }

        const allCities = await (prisma as any).cityDelivery.findMany({
            where: { active: true },
            select: { city: true, price: true }
        })

        const cleanInput = normalized.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        const found = allCities.find((c: any) => {
            const cleanCity = c.city.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            return cleanCity === cleanInput || cleanCity.includes(cleanInput) || cleanInput.includes(cleanCity)
        })

        if (found) {
            return found.price
        }
    } catch (e) {
        console.error('Error fetching city delivery fee:', e)
    }

    return 30
}

/**
 * Récupère toutes les villes et leurs tarifs de livraison
 */
export async function getAllCityDeliveryFees(): Promise<{ city: string; price: number }[]> {
    try {
        const { prisma } = await import('@/lib/prisma')
        const cities = await (prisma as any).cityDelivery.findMany({
            where: { active: true },
            orderBy: { city: 'asc' },
            select: { city: true, price: true }
        })
        return cities
    } catch {
        return []
    }
}
