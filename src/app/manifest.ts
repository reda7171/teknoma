import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Tekno Store — High-Tech, Smartphones, PC & Mac au Maroc',
        short_name: 'Tekno Store',
        description: 'Vente de smartphones, PC portables, Mac et accessoires technologiques au Maroc avec paiement à la livraison.',
        start_url: '/',
        display: 'standalone',
        background_color: '#f7f0df',
        theme_color: '#17351d',
        orientation: 'portrait-primary',
        categories: ['shopping', 'lifestyle'],
        lang: 'fr-MA',
        dir: 'auto',
        icons: [
            {
                src: '/logo.png',
                sizes: 'any',
                type: 'image/svg+xml',
            },
            {
                src: '/icon-192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'maskable',
            },
            {
                src: '/icon-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
            },
        ],
    }
}
