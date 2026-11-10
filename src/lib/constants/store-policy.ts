/**
 * Source de vérité unique pour les conditions commerciales et politiques Riwaya.
 * Évite toute divergence entre le tunnel de commande (panier/checkout),
 * les pages informatives (livraison, retours, FAQ, à propos) et les schémas JSON-LD / flux XML.
 */
export const STORE_POLICY = {
    currency: 'MAD',
    shippingFeeMorocco: 30,
    freeShippingThreshold: 500,
    shippingFeeWorldwide: 200,
    deliveryMajorCitiesMinHours: 24,
    deliveryMajorCitiesMaxHours: 48,
    deliveryOtherRegionsHours: '48-72h',
    returnWindowDays: 3,
    contactEmail: 'contact@riwaya.store',
    copyrightEmail: 'contact@riwaya.store',
    defaultWhatsappNumber: '212702220575',
    supportHours: {
        fr: 'Lun - Sam : 09h - 19h',
        en: 'Mon - Sat : 09am - 7pm',
        ar: 'الإثنين - السبت : 09:00 - 19:00',
    },
} as const

