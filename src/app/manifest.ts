import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'PetsUnivers ? Animalerie au Maroc',
        short_name: 'PetsUnivers',
        description: 'Alimentation, accessoires et soins pour chats, chiens et petits animaux.',
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
                src: '/petsunivers-icon.svg',
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
