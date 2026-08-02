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

