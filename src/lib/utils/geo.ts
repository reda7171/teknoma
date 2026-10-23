export const MOROCCO_CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
    'casablanca': { lat: 33.5731, lng: -7.5898 },
    'rabat': { lat: 34.0209, lng: -6.8416 },
    'salé': { lat: 34.0389, lng: -6.8166 },
    'sale': { lat: 34.0389, lng: -6.8166 },
    'marrakech': { lat: 31.6295, lng: -7.9811 },
    'fès': { lat: 34.0331, lng: -5.0003 },
    'fes': { lat: 34.0331, lng: -5.0003 },
    'tanger': { lat: 35.7595, lng: -5.8340 },
    'agadir': { lat: 30.4202, lng: -9.5982 },
    'oujda': { lat: 34.6814, lng: -1.9086 },
    'meknès': { lat: 33.8935, lng: -5.5496 },
    'meknes': { lat: 33.8935, lng: -5.5496 },
    'kénitra': { lat: 34.2541, lng: -6.5890 },
    'kenitra': { lat: 34.2541, lng: -6.5890 },
    'tétouan': { lat: 35.5785, lng: -5.3684 },
    'tetouan': { lat: 35.5785, lng: -5.3684 },
    'safi': { lat: 32.2994, lng: -9.2372 },
    'el jadida': { lat: 33.2316, lng: -8.5007 },
    'béni mellal': { lat: 32.3373, lng: -6.3498 },
    'beni mellal': { lat: 32.3373, lng: -6.3498 },
    'nador': { lat: 35.1667, lng: -2.9333 },
    'mohammédia': { lat: 33.6822, lng: -7.3881 },
    'mohammedia': { lat: 33.6822, lng: -7.3881 },
    'témara': { lat: 33.9267, lng: -6.9122 },
    'temara': { lat: 33.9267, lng: -6.9122 },
    'settat': { lat: 33.0014, lng: -7.6166 },
    'berrechid': { lat: 33.2655, lng: -7.5875 },
    'khémisset': { lat: 33.8240, lng: -6.0663 },
    'khemisset': { lat: 33.8240, lng: -6.0663 },
    'khouribga': { lat: 32.8811, lng: -6.9063 },
    'dakhla': { lat: 23.7136, lng: -15.9355 },
    'laâyoune': { lat: 27.1536, lng: -13.2033 },
    'laayoune': { lat: 27.1536, lng: -13.2033 },
    'al hoceïma': { lat: 35.2472, lng: -3.9322 },
    'al hoceima': { lat: 35.2472, lng: -3.9322 },
    'essaouira': { lat: 31.5085, lng: -9.7595 },
    'chefchaouen': { lat: 35.1688, lng: -5.2636 },
    'taza': { lat: 34.2256, lng: -4.0108 },
    'taroudant': { lat: 30.4703, lng: -8.8770 },
    'ouarzazate': { lat: 30.9189, lng: -6.8934 },
    'larache': { lat: 35.1932, lng: -6.1557 },
    'guelmim': { lat: 28.9869, lng: -10.0574 }
}

/**
 * Calcule la distance en kilomètres entre 2 coordonnées GPS via la formule de Haversine
 */
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371 // Rayon moyen de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return Math.round(R * c * 10) / 10
}

/**
 * Récupère les coordonnées d'un livre d'échange (GPS précis ou barycentre de la ville)
 */
export function getBookCoordinates(book: {
    latitude?: number | null
    longitude?: number | null
    owner?: { city?: string | null } | null
}): { lat: number; lng: number } | null {
    if (typeof book.latitude === 'number' && typeof book.longitude === 'number' && !isNaN(book.latitude) && !isNaN(book.longitude)) {
        return { lat: book.latitude, lng: book.longitude }
    }

    const rawCity = book.owner?.city
    if (!rawCity) return null

    const cityNorm = rawCity.toLowerCase().trim()
    if (MOROCCO_CITY_COORDINATES[cityNorm]) {
        return MOROCCO_CITY_COORDINATES[cityNorm]
    }

    for (const [key, coords] of Object.entries(MOROCCO_CITY_COORDINATES)) {
        if (cityNorm.includes(key) || key.includes(cityNorm)) {
            return coords
        }
    }

    return null
}
