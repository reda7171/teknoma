'use server'

import { verifyAdmin } from '@/lib/actions/auth'
import { withyouService } from '@/lib/delivery/withyou'

export async function testWithYouConnection() {
    try {
        await verifyAdmin()
        // Try to fetch cities as a lightweight test
        const cities = await withyouService.getCities()
        if (cities && cities.length > 0) {
            return { success: true, message: `Connexion réussie ! API fonctionnelle (${cities.length} villes récupérées).` }
        }
        return { success: true, message: "Connexion réussie, mais aucune ville n'a été retournée." }
    } catch (error: any) {
        return { success: false, message: error.message || "Erreur de connexion" }
    }
}
